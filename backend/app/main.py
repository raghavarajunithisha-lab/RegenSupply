from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, database, fda_client, risk_engine
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# Initialize new DB
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="RegenSupply API", description="Third-Party Manufacturer Risk & Compliance Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for response
class EnforcementActionSchema(BaseModel):
    id: int
    action_type: str
    date_issued: date
    description: str
    openfda_id: Optional[str]

    class Config:
        orm_mode = True

class InspectionSchema(BaseModel):
    id: int
    inspection_date: date
    classification: str
    form_483_issued: str
    observation_categories: str

    class Config:
        orm_mode = True

class CMOSchema(BaseModel):
    id: int
    name: str
    location: str
    fei_number: str
    risk_score: float
    risk_level: str

    class Config:
        orm_mode = True

class CMODetailSchema(CMOSchema):
    inspections: List[InspectionSchema] = []
    enforcement_actions: List[EnforcementActionSchema] = []

    class Config:
        orm_mode = True

class CMOCreate(BaseModel):
    name: str
    location: str
    fei_number: str

@app.post("/cmos", response_model=CMOSchema)
def create_cmo(cmo: CMOCreate, db: Session = Depends(database.get_db)):
    # 1. Add the CMO
    db_cmo = models.CMO(**cmo.model_dump())
    db.add(db_cmo)
    db.commit()
    db.refresh(db_cmo)
    
    # 2. Add some simulated inspection data so we always have a risk score
    import random
    from datetime import timedelta
    num_inspections = random.randint(1, 3)
    base_date = date.today() - timedelta(days=random.randint(30, 200))
    for i in range(num_inspections):
        classification = random.choices(["OAI", "VAI", "NAI"], weights=[0.1, 0.4, 0.5])[0]
        has_483 = "Yes" if classification in ["OAI", "VAI"] else "No"
        obs_count = random.randint(1, 6) if has_483 == "Yes" else 0
        from .fda_client import OBSERVATION_CATEGORIES
        obs_cats = ", ".join(random.sample(OBSERVATION_CATEGORIES, k=min(obs_count, len(OBSERVATION_CATEGORIES)))) if has_483 == "Yes" else ""
        db_insp = models.Inspection(
            cmo_id=db_cmo.id,
            inspection_date=base_date - timedelta(days=(i * 300)),
            classification=classification,
            form_483_issued=has_483,
            observation_categories=obs_cats
        )
        db.add(db_insp)
    db.commit()
    
    # 3. Calculate and set initial risk score
    risk_engine.update_cmo_risk(db_cmo, db)
    db.refresh(db_cmo)
    return db_cmo

@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    # Seed mock history
    fda_client.seed_cmo_data(db)
    # Calculate risks initially
    risk_engine.update_all_cmo_risks(db)
    db.close()

@app.post("/cmos/sync")
async def sync_cmos(background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    """
    Trigger async pull of real enforcement actions from openFDA and recalculation of risk scores.
    """
    background_tasks.add_task(run_sync_and_calc, db)
    return {"message": "Sync and risk recalculation started in the background."}

async def run_sync_and_calc(db: Session):
    await fda_client.sync_enforcement_actions(db)
    risk_engine.update_all_cmo_risks(db)

@app.get("/cmos", response_model=List[CMOSchema])
def list_cmos(db: Session = Depends(database.get_db)):
    """
    List all tracked CMOs with high-level risk scores.
    """
    return db.query(models.CMO).order_by(models.CMO.risk_score.desc()).all()

@app.get("/cmos/{cmo_id}", response_model=CMODetailSchema)
def get_cmo(cmo_id: int, db: Session = Depends(database.get_db)):
    """
    Get full details for a single CMO including inspections and enforcement.
    """
    return db.query(models.CMO).filter(models.CMO.id == cmo_id).first()
