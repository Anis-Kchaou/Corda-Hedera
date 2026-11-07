"""Génère des dossiers médicaux FICTIFS dans data/samples/ (graine fixe = reproductible).
Usage :  python scripts/generate_fake_records.py 10
"""
import json
import random
import sys
from pathlib import Path

NOMS = ["Ben Salah", "Trabelsi", "Jebali", "Mansour", "Karray", "Chaabane"]
PRENOMS = ["Amine", "Sarra", "Yassine", "Ines", "Walid", "Nour"]
DIAGNOSTICS = ["grippe", "hypertension", "diabète de type 2", "fracture du poignet", "asthme"]
SERVICES = ["cardiologie", "radiologie", "médecine générale", "laboratoire"]


def make_record(rng: random.Random) -> dict:
    return {
        "nom": rng.choice(NOMS),                  # identifiant direct, retiré par la pseudonymisation
        "prenom": rng.choice(PRENOMS),            # idem
        "date_naissance": f"{rng.randint(1950, 2005)}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}",
        "service": rng.choice(SERVICES),
        "diagnostic": rng.choice(DIAGNOSTICS),
        "analyses": {"glycemie": round(rng.uniform(0.7, 1.8), 2), "tension": rng.randint(100, 160)},
    }


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    out = Path(__file__).resolve().parent.parent / "data" / "samples"
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(42)
    for i in range(1, n + 1):
        (out / f"record_{i:03d}.json").write_text(
            json.dumps(make_record(rng), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{n} dossiers fictifs générés dans {out}")
