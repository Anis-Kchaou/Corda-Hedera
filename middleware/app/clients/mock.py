"""Faux Corda et faux Hedera en mémoire : pour développer, tester et faire la démo sans réseau."""
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from ..models import CordaEvent


class MockCordaClient:
    def __init__(self) -> None:
        self._states: dict[str, dict] = {}
        self._events: list[CordaEvent] = []
        self._cursor = 0

    def record_case(self, case_id, document_hash, document_type, storage_ref) -> str:
        tx_id = uuid.uuid4().hex
        ts = datetime.now(timezone.utc).isoformat()
        self._states[case_id] = {
            "case_id": case_id, "document_hash": document_hash,
            "document_type": document_type, "storage_ref": storage_ref,
            "status": "CREATED", "tx_id": tx_id, "created_at": ts,
        }
        self._events.append(CordaEvent(tx_id, case_id, document_hash, document_type,
                                       "CASE_CREATED", ts))
        return tx_id

    def fetch_new_events(self) -> list[CordaEvent]:
        new = self._events[self._cursor:]
        self._cursor = len(self._events)
        return new

    def get_state(self, case_id: str) -> Optional[dict]:
        return self._states.get(case_id)


class HederaUnavailableError(RuntimeError):
    pass


class MockHederaClient:
    def __init__(self) -> None:
        self.available = True  # passer à False pour simuler une panne (scénario 4)
        self._messages: dict[int, str] = {}

    def publish(self, message_json: str) -> int:
        if not self.available:
            raise HederaUnavailableError("Hedera indisponible (simulation)")
        seq = len(self._messages) + 1
        self._messages[seq] = message_json
        return seq

    def get_message(self, sequence: int) -> Optional[dict]:
        raw = self._messages.get(sequence)
        return json.loads(raw) if raw else None

    def tamper(self, sequence: int, new_hash: str) -> None:
        """Falsifie une preuve (scénario 3 : incohérence inter-chaînes)."""
        msg = json.loads(self._messages[sequence])
        msg["document_hash"] = new_hash
        self._messages[sequence] = json.dumps(msg)
