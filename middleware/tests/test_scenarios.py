"""Les 4 scénarios de démonstration, avec les mocks (aucun réseau requis)."""
import tempfile

from app.clients.mock import MockCordaClient, MockHederaClient
from app.core.storage import OffChainStore
from app.modules.pipeline import Pipeline
from app.modules.sync_manager import SyncManager
from app.services.case_service import CaseService

RECORD = {"nom": "Test", "prenom": "Fictif", "diagnostic": "grippe", "analyses": [1, 2, 3]}


def make_env():
    store = OffChainStore(tempfile.mkdtemp())
    corda, hedera, sync = MockCordaClient(), MockHederaClient(), SyncManager(":memory:")
    return store, corda, hedera, sync, Pipeline(corda, hedera, sync), CaseService(store, corda, hedera, sync)


def test_scenario_1_valid():
    store, corda, hedera, sync, pipe, svc = make_env()
    case = svc.create_case(RECORD)
    pipe.poll_once()
    result = svc.verify(case["case_id"])
    assert result["status"] == "VALID"
    assert result["corda_hash"] == result["hedera_hash"] == result["recomputed_hash"]


def test_scenario_2_modified_file():
    store, corda, hedera, sync, pipe, svc = make_env()
    case = svc.create_case(RECORD)
    pipe.poll_once()
    doc = store.load(case["case_id"])
    doc["diagnostic"] = "autre"
    store.save(case["case_id"], doc)
    assert svc.verify(case["case_id"])["status"] == "MODIFIED"


def test_scenario_3_inconsistent_proof():
    store, corda, hedera, sync, pipe, svc = make_env()
    case = svc.create_case(RECORD)
    pipe.poll_once()
    seq = sync.latest_published(case["case_id"])["hedera_sequence"]
    hedera.tamper(seq, "f" * 64)
    assert svc.verify(case["case_id"])["status"] == "INCONSISTENT"


def test_scenario_4_hedera_outage_then_recovery():
    store, corda, hedera, sync, pipe, svc = make_env()
    hedera.available = False
    case = svc.create_case(RECORD)
    pipe.poll_once()
    assert len(sync.pending()) == 1                      # rien perdu, mis en attente
    assert svc.verify(case["case_id"])["status"] == "MISSING"
    hedera.available = True
    pipe.retry_pending()
    assert sync.pending() == []
    assert svc.verify(case["case_id"])["status"] == "VALID"


def test_invalid_event_is_rejected_not_published():
    from app.models import CordaEvent
    store, corda, hedera, sync, pipe, svc = make_env()
    pipe.handle_event(CordaEvent("tx1", "BAD", "nothex", "MEDICAL_RECORD", "CASE_CREATED", "2026-01-01T00:00:00+00:00"))
    assert sync.pending() == []
    assert sync.history("BAD")[0]["status"] == "REJECTED"


def test_duplicate_event_is_idempotent():
    store, corda, hedera, sync, pipe, svc = make_env()
    case = svc.create_case(RECORD)
    ev = corda.fetch_new_events()[0]
    pipe.handle_event(ev)
    pipe.handle_event(ev)
    assert len(sync.history(case["case_id"])) == 1
