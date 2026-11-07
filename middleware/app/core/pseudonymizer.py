"""Module de pseudonymisation : retire les identifiants directs, attribue un Case ID."""
import uuid
from typing import Any

DIRECT_IDENTIFIERS = {
    "nom", "prenom", "name", "first_name", "last_name", "cin", "adresse", "address",
    "telephone", "phone", "email", "date_naissance", "birth_date", "ssn",
}


def new_case_id() -> str:
    return f"CASE-{uuid.uuid4().hex[:12].upper()}"


def pseudonymize(record: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Retourne (case_id, dossier pseudonymisé). Le dossier d'origine n'est pas modifié."""
    if not isinstance(record, dict) or not record:
        raise ValueError("Le dossier doit être un objet JSON non vide.")
    case_id = new_case_id()
    cleaned = {k: v for k, v in record.items() if k.lower() not in DIRECT_IDENTIFIERS}
    cleaned["case_id"] = case_id
    return case_id, cleaned
