"""Cas d'usage appelés par l'API : créer un cas, consulter l'historique, vérifier."""
from typing import Any

from ..clients.base import CordaClient, HederaClient
from ..core.hashing import hash_pdf, hash_record
from ..core.pseudonymizer import new_case_id, pseudonymize
from ..core.storage import OffChainStore
from ..models import VerificationStatus
from ..modules.sync_manager import SyncManager
from ..modules.verification_service import compare


class CaseService:
    def __init__(self, store: OffChainStore, corda: CordaClient, hedera: HederaClient,
                 sync: SyncManager):
        self.store, self.corda, self.hedera, self.sync = store, corda, hedera, sync

    def create_case(self, record: dict[str, Any], document_type: str = "MEDICAL_RECORD") -> dict:
        case_id, cleaned = pseudonymize(record)
        document_hash = hash_record(cleaned)
        storage_ref = self.store.save(case_id, cleaned)
        tx_id = self.corda.record_case(case_id, document_hash, document_type, storage_ref)
        return {"case_id": case_id, "document_hash": document_hash, "corda_tx_id": tx_id}

    def register_pdf(self, pdf_data: bytes, filename: str,
                     category: str = "MEDICAL_RECORD") -> dict:
        if not pdf_data.startswith(b"%PDF-"):
            raise ValueError("Le fichier doit etre un PDF valide.")
        if len(pdf_data) > 10 * 1024 * 1024:
            raise ValueError("Le PDF ne doit pas depasser 10 MB.")

        case_id = new_case_id()
        document_hash = hash_pdf(pdf_data)
        storage_ref = self.store.save_pdf(case_id, pdf_data, filename)
        tx_id = self.corda.record_case(case_id, document_hash, category, storage_ref)
        self.sync.register_document(
            case_id, category, filename, storage_ref, document_hash
        )
        return {
            "case_id": case_id,
            "document_hash": document_hash,
            "corda_tx_id": tx_id,
            "storage_ref": storage_ref,
            "category": category,
        }

    def verify_pdf(self, case_id: str, pdf_data: bytes) -> dict:
        recomputed = hash_pdf(pdf_data) if pdf_data.startswith(b"%PDF-") else None
        state = self.corda.get_state(case_id)
        corda_hash = state["document_hash"] if state else None
        row = self.sync.latest_published(case_id)
        proof = self.hedera.get_message(row["hedera_sequence"]) if row else None
        hedera_hash = proof["document_hash"] if proof else None
        status: VerificationStatus = compare(corda_hash, hedera_hash, recomputed)
        return {
            "case_id": case_id,
            "status": status.value,
            "corda_hash": corda_hash,
            "hedera_hash": hedera_hash,
            "recomputed_hash": recomputed,
            "corda_tx_id": state["tx_id"] if state else None,
            "hedera_sequence": row["hedera_sequence"] if row else None,
        }

    def history(self, case_id: str) -> list[dict]:
        return self.sync.history(case_id)

    def verify(self, case_id: str) -> dict:
        state = self.corda.get_state(case_id)
        corda_hash = state["document_hash"] if state else None

        row = self.sync.latest_published(case_id)
        proof = self.hedera.get_message(row["hedera_sequence"]) if row else None
        hedera_hash = proof["document_hash"] if proof else None

        doc = self.store.load(case_id)
        recomputed = hash_record(doc) if doc else None

        status: VerificationStatus = compare(corda_hash, hedera_hash, recomputed)
        return {
            "case_id": case_id,
            "status": status.value,
            "corda_hash": corda_hash,
            "hedera_hash": hedera_hash,
            "recomputed_hash": recomputed,
            "corda_tx_id": state["tx_id"] if state else None,
            "hedera_sequence": row["hedera_sequence"] if row else None,
        }
