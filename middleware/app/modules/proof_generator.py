"""Proof Generator : événement Corda -> preuve minimale pour Hedera (sans donnée médicale)."""
import json
import uuid

from ..models import CordaEvent, Proof


def build_proof(event: CordaEvent) -> Proof:
    return Proof(
        proof_id=f"PROOF-{uuid.uuid4().hex[:12].upper()}",
        case_id=event.case_id,
        document_hash=event.document_hash,
        corda_tx_id=event.tx_id,
        timestamp=event.timestamp,
        event_type=event.event_type,
    )


def proof_to_json(proof: Proof) -> str:
    return json.dumps(proof.__dict__, sort_keys=True, separators=(",", ":"))
