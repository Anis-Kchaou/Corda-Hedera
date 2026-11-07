# Architecture : correspondance cahier des charges ↔ fichiers

| Composant du cahier des charges | Fichier |
| --- | --- |
| Module de pseudonymisation | `middleware/app/core/pseudonymizer.py` |
| Hachage SHA-256 + canonicalisation | `middleware/app/core/hashing.py` |
| Stockage hors chaîne | `middleware/app/core/storage.py` |
| Module Corda (State, Contract, Flows) | `corda/contracts/...`, `corda/workflows/...` |
| Event Listener | `middleware/app/modules/pipeline.py` (`poll_once`) |
| Verification Engine | `middleware/app/modules/verification_engine.py` |
| Proof Generator | `middleware/app/modules/proof_generator.py` |
| Hedera Connector | `middleware/app/clients/hedera_client.py` |
| Synchronization Manager + file d'attente | `middleware/app/modules/sync_manager.py` (+ `retry_pending`) |
| Verification Service | `middleware/app/modules/verification_service.py` |
| API | `middleware/app/main.py` |
| Interface | `frontend/index.html` |
| Cas de test (4 scénarios) | `middleware/tests/test_scenarios.py` |

## Principe des mocks

Le middleware ne parle qu'aux interfaces `CordaClient` et `HederaClient` (`clients/base.py`).
`clients/mock.py` fournit des versions en mémoire, avec de quoi simuler une panne Hedera et falsifier une preuve.
Chacun peut donc avancer sans attendre les autres.

## Décisions à valider en équipe

- Corda étant JVM, le middleware Python passe par un **pont REST** à écrire côté Kotlin.
- SQLite pour la table de synchronisation (stockage local protégé) ; PostgreSQL possible ensuite.
- Hedera Consensus Service (topic) pour publier les preuves.
