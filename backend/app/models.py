from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class CMO(Base):
    __tablename__ = "cmos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    location = Column(String)
    fei_number = Column(String, unique=True, index=True) # FDA Establishment Identifier
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String, default="Unknown") # Low, Medium, High
    last_updated = Column(DateTime, default=datetime.utcnow)

    inspections = relationship("Inspection", back_populates="cmo", cascade="all, delete")
    enforcement_actions = relationship("EnforcementAction", back_populates="cmo", cascade="all, delete")

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    cmo_id = Column(Integer, ForeignKey("cmos.id"))
    inspection_date = Column(Date)
    classification = Column(String) # OAI, VAI, NAI
    form_483_issued = Column(String) # "Yes" or "No"
    observation_categories = Column(String) # Comma-separated categories (e.g. "Data Integrity, Sterility")
    
    cmo = relationship("CMO", back_populates="inspections")

class EnforcementAction(Base):
    __tablename__ = "enforcement_actions"

    id = Column(Integer, primary_key=True, index=True)
    cmo_id = Column(Integer, ForeignKey("cmos.id"))
    action_type = Column(String) # "Warning Letter", "Import Alert", "Recall"
    date_issued = Column(Date)
    description = Column(String)
    openfda_id = Column(String, nullable=True) # ID from openFDA if applicable
    
    cmo = relationship("CMO", back_populates="enforcement_actions")
