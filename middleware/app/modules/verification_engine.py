"""Verification Engine : vérifie qu'un événement Corda respecte les règles avant publication."""
import re

from ..models import CordaEvent

ALLOWED_EVENT_TYPES = {"CASE_CREATED", "STATUS_UPDATED"}
_HASH_RE = re.compile(r"^[0-9a-f]{64}$")
_CASE_RE = re.compile(r"^CASE-[0-9A-F]{12}$")


class InvalidEventError(ValueError):
    pass


def validate_event(event: CordaEvent) -> None:
    if not event.tx_id:
        raise InvalidEventError("tx_id Corda manquant")
    if not _CASE_RE.match(event.case_id):
        raise InvalidEventError(f"Case ID mal formé : {event.case_id}")
    if not _HASH_RE.match(event.document_hash):
        raise InvalidEventError("document_hash n'est pas un SHA-256 hexadécimal")
    if event.event_type not in ALLOWED_EVENT_TYPES:
        raise InvalidEventError(f"Type d'événement non autorisé : {event.event_type}")
