"""Synchronization Manager : table de correspondance tx Corda <-> preuve Hedera.

Sert aussi de file d'attente persistante : les lignes PENDING sont republiées
par retry_pending() quand Hedera redevient disponible (aucun événement perdu).
SQLite (stdlib) pour démarrer ; migrable vers PostgreSQL plus tard.
"""
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Optional

from ..models import CordaEvent, Proof, SyncStatus
from .proof_generator import proof_to_json

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sync (
    corda_tx_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    proof_id TEXT,
    document_hash TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    proof_json TEXT,
    hedera_sequence INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    published_at TEXT
)
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SyncManager:
    def __init__(self, db_path: str = ":memory:"):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.execute(_SCHEMA)
            self._conn.commit()

    def register(self, event: CordaEvent, proof: Proof) -> bool:
        """Enregistre un événement en PENDING. Retourne False s'il existe déjà (idempotent)."""
        with self._lock:
            cur = self._conn.execute(
                "INSERT OR IGNORE INTO sync (corda_tx_id, case_id, proof_id, document_hash, "
                "event_type, status, proof_json, created_at) VALUES (?,?,?,?,?,?,?,?)",
                (event.tx_id, event.case_id, proof.proof_id, event.document_hash,
                 event.event_type, SyncStatus.PENDING.value, proof_to_json(proof), _now()),
            )
            self._conn.commit()
            return cur.rowcount == 1

    def register_rejected(self, event: CordaEvent, reason: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT OR IGNORE INTO sync (corda_tx_id, case_id, document_hash, event_type, "
                "status, last_error, created_at) VALUES (?,?,?,?,?,?,?)",
                (event.tx_id, event.case_id, event.document_hash, event.event_type,
                 SyncStatus.REJECTED.value, reason, _now()),
            )
            self._conn.commit()

    def mark_published(self, tx_id: str, hedera_sequence: int) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE sync SET status=?, hedera_sequence=?, published_at=?, last_error=NULL "
                "WHERE corda_tx_id=?",
                (SyncStatus.PUBLISHED.value, hedera_sequence, _now(), tx_id),
            )
            self._conn.commit()

    def mark_failed_attempt(self, tx_id: str, error: str) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE sync SET attempts = attempts + 1, last_error=? WHERE corda_tx_id=?",
                (error, tx_id),
            )
            self._conn.commit()

    def pending(self) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM sync WHERE status=? ORDER BY created_at", (SyncStatus.PENDING.value,)
            ).fetchall()
        return [dict(r) for r in rows]

    def history(self, case_id: str) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM sync WHERE case_id=? ORDER BY created_at", (case_id,)
            ).fetchall()
        return [dict(r) for r in rows]

    def latest_published(self, case_id: str) -> Optional[dict]:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM sync WHERE case_id=? AND status=? ORDER BY created_at DESC LIMIT 1",
                (case_id, SyncStatus.PUBLISHED.value),
            ).fetchone()
        return dict(row) if row else None
