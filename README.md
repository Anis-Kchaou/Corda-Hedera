# Corda ↔ Hedera : preuve d'intégrité de données médicales

Prototype pédagogique (données **fictives uniquement**) : un dossier médical vit hors chaîne,
son empreinte SHA-256 est enregistrée sur **Corda** (réseau permissionné), puis une preuve
minimale est publiée sur **Hedera** (réseau public). Un service compare ensuite les trois
empreintes (Corda, Hedera, recalculée) : `VALID`, `MODIFIED`, `INCONSISTENT` ou `MISSING`.

```
Dossier fictif → pseudonymisation → SHA-256 → Corda → [middleware] → preuve → Hedera
                                                          ↑
                              vérification : Corda vs Hedera vs hash recalculé
```

## Structure

| Dossier | Contenu |
| --- | --- |
| `middleware/` | Python / FastAPI : pseudonymisation, hachage, pipeline Corda→Hedera, vérification, tests |
| `corda/` | Kotlin : State, Contract, Flows Corda |
| `frontend/` | Page HTML de démonstration |
| `scripts/` | Génération de dossiers fictifs |
| `docs/` | Architecture, format de la preuve, organisation d'équipe |

## Démarrage rapide (mode mock, sans Corda ni Hedera)

```bash
cp .env.example .env
cd middleware
python -m venv .venv && source .venv/bin/activate      # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest                                                 # les 4 scénarios passent avec les mocks
uvicorn app.main:app --reload --port 8000              # API sur http://localhost:8000/docs
```

Puis ouvrir `frontend/index.html` dans le navigateur.

Avec Docker : `docker compose up --build`.

## Passer en mode réel

Mettre `USE_MOCKS=false` dans `.env` et compléter les `TODO` :
`middleware/app/clients/hedera_client.py` (publication SDK) et `corda_client.py` (pont REST).

## Travailler en équipe

Voir `docs/team-workflow.md` (branches, PR, répartition).
