"""API FastAPI du middleware.  Lancer :  uvicorn app.main:app --reload --port 8000"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .clients.corda_client import CordaBridgeClient
from .clients.hedera_client import HederaClientImpl
from .clients.mock import MockCordaClient, MockHederaClient
from .config import Settings
from .core.hashing import hash_record
from .core.storage import OffChainStore
from .modules.pipeline import Pipeline
from .modules.sync_manager import SyncManager
from .services.case_service import CaseService

logging.basicConfig(level=logging.INFO)
settings = Settings()

store = OffChainStore(settings.storage_dir)
sync = SyncManager(settings.sync_db_path)
if settings.use_mocks:
    corda, hedera = MockCordaClient(), MockHederaClient()
else:
    corda = CordaBridgeClient(settings.corda_bridge_url)
    hedera = HederaClientImpl(settings.hedera_topic_id, settings.hedera_account_id,
                              settings.hedera_private_key, settings.mirror_node_url)
pipeline = Pipeline(corda, hedera, sync)
cases = CaseService(store, corda, hedera, sync)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async def loop():
        while True:
            try:
                await asyncio.to_thread(pipeline.poll_once)
            except Exception:
                logging.exception("Erreur dans la boucle du listener")
            await asyncio.sleep(settings.poll_interval_s)

    task = asyncio.create_task(loop())
    yield
    task.cancel()


app = FastAPI(title="Corda-Hedera Medical Proof", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class CreateCaseRequest(BaseModel):
    record: dict[str, Any]
    document_type: str = "MEDICAL_RECORD"


@app.get("/health")
def health():
    return {"status": "ok", "mocks": settings.use_mocks}


@app.post("/cases")
def create_case(req: CreateCaseRequest):
    try:
        return cases.create_case(req.record, req.document_type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.get("/cases/{case_id}/history")
def history(case_id: str):
    return cases.history(case_id)


@app.post("/cases/{case_id}/verify")
def verify(case_id: str):
    return cases.verify(case_id)


@app.post("/pipeline/run")
def run_pipeline():
    """Force un cycle immédiat (utile en démo)."""
    return {"events": pipeline.poll_once()}


# --- Routes de démonstration des scénarios (mode mock uniquement) -----------------
def _require_mocks():
    if not settings.use_mocks:
        raise HTTPException(status_code=404)


@app.post("/demo/tamper-file/{case_id}")
def demo_tamper_file(case_id: str):
    """Scénario 2 : modifie le fichier hors chaîne après enregistrement."""
    _require_mocks()
    doc = store.load(case_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Cas introuvable")
    doc["diagnostic"] = "MODIFIÉ APRÈS COUP"
    store.save(case_id, doc)
    return {"new_hash": hash_record(doc)}


@app.post("/demo/tamper-proof/{case_id}")
def demo_tamper_proof(case_id: str):
    """Scénario 3 : falsifie la preuve Hedera."""
    _require_mocks()
    row = sync.latest_published(case_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Aucune preuve publiée")
    hedera.tamper(row["hedera_sequence"], "f" * 64)
    return {"tampered": True}


@app.post("/demo/hedera-outage")
def demo_hedera_outage(available: bool):
    """Scénario 4 : coupe/rétablit Hedera."""
    _require_mocks()
    hedera.available = available
    return {"hedera_available": available}
