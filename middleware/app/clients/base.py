"""Interfaces des deux réseaux. Le middleware ne dépend que de ces contrats,
ce qui permet de développer avec les mocks pendant que Corda/Hedera se mettent en place."""
from typing import Optional, Protocol

from ..models import CordaEvent


class CordaClient(Protocol):
    def record_case(self, case_id: str, document_hash: str, document_type: str,
                    storage_ref: str) -> str:
        """Lance le flow Corda de création. Retourne l'ID de transaction."""

    def fetch_new_events(self) -> list[CordaEvent]:
        """Événements Corda pas encore livrés au middleware."""

    def get_state(self, case_id: str) -> Optional[dict]:
        """État courant du cas dans le vault (contient 'document_hash'), ou None."""


class HederaClient(Protocol):
    def publish(self, message_json: str) -> int:
        """Publie un message sur le topic HCS. Retourne le numéro de séquence.
        Lève une exception si le réseau est indisponible."""

    def get_message(self, sequence: int) -> Optional[dict]:
        """Relit un message publié (via Mirror Node). None s'il est introuvable."""
