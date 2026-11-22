"""Create an HCS topic on Hedera Testnet."""
import os
from pathlib import Path

from dotenv import load_dotenv

from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
    TopicCreateTransaction,
)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


account_id = os.getenv("HEDERA_ACCOUNT_ID", "")
private_key = os.getenv("HEDERA_PRIVATE_KEY", "")

if not account_id or not private_key:
    raise SystemExit(
        "Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY before running this script."
    )

network = Network("testnet")
client = Client(network)
client.set_operator(
    AccountId.from_string(account_id),
    PrivateKey.from_string(private_key),
)

operator_key = PrivateKey.from_string(private_key)
transaction = (
    TopicCreateTransaction(memo="Corda-Hedera medical proof")
    .freeze_with(client)
    .sign(operator_key)
)
receipt = transaction.execute(client)

if receipt.topic_id is None:
    raise RuntimeError("Hedera did not return a topic ID")

print(receipt.topic_id)
