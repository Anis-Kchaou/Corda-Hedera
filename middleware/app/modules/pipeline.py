"""Event Listener + orchestration : Corda -> validation -> preuve -> Hedera.

poll_once()     : à appeler en boucle (tâche de fond) pour détecter les nouveaux événements Corda.
retry_pending() : republie les preuves restées PENDING (Hedera était indisponible).
"""
import logging

from ..clients.base import CordaClient, HederaClient
from ..models import CordaEvent
from .proof_generator import build_proof, proof_to_json
from .sync_manager import SyncManager
from .verification_engine import InvalidEventError, validate_event

log = logging.getLogger("middleware.pipeline")


class Pipeline:
    def __init__(self, corda: CordaClient, hedera: HederaClient, sync: SyncManager):
        self.corda = corda
        self.hedera = hedera
        self.sync = sync

    def poll_once(self) -> int:
        events = self.corda.fetch_new_events()
        for event in events:
            self.handle_event(event)
        self.retry_pending()
        return len(events)

    def handle_event(self, event: CordaEvent) -> None:
        try:
            validate_event(event)  # Verification Engine
        except InvalidEventError as e:
            log.warning("Événement rejeté %s : %s", event.tx_id, e)
            self.sync.register_rejected(event, str(e))
            return
        proof = build_proof(event)  # Proof Generator
        if self.sync.register(proof=proof, event=event):  # idempotent
            self._publish_row(event.tx_id, proof_to_json(proof))

    def retry_pending(self) -> int:
        done = 0
        for row in self.sync.pending():
            if self._publish_row(row["corda_tx_id"], row["proof_json"]):
                done += 1
        return done

    def _publish_row(self, tx_id: str, proof_json: str) -> bool:
        try:
            sequence = self.hedera.publish(proof_json)  # Hedera Connector
        except Exception as e:  # réseau indisponible : on garde en PENDING et on réessaiera
            log.warning("Publication Hedera échouée pour %s : %s", tx_id, e)
            self.sync.mark_failed_attempt(tx_id, str(e))
            return False
        self.sync.mark_published(tx_id, sequence)
        return True
