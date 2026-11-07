import unicodedata

from app.core.hashing import hash_record
from app.core.pseudonymizer import pseudonymize


def test_key_order_does_not_change_hash():
    assert hash_record({"a": 1, "b": 2}) == hash_record({"b": 2, "a": 1})


def test_unicode_normalization():
    composed = unicodedata.normalize("NFC", "é")
    decomposed = unicodedata.normalize("NFD", "é")
    assert hash_record({"x": composed}) == hash_record({"x": decomposed})


def test_content_change_changes_hash():
    assert hash_record({"x": "a"}) != hash_record({"x": "b"})


def test_pseudonymize_removes_identifiers():
    original = {"nom": "Ben Ali", "prenom": "Sami", "diagnostic": "grippe"}
    case_id, cleaned = pseudonymize(original)
    assert "nom" not in cleaned and "prenom" not in cleaned
    assert cleaned["case_id"] == case_id and cleaned["diagnostic"] == "grippe"
    assert "nom" in original  # l'original n'est pas modifié
