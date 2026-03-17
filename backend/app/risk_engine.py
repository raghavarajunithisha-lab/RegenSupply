from sqlalchemy.orm import Session
from datetime import date
from . import models

def calculate_cmo_risk(db: Session, cmo_id: int):
    """
    Calculates a 0-100 risk score for a CMO based on their FDA inspection history
    and enforcement actions. 
    100 = Maximum Risk (Avoid)
    0 = Perfect Compliance (Low Risk)
    """
    cmo = db.query(models.CMO).filter(models.CMO.id == cmo_id).first()
    if not cmo:
        return
        
    score = 0.0
    
    # 1. Evaluate Inspections (OAI is terrible, VAI is minor, NAI is good)
    inspections = db.query(models.Inspection).filter(models.Inspection.cmo_id == cmo_id).order_by(models.Inspection.inspection_date.desc()).all()
    
    if inspections:
        most_recent = inspections[0]
        
        # Base penalty from most recent inspection
        if most_recent.classification == "OAI": # Official Action Indicated
            score += 50
        elif most_recent.classification == "VAI": # Voluntary Action Indicated
            score += 20
        elif most_recent.classification == "NAI": # No Action Indicated
            score += 0
            
        # Penalty for recent 483 observations
        if most_recent.form_483_issued == "Yes":
            obs_list = most_recent.observation_categories.split(",") if most_recent.observation_categories else []
            # +5 risk points per observation category in the most recent inspection
            score += len(obs_list) * 5
            
            # Critical observations multiply risk
            if "Data Integrity" in most_recent.observation_categories:
                score += 15
            if "Microbiological Contamination" in most_recent.observation_categories:
                score += 15
                
        # Historical pattern (look at older inspections)
        for old_insp in inspections[1:]:
            if old_insp.classification == "OAI":
                score += 10 # Patterns of severe issues
                
    else:
        # No inspection history is actually a medium risk (unknown)
        score += 30 
        
    # 2. Evaluate Enforcement Actions (Warning Letters, Recalls, Import Alerts)
    actions = db.query(models.EnforcementAction).filter(models.EnforcementAction.cmo_id == cmo_id).all()
    today = date.today()
    
    for action in actions:
        # Calculate recency modifier
        days_ago = (today - action.date_issued).days
        recency_weight = 1.0
        if days_ago < 365:
            recency_weight = 1.5 # Action within last year is worse
        elif days_ago > 365 * 3:
            recency_weight = 0.5 # Very old action matters less
            
        if action.action_type == "Warning Letter":
            score += 40 * recency_weight
        elif action.action_type == "Import Alert":
            score += 50 * recency_weight
        elif action.action_type == "Recall":
            score += 15 * recency_weight
            
    # Cap between 0 and 100
    final_score = max(0.0, min(100.0, score))
    
    # Determine Level
    if final_score >= 60:
        level = "High"
    elif final_score >= 30:
        level = "Medium"
    else:
        level = "Low"
        
    cmo.risk_score = final_score
    cmo.risk_level = level
    db.commit()
    
    return final_score, level

def update_all_cmo_risks(db: Session):
    cmos = db.query(models.CMO).all()
    for cmo in cmos:
        calculate_cmo_risk(db, cmo.id)
