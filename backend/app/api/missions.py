import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import MissionVoyage
from ..schemas.schemas import MissionVoyageSchema, MissionVoyageCreateUpdate

router = APIRouter(prefix="/missions", tags=["Vessel Expedition & Voyage Control"])

def _to_mission_schema(m: MissionVoyage) -> MissionVoyageSchema:
    return MissionVoyageSchema(
        id=m.id,
        ship_name=m.ship_name,
        ship_no=m.ship_no,
        ship_ice_class=m.ship_ice_class,
        start_destination=m.start_destination,
        end_destination=m.end_destination,
        no_of_break_points=m.no_of_break_points,
        departure_time=m.departure_time,
        expected_arrival_time=m.expected_arrival_time,
        expected_travel_duration=m.expected_travel_duration,
        distance_nm=m.distance_nm,
        fuel_expected_tons=m.fuel_expected_tons,
        status=m.status,
    )

@router.get("", response_model=List[MissionVoyageSchema])
def get_all_missions(db: Session = Depends(get_db)):
    """Retrieves all active and planned expedition voyages with full vessel metadata."""
    missions = db.query(MissionVoyage).all()
    return [_to_mission_schema(m) for m in missions]

@router.post("", response_model=MissionVoyageSchema, status_code=status.HTTP_201_CREATED)
def create_mission(req: MissionVoyageCreateUpdate, db: Session = Depends(get_db)):
    """Creates a new vessel expedition mission."""
    mission_id = f"voyage-{uuid.uuid4().hex[:6]}"
    mission = MissionVoyage(
        id=mission_id,
        ship_name=req.ship_name,
        ship_no=req.ship_no,
        ship_ice_class=req.ship_ice_class,
        start_destination=req.start_destination,
        end_destination=req.end_destination,
        no_of_break_points=req.no_of_break_points,
        departure_time=req.departure_time,
        expected_arrival_time=req.expected_arrival_time,
        expected_travel_duration=req.expected_travel_duration,
        distance_nm=req.distance_nm or 2450.0,
        fuel_expected_tons=req.fuel_expected_tons or 184.2,
        status=req.status or "PLANNING",
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return _to_mission_schema(mission)

@router.put("/{mission_id}", response_model=MissionVoyageSchema)
def update_mission(mission_id: str, req: MissionVoyageCreateUpdate, db: Session = Depends(get_db)):
    """Updates active voyage parameters in real-time."""
    mission = db.query(MissionVoyage).filter(MissionVoyage.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission voyage not found.")

    mission.ship_name = req.ship_name
    mission.ship_no = req.ship_no
    mission.ship_ice_class = req.ship_ice_class
    mission.start_destination = req.start_destination
    mission.end_destination = req.end_destination
    mission.no_of_break_points = req.no_of_break_points
    mission.departure_time = req.departure_time
    mission.expected_arrival_time = req.expected_arrival_time
    mission.expected_travel_duration = req.expected_travel_duration
    if req.distance_nm is not None:
        mission.distance_nm = req.distance_nm
    if req.fuel_expected_tons is not None:
        mission.fuel_expected_tons = req.fuel_expected_tons
    if req.status is not None:
        mission.status = req.status

    db.commit()
    db.refresh(mission)
    return _to_mission_schema(mission)

@router.delete("/{mission_id}")
def delete_mission(mission_id: str, db: Session = Depends(get_db)):
    """Deletes a mission voyage record from the database."""
    mission = db.query(MissionVoyage).filter(MissionVoyage.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission voyage not found.")

    db.delete(mission)
    db.commit()
    return {"status": "SUCCESS", "message": f"Mission {mission_id} deleted."}
