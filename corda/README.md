# Corda : contrats et flows (Kotlin)

Ce dossier contient **uniquement le code métier** (State, Contract, Flows), organisé comme le
dépôt officiel `corda/cordapp-template-kotlin` (modules `contracts/` et `workflows/`).

## Mise en route (personne en charge de Corda)

1. Cloner le template officiel `cordapp-template-kotlin` dans un dossier temporaire.
2. Copier ses fichiers Gradle (`build.gradle`, `settings.gradle`, `gradle/`, `constants.properties`,
   `contracts/build.gradle`, `workflows/build.gradle`) dans ce dossier `corda/`.
3. Supprimer le code d'exemple du template (package `com.template`) et garder le nôtre (`tn.enis.medproof`).
4. Dans le `build.gradle` racine, déclarer 3 nœuds (`deployNodes`) : Hôpital, Laboratoire, Notaire (+ notary).
5. `./gradlew deployNodes` puis lancer les nœuds générés.

## À faire

- [ ] Compiler et lancer `CreateMedicalProofFlow` depuis le shell d'un nœud.
- [ ] Implémenter `UpdateStatus` (contrat + flow).
- [ ] Écrire un **pont REST** (voir `middleware/app/clients/corda_client.py` pour les endpoints attendus) :
      le RPC Corda est une API JVM, Python ne peut pas l'appeler directement.
- [ ] Exposer les événements (vault queries / `vaultTrackBy`) au pont.
