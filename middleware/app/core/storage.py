"""Stockage hors chaîne : un fichier JSON par cas dans STORAGE_DIR (local protégé)."""
import json
from pathlib import Path
from typing import Any, Optional


class OffChainStore:
    def __init__(self, base_dir: str):
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    def _path(self, case_id: str) -> Path:
        if not case_id.replace("-", "").isalnum():
            raise ValueError("Case ID invalide.")
        return self.base / f"{case_id}.json"

    def save(self, case_id: str, record: dict[str, Any]) -> str:
        path = self._path(case_id)
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        return f"file://{path.name}"

    def load(self, case_id: str) -> Optional[dict[str, Any]]:
        path = self._path(case_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def save_pdf(self, case_id: str, data: bytes, filename: str) -> str:
        if not case_id.replace("-", "").isalnum():
            raise ValueError("Case ID invalide.")
        if not data.startswith(b"%PDF-"):
            raise ValueError("Le fichier doit etre un PDF valide.")
        safe_name = Path(filename).name or "document.pdf"
        path = self.base / f"{case_id}.pdf"
        path.write_bytes(data)
        return f"file://{safe_name}"

    def load_pdf(self, case_id: str) -> Optional[bytes]:
        path = self.base / f"{case_id}.pdf"
        if not path.exists():
            return None
        return path.read_bytes()
