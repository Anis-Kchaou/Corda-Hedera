# Organisation d'équipe

## Répartition proposée (à ajuster)

| Personne | Périmètre | Dossiers |
| --- | --- | --- |
| A | Corda : réseau de test, contrat, flows, pont REST | `corda/` |
| B | Hedera : compte Testnet, topic, publication SDK, Mirror Node | `middleware/app/clients/hedera_client.py` |
| C | Données, API, interface, tests, Docker, rapport | `scripts/`, `frontend/`, `middleware/tests/`, `docker-compose.yml` |

Le pipeline et la vérification (`middleware/app/modules/`) sont communs : toute modification passe par une PR relue.

## Règles Git

- `main` est toujours fonctionnel : on ne pousse jamais directement dessus.
- Une branche par tâche : `feat/corda-flow`, `feat/hedera-publish`, `fix/hash-normalisation`.
- Petits commits, PR courtes, au moins une relecture avant fusion.
- Avant de commencer : `git pull --rebase origin main`.
- Ne jamais commiter `.env` (clés Hedera) ni de données réelles.

## Définition de « terminé »

`pytest` passe, la démo des 4 scénarios fonctionne en mode mock, et le README reste exact.
