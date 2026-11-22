"""Client Hedera réel (Testnet) utilisant le SDK Hiero Python."""
import base64
import json
import urllib.error
import urllib.request
from typing import Optional

from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
    TopicId,
    TopicMessageSubmitTransaction,
)


class HederaClientImpl:
    def __init__(self, topic_id: str, account_id: str, private_key: str, mirror_node_url: str):
        self.topic_id = topic_id
        self.account_id = account_id
        self.private_key = private_key
        self.mirror = mirror_node_url.rstrip("/")
        self._client: Optional[Client] = None

    def _create_client(self) -> Client:
        if not self.topic_id:
            raise RuntimeError("HEDERA_TOPIC_ID est requis")
        if not self.account_id:
            raise RuntimeError("HEDERA_ACCOUNT_ID est requis")
        if not self.private_key:
            raise RuntimeError("HEDERA_PRIVATE_KEY est requis")

        network = Network("testnet")
        client = Client(network)
        operator_id = AccountId.from_string(self.account_id)
        operator_key = PrivateKey.from_string(self.private_key)
        client.set_operator(operator_id, operator_key)
        return client

    def publish(self, message_json: str) -> int:
        client = self._create_client()
        topic_id = TopicId.from_string(self.topic_id)

        operator_key = PrivateKey.from_string(self.private_key)
        transaction = (
            TopicMessageSubmitTransaction(
                topic_id=topic_id,
                message=message_json.encode("utf-8"),
            )
            .freeze_with(client)
            .sign(operator_key)
        )
        receipt = transaction.execute(client)
        sequence = getattr(receipt, "topic_sequence_number", None)
        if sequence is None:
            raise RuntimeError("Hedera n'a pas renvoyé de topic_sequence_number")
        return int(sequence)

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
