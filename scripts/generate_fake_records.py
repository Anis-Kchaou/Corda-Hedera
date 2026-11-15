"""Génère des dossiers médicaux FICTIFS dans data/samples/ (graine fixe = reproductible).
Usage :  python scripts/generate_fake_records.py 10
"""
import json
import random
import sys
from pathlib import Path

NOMS = ["Ben Salah", "Trabelsi", "Jebali", "Mansour", "Karray", "Chaabane", "Gharbi", "Mejri"]
PRENOMS = {"F": ["Sarra", "Ines", "Nour", "Rim", "Amel"], "H": ["Amine", "Yassine", "Walid", "Sami", "Karim"]}
VILLES = ["Sfax", "Tunis", "Sousse", "Monastir", "Gabès"]
DIAGNOSTICS = [  # (code CIM-10, libellé, médicament, posologie)
    ("J11", "grippe", "paracétamol", "1 g toutes les 8 h"),
    ("I10", "hypertension artérielle", "amlodipine", "5 mg par jour"),
    ("E11", "diabète de type 2", "metformine", "850 mg deux fois par jour"),
    ("J45", "asthme", "salbutamol", "2 bouffées si besoin"),
    ("M54", "lombalgie", "ibuprofène", "400 mg toutes les 8 h"),
]
ANALYSES = [  # (test, unité, min, max)
    ("glycémie à jeun", "g/L", 0.70, 1.10),
    ("cholestérol total", "g/L", 1.20, 2.00),
    ("hémoglobine", "g/dL", 12.0, 17.0),
    ("créatinine", "mg/L", 6.0, 13.0),
]
IMAGERIE = [
    ("radiographie du thorax", "Pas d'anomalie parenchymateuse décelable."),
    ("échographie abdominale", "Aspect échographique normal du foie et des reins."),
    ("radiographie du poignet", "Trait de fracture non déplacé du radius distal."),
]


def date(rng, y0, y1):
    return f"{rng.randint(y0, y1)}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}"


def make_patient(rng):
    sexe = rng.choice(["F", "H"])
    naissance = rng.randint(1950, 2005)
    decade = (2026 - naissance) // 10 * 10
    return {
        # identifiants directs : supprimés par la pseudonymisation
        "nom": rng.choice(NOMS),
        "prenom": rng.choice(PRENOMS[sexe]),
        "date_naissance": date(rng, naissance, naissance),
        "telephone": f"+216 {rng.randint(20, 99)} {rng.randint(100, 999)} {rng.randint(100, 999)}",
        "adresse": f"{rng.randint(1, 120)} rue de la République, {rng.choice(VILLES)}",
        # données conservées, volontairement généralisées
        "sexe": sexe,
        "tranche_age": f"{decade}-{decade + 9}",
    }


def consultation(rng):
    code, libelle, medicament, posologie = rng.choice(DIAGNOSTICS)
    return {
        "type_document": "CONSULTATION",
        "service": rng.choice(["médecine générale", "cardiologie", "pneumologie"]),
        "date_consultation": date(rng, 2025, 2026),
        "constantes": {"tension_sys": rng.randint(105, 165), "tension_dia": rng.randint(65, 100),
                       "pouls": rng.randint(55, 105), "temperature": round(rng.uniform(36.2, 38.6), 1)},
        "diagnostic": {"code_cim10": code, "libelle": libelle},
        "prescription": [{"medicament": medicament, "posologie": posologie,
                          "duree_jours": rng.choice([5, 7, 10, 30])}],
    }


def analyses(rng):
    resultats = []
    for test, unite, lo, hi in rng.sample(ANALYSES, 3):
        resultats.append({"test": test, "valeur": round(rng.uniform(lo * 0.8, hi * 1.2), 2),
                          "unite": unite, "ref_min": lo, "ref_max": hi})
    return {"type_document": "ANALYSES", "laboratoire": "Laboratoire fictif Sfax",
            "date_prelevement": date(rng, 2025, 2026), "resultats": resultats}


def imagerie(rng):
    examen, conclusion = rng.choice(IMAGERIE)
    return {"type_document": "IMAGERIE", "examen": examen, "date_examen": date(rng, 2025, 2026),
            "conclusion": conclusion}


def make_record(rng, kind):
    record = {"fictif": True, "patient": make_patient(rng)}
    record.update({"CONSULTATION": consultation, "ANALYSES": analyses, "IMAGERIE": imagerie}[kind](rng))
    return record


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    out = Path(__file__).resolve().parent.parent / "data" / "samples"
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(42)
    kinds = ["CONSULTATION", "ANALYSES", "IMAGERIE"]
    for i in range(1, n + 1):
        kind = kinds[(i - 1) % 3]
        path = out / f"{kind.lower()}_{i:03d}.json"
        path.write_text(json.dumps(make_record(rng, kind), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{n} dossiers fictifs générés dans {out}")