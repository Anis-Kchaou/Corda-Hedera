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
