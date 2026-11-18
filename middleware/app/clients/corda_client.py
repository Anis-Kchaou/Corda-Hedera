"""Client Corda réel.

Le RPC de Corda est une API JVM : Python ne peut pas l'appeler directement.
Ce client appelle donc en HTTP un petit "pont" REST côté JVM (Spring Boot, dossier corda/clients),
connecté au nœud Hospital. Routes du pont :
    POST /cases                  {case_id, document_hash, document_type, storage_ref} -> {tx_id}
    POST /cases/{case_id}/status {status} -> {tx_id}
    GET  /events?cursor=N        -> {events: [...], next_cursor: N}
    GET  /states/{case_id}       -> {document_hash, status, ...} ou 404
Le pont ne doit être joignable que par le middleware (réseau interne).
"""
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

from ..models import CordaEvent


class CordaBridgeError(RuntimeError):
    """Erreur de communication avec le pont, ou refus renvoyé par Corda."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class CordaBridgeClient:
    def __init__(self, bridge_url: str, timeout: float = 15.0, start_cursor: int = 0):
        self.bridge_url = bridge_url.rstrip("/")
        self.timeout = timeout
        self._cursor = start_cursor

    # ---------- HTTP ----------

    def _request(self, method: str, path: str, payload: Optional[dict] = None):
        """Renvoie (code_http, corps_json_ou_None). Lève CordaBridgeError si le pont est injoignable."""
        url = self.bridge_url + path
        headers = {"Accept": "application/json"}
        data = None
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                status, raw = response.status, response.read().decode("utf-8")
        except urllib.error.HTTPError as err:  # 4xx / 5xx : le pont a répondu
            status, raw = err.code, err.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, OSError) as err:  # pont éteint, délai dépassé...
            raise CordaBridgeError(f"Pont Corda injoignable ({url}) : {err}") from err
        try:
            body = json.loads(raw) if raw else None
        except ValueError:
            body = None
        return status, body

    @staticmethod
    def _message(status: int, body) -> str:
        if isinstance(body, dict) and body.get("error"):
            return str(body["error"])
        return f"Réponse inattendue du pont (HTTP {status})"

    # ---------- API utilisée par le middleware ----------

    def record_case(self, case_id, document_hash, document_type, storage_ref) -> str:
        status, body = self._request("POST", "/cases", {
            "case_id": case_id,
            "document_hash": document_hash,
            "document_type": document_type,
            "storage_ref": storage_ref,
        })
        if status != 200 or not isinstance(body, dict) or "tx_id" not in body:
            raise CordaBridgeError(self._message(status, body), status)
        return body["tx_id"]

    def update_status(self, case_id: str, new_status: str) -> str:
        """Change le statut d'un dossier (CREATED, UPDATED, REVOKED). Renvoie l'id de transaction."""
        path = "/cases/" + urllib.parse.quote(case_id, safe="") + "/status"
        status, body = self._request("POST", path, {"status": new_status})
        if status != 200 or not isinstance(body, dict) or "tx_id" not in body:
            raise CordaBridgeError(self._message(status, body), status)
        return body["tx_id"]

    def fetch_new_events(self) -> list[CordaEvent]:
        status, body = self._request("GET", f"/events?cursor={self._cursor}")
        if status != 200 or not isinstance(body, dict):
            raise CordaBridgeError(self._message(status, body), status)
        try:
            events = [
                CordaEvent(
                    tx_id=e["tx_id"],
                    case_id=e["case_id"],
                    document_hash=e["document_hash"],
                    document_type=e["document_type"],
                    event_type=e["event_type"],
                    timestamp=e["timestamp"],
                )
                for e in body["events"]
            ]
            next_cursor = int(body["next_cursor"])
        except (KeyError, TypeError, ValueError) as err:
            raise CordaBridgeError(f"Réponse /events invalide : {err}") from err
        self._cursor = next_cursor  # on n'avance qu'après une réponse valide
        return events

    def get_state(self, case_id: str) -> Optional[dict]:
        status, body = self._request("GET", "/states/" + urllib.parse.quote(case_id, safe=""))
        if status == 404:
            return None
        if status != 200 or not isinstance(body, dict):
            raise CordaBridgeError(self._message(status, body), status)
        return body