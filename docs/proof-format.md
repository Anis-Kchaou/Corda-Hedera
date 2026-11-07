# Formats de données

## Preuve publiée sur Hedera (aucune donnée médicale)

```json
{
  "proof_id": "PROOF-3F9A1C2B7D10",
  "case_id": "CASE-8A21B7C4D9E0",
  "document_hash": "<sha256 hexadécimal, 64 caractères>",
  "corda_tx_id": "<id de transaction Corda>",
  "timestamp": "2026-11-07T10:15:30+00:00",
  "event_type": "CASE_CREATED"
}
```

## Hash du document

`H = SHA-256( canonique(D) )` où le dossier pseudonymisé D est mis sous forme canonique :
clés triées, sans espaces, UTF-8, chaînes en Unicode NFC et sans espaces aux extrémités.
Ne jamais hacher le fichier brut : le même contenu pourrait donner des hash différents.

## Résultats de vérification

| Statut | Condition |
| --- | --- |
| `VALID` | hash Corda = hash Hedera = hash recalculé |
| `MODIFIED` | hash Corda = hash Hedera ≠ hash recalculé |
| `INCONSISTENT` | hash Corda ≠ hash Hedera |
| `MISSING` | une des trois valeurs est introuvable (ex. preuve pas encore publiée) |
