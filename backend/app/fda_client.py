import httpx
from typing import List, Dict, Any
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from . import models

# Since openFDA doesn't supply 483 categories or direct inspection classifications via a simple API,
# we seed realistic simulated data for the big CMOs that Regeneron relies on (or might rely on),
# alongside fetching real enforcement actions.

MAJOR_CMOS = [
    {"name": "Catalent Pharma Solutions", "location": "Bloomington, IN", "fei_number": "3006424514"},
    {"name": "Fujifilm Diosynth Biotechnologies", "location": "RTP, NC", "fei_number": "3004455667"},
    {"name": "Lonza Biologics", "location": "Portsmouth, NH", "fei_number": "1225577"},
    {"name": "Patheon (Thermo Fisher)", "location": "Greenville, NC", "fei_number": "1036319"},
    {"name": "Samsung Biologics", "location": "Incheon, South Korea", "fei_number": "3010373703"},
    {"name": "WuXi Biologics", "location": "Wuxi, China", "fei_number": "3012217646"},
    {"name": "Boehringer Ingelheim", "location": "Vienna, Austria", "fei_number": "3003050123"},
    {"name": "Charles River Laboratories", "location": "Wilmington, MA", "fei_number": "1000115678"},
    {"name": "Emergent BioSolutions", "location": "Baltimore, MD", "fei_number": "3007137599"},
    {"name": "AGC Biologics", "location": "Seattle, WA", "fei_number": "3003024567"},
    {"name": "Rentschler Biopharma", "location": "Laupheim, Germany", "fei_number": "3002808777"},
    {"name": "KBI Biopharma", "location": "Durham, NC", "fei_number": "3003009961"},
    {"name": "Wacker Biotech", "location": "Halle, Germany", "fei_number": "3006421111"},
    {"name": "Novartis Technical Operations", "location": "Basel, Switzerland", "fei_number": "3008476565"},
    {"name": "Thermo Fisher Scientific", "location": "Brisbane, Australia", "fei_number": "3010112233"},
    {"name": "Pfizer CentreOne", "location": "Kalamazoo, MI", "fei_number": "1810189"}
]

OBSERVATION_CATEGORIES = [
    "211.22(d) - Quality Control Unit Procedures",
    "211.192 - Production Record Review",
    "211.67(a) - Equipment Cleaning and Maintenance",
    "211.160(b) - Laboratory Controls",
    "211.25(a) - Personnel Qualifications",
    "211.113(b) - Control of Microbiological Contamination",
    "211.68(b) - Automatic, Mechanical, and Electronic Equipment (Data Integrity)",
    "211.100(a) - Written Procedures; Deviations"
]

async def fetch_openfda_enforcement_actions(cmo_name: str) -> List[Dict[str, Any]]:
    """
    Fetch drug enforcement/recall actions from openFDA for a specific firm.
    """
    # Just grab the first word to improve search hits in openFDA
    search_term = cmo_name.split()[0].replace(",", "")
    url = f'https://api.fda.gov/drug/enforcement.json?search=recalling_firm:"{search_term}"&limit=5'
    
    actions = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("results", []):
                    # Convert YYYYMMDD to date
                    date_str = item.get("recall_initiation_date", "20200101")
                    try:
                        recall_date = date(int(date_str[0:4]), int(date_str[4:6]), int(date_str[6:8]))
                    except:
                        recall_date = date.today()

                    actions.append({
                        "action_type": "Recall",
                        "date_issued": recall_date,
                        "description": item.get("reason_for_recall", "Product compromise"),
                        "openfda_id": item.get("event_id", "")
                    })
    except Exception as e:
        print(f"Error fetching openFDA for {cmo_name}: {e}")
    
    return actions

def seed_cmo_data(db: Session):
    """
    Seeds initial synthetic and fetched data for the dashboard demo.
    """
    # Only seed if empty
    if db.query(models.CMO).count() > 0:
        return

    for cmo_data in MAJOR_CMOS:
        db_cmo = models.CMO(
            name=cmo_data["name"],
            location=cmo_data["location"],
            fei_number=cmo_data["fei_number"]
        )
        db.add(db_cmo)
        db.commit()
        db.refresh(db_cmo)

        # Generate 1 to 4 historical inspections
        num_inspections = random.randint(1, 4)
        base_date = date.today() - timedelta(days=random.randint(30, 100))
        
        for i in range(num_inspections):
            # The older the inspection, the further back in time
            insp_date = base_date - timedelta(days=(i * random.randint(300, 450)))
            
            # Catalent gets a harsh history to match the real-world narrative regarding Eylea HD delays
            if "Catalent" in db_cmo.name and i == 0:
                classification = "OAI"
                has_483 = "Yes"
                obs_count = random.randint(4, 9)
            elif "Fujifilm" in db_cmo.name:
                classification = random.choice(["VAI", "NAI"])
                has_483 = "Yes" if classification == "VAI" else "No"
                obs_count = random.randint(1, 3) if has_483 == "Yes" else 0
            else:
                classification = random.choices(["OAI", "VAI", "NAI"], weights=[0.1, 0.4, 0.5])[0]
                has_483 = "Yes" if classification in ["OAI", "VAI"] else "No"
                obs_count = random.randint(1, 6) if has_483 == "Yes" else 0

            obs_cats = ", ".join(random.sample(OBSERVATION_CATEGORIES, k=min(obs_count, len(OBSERVATION_CATEGORIES)))) if has_483 == "Yes" else ""

            db_insp = models.Inspection(
                cmo_id=db_cmo.id,
                inspection_date=insp_date,
                classification=classification,
                form_483_issued=has_483,
                observation_categories=obs_cats
            )
            db.add(db_insp)
        db.commit()

async def sync_enforcement_actions(db: Session):
    """
    Async job to pull real recall data for seeded CMOs.
    """
    cmos = db.query(models.CMO).all()
    for cmo in cmos:
        # Check if we already fetched
        if db.query(models.EnforcementAction).filter(models.EnforcementAction.cmo_id == cmo.id).count() == 0:
            actions = await fetch_openfda_enforcement_actions(cmo.name)
            # If no openFDA results, maybe randomly assign a historical warning letter for flavor
            if not actions and "Catalent" in cmo.name:
                db_action = models.EnforcementAction(
                    cmo_id=cmo.id,
                    action_type="Warning Letter",
                    date_issued=date.today() - timedelta(days=120),
                    description="Warning letter issued due to significant deviations from CGMP for sterile drug products, specifically regarding environmental monitoring and media fills."
                )
                db.add(db_action)
            else:
                for act in actions:
                    db_action = models.EnforcementAction(
                        cmo_id=cmo.id,
                        action_type=act["action_type"],
                        date_issued=act["date_issued"],
                        description=act["description"],
                        openfda_id=act["openfda_id"]
                    )
                    db.add(db_action)
            db.commit()
