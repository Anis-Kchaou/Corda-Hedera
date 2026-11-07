"""Verification Service : compare les trois hash (Corda, Hedera, recalculé)."""
from typing import Optional

from ..models import VerificationStatus


def compare(
    corda_hash: Optional[str], hedera_hash: Optional[str], recomputed_hash: Optional[str]
) -> VerificationStatus:
    if corda_hash is None or hedera_hash is None or recomputed_hash is None:
        return VerificationStatus.MISSING
    if corda_hash != hedera_hash:
        return VerificationStatus.INCONSISTENT
    if recomputed_hash != corda_hash:
        return VerificationStatus.MODIFIED
    return VerificationStatus.VALID
