# Guide Corda (passation)

## Rôle
Couche permissionnée : enregistre pour chaque dossier le hash SHA-256 et des métadonnées (aucune donnée médicale). Les nœuds Corda sont exposés au middleware Python par un pont REST Java.

## Prérequis
- JDK 17 (Temurin). Corda 4.12, Gradle via le wrapper (`gradlew.bat`).
- Le chemin du dépôt ne doit contenir ni `&` ni caractère spécial : `gradlew.bat` plante sinon.
- Dans `corda/gradle.properties`, `org.gradle.jvmargs` garde les options `--add-opens` du template si ce n'est pas déjà le cas sur ta branche.

## Réseau (dev)
| Nœud | Identité | P2P | RPC |
|---|---|---|---|
| Notary | `O=Notary,L=London,C=GB` | 10002 | 10003 |
| Hospital (émetteur) | `O=Hospital,L=Tunis,C=TN` | 10005 | 10006 |
| Laboratory (observateur) | `O=Laboratory,L=Sfax,C=TN` | 10008 | 10009 |

Utilisateur RPC de développement du template : `user1` / `test`. Jamais en production.

## Démarrer, dans cet ordre
1. Nœuds (depuis `corda/`) :
   ```
   gradlew.bat deployNodes        # seulement après un changement de code : efface build\nodes et tous les états
   build\nodes\runnodes.bat       # attendre "started up and registered" dans Hospital et Laboratory
   ```
2. Pont REST (autre terminal, depuis `corda/`) :
   ```
   gradlew.bat runTemplateServer  # attendre "Tomcat started on port 10050"
   ```
   Il n'écoute que sur 127.0.0.1 et se connecte une seule fois à Hospital au démarrage.
3. Middleware (depuis `middleware/`, venv actif) :
   ```
   $env:USE_MOCKS="true"; $env:USE_MOCK_CORDA="false"
   $env:CORDA_BRIDGE_URL="http://localhost:10050"
   $env:STORAGE_DIR="..\data\storage"; $env:SYNC_DB_PATH="..\data\sync-integration.db"
   Remove-Item $env:SYNC_DB_PATH -ErrorAction SilentlyContinue
   uvicorn app.main:app --port 8000
   ```
   Tant que Hedera est simulé (`USE_MOCK_HEDERA` à true), supprimer la base de synchronisation à chaque redémarrage : le faux Hedera oublie ses messages.

## Code Corda (`corda/`)
- `contracts` : `MedicalProofState`, `MedicalProofContract` (commandes `Create` et `UpdateStatus`), `DocumentStatus`.
- `workflows` : `CreateMedicalProofFlow`, `UpdateMedicalProofStatusFlow` et leurs responders.
- `clients` : pont REST `MedicalProofController`.
- Règles du contrat : hash = 64 caractères hexadécimaux en minuscules ; à la mise à jour, hash et caseId ne changent jamais et le statut doit changer ; seul l'émetteur signe.
- Le Notary n'intervient qu'aux mises à jour (une transaction sans entrée n'est pas notarisée).

## API du pont (utilisée par `corda_client.py`)
| Route | Rôle |
|---|---|
| `POST /cases` | `{case_id, document_hash, document_type, storage_ref}` renvoie `{tx_id}` ; `409` si le dossier existe, `422` si le contrat refuse |
| `POST /cases/{case_id}/status` | `{status}` (CREATED, UPDATED, REVOKED) renvoie `{tx_id}` |
| `GET /states/{case_id}` | état actif, ou `404` |
| `GET /events?cursor=N` | `{events, next_cursor}` ; un événement par transaction enregistrée |

Format d'un événement : `tx_id`, `case_id`, `document_hash`, `document_type`, `event_type` (`CASE_CREATED` ou `STATUS_UPDATED`), `timestamp`. Les `tx_id` sont en minuscules, 64 caractères hexadécimaux.

## Points à connaître
- Un même `case_id` produit plusieurs événements, donc plusieurs preuves Hedera.
- Le curseur de `CordaBridgeClient` est en mémoire : après un redémarrage, il relit tout depuis 0. `sync_manager` doit ignorer un `tx_id` déjà traité.
- `/events` relit tout le vault : suffisant pour un prototype.
- Le pont n'a pas d'authentification (accès limité à localhost).
- Les états `CASE-TEST0001` et `CASE-PY0001`, créés à la main, sont rejetés à chaque démarrage du middleware (format de `case_id`) : sans conséquence ; un `deployNodes` remet le vault à zéro.
- D'après la lecture de `pipeline.py` (non testé) : `poll_once` lit Corda avant `retry_pending`, donc pendant une panne de Corda les preuves `PENDING` ne sont pas republiées.

## Validé manuellement
Création et mise à jour dans le shell Corda ; via le middleware : `VALID`, `MODIFIED` (fichier hors chaîne altéré), `INCONSISTENT` (preuve simulée altérée), panne Hedera avec reprise automatique, publication de `STATUS_UPDATED`.

## Reste à faire
Tests automatiques `MockNetwork`, vrai Hedera (testnet), Docker, mesures de performance, rapport. Décision à prendre : garder ou supprimer l'ancien squelette Kotlin (`contracts/src/main/kotlin`, `workflows/src/main/kotlin`), non compilé.