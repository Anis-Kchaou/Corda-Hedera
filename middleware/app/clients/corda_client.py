"""Client Corda réel.

Le RPC de Corda est une API JVM : Python ne peut pas l'appeler directement.
Choix retenu pour le squelette : un petit "pont" REST côté JVM (Kotlin/Spring Boot, dossier corda/)
que ce client appelle en HTTP. Endpoints attendus du pont :
    POST /cases              {case_id, document_hash, document_type, storage_ref} -> {tx_id}
    GET  /events?cursor=N    -> {events: [...], next_cursor: N}
    GET  /states/{case_id}   -> {document_hash, status, ...} ou 404
À FAIRE par la personne en charge de Corda.
"""
from typing import Optional

from ..models import CordaEvent


class CordaBridgeClient:
    def __init__(self, bridge_url: str):
        self.bridge_url = bridge_url.rstrip("/")

    def record_case(self, case_id, document_hash, document_type, storage_ref) -> str:
        raise NotImplementedError("TODO(Corda): POST /cases sur le pont REST")

    def fetch_new_events(self) -> list[CordaEvent]:
        raise NotImplementedError("TODO(Corda): GET /events sur le pont REST")

    def get_state(self, case_id: str) -> Optional[dict]:
        raise NotImplementedError("TODO(Corda): GET /states/{case_id} sur le pont REST")
