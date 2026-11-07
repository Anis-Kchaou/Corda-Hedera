"""Objets échangés entre les modules du middleware."""
from dataclasses import dataclass
from enum import Enum


class VerificationStatus(str, Enum):
    VALID = "VALID"                # Corda == Hedera == hash recalculé
    MODIFIED = "MODIFIED"          # Corda == Hedera, mais != hash recalculé
    INCONSISTENT = "INCONSISTENT"  # Corda != Hedera
    MISSING = "MISSING"            # une des trois valeurs est introuvable


class SyncStatus(str, Enum):
    PENDING = "PENDING"      # preuve générée, pas encore publiée sur Hedera
    PUBLISHED = "PUBLISHED"  # preuve publiée, séquence Hedera connue
    REJECTED = "REJECTED"    # événement Corda invalide, jamais publié


@dataclass(frozen=True)
class CordaEvent:
    tx_id: str
    case_id: str
    document_hash: str
    document_type: str
    event_type: str  # ex. "CASE_CREATED", "STATUS_UPDATED"
    timestamp: str   # ISO 8601 UTC


@dataclass(frozen=True)
class Proof:
    """Ce qui est publié sur Hedera. Jamais de donnée médicale ici."""
    proof_id: str
    case_id: str
    document_hash: str
    corda_tx_id: str
    timestamp: str
    event_type: str
