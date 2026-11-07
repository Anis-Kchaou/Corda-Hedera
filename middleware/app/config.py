"""Configuration lue depuis les variables d'environnement (voir .env.example)."""
import os
from dataclasses import dataclass


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes")


@dataclass(frozen=True)
class Settings:
    use_mocks: bool = _bool("USE_MOCKS", True)
    storage_dir: str = os.getenv("STORAGE_DIR", "./data/storage")
    sync_db_path: str = os.getenv("SYNC_DB_PATH", "./data/sync.db")
    poll_interval_s: float = float(os.getenv("POLL_INTERVAL_S", "2"))

    hedera_topic_id: str = os.getenv("HEDERA_TOPIC_ID", "")
    hedera_account_id: str = os.getenv("HEDERA_ACCOUNT_ID", "")
    hedera_private_key: str = os.getenv("HEDERA_PRIVATE_KEY", "")
    mirror_node_url: str = os.getenv("MIRROR_NODE_URL", "https://testnet.mirrornode.hedera.com")

    corda_bridge_url: str = os.getenv("CORDA_BRIDGE_URL", "http://localhost:10050")
