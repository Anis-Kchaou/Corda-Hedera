"""Canonicalisation + SHA-256.

Sans canonicalisation, le même contenu peut produire des hash différents
(ordre des clés, espaces, accents Unicode composés/décomposés...).
"""
import hashlib
import json
import unicodedata
from typing import Any


def _normalize(value: Any) -> Any:
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value).strip()
    if isinstance(value, dict):
        return {_normalize(k): _normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    return value


def canonicalize(record: dict[str, Any]) -> bytes:
    """JSON canonique : clés triées, sans espaces, UTF-8, Unicode NFC."""
    return json.dumps(
        _normalize(record), sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_record(record: dict[str, Any]) -> str:
    """H = SHA-256(canonique(D))"""
    return sha256_hex(canonicalize(record))
