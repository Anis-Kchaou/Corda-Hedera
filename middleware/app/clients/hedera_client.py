"""Client Hedera réel (Testnet).

- get_message : implémenté via l'API REST du Mirror Node (stdlib, sans SDK).
- publish     : À FAIRE — brancher le SDK Hedera (soumission d'un TopicMessageSubmitTransaction
                sur HEDERA_TOPIC_ID avec HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY).
"""
import base64
import json
import urllib.error
import urllib.request
from typing import Optional


class HederaClientImpl:
    def __init__(self, topic_id: str, account_id: str, private_key: str, mirror_node_url: str):
        self.topic_id = topic_id
        self.account_id = account_id
        self.private_key = private_key
        self.mirror = mirror_node_url.rstrip("/")

    def publish(self, message_json: str) -> int:
        # TODO(Hedera): utiliser le SDK pour publier message_json sur le topic HCS
        # et retourner le sequenceNumber du reçu. Lever une exception en cas d'échec réseau.
        raise NotImplementedError("Brancher le Hedera SDK ici")

    def get_message(self, sequence: int) -> Optional[dict]:
        url = f"{self.mirror}/api/v1/topics/{self.topic_id}/messages/{sequence}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise
        return json.loads(base64.b64decode(payload["message"]).decode("utf-8"))
