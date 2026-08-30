import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database.connection import get_db
from ..database.models import User
from ..services.auth_service import hash_password
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["User Management"])

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str
    organization: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None

class CreateUserIn(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    role: str = "USER"
    status: str = "ACTIVE"
    organization: Optional[str] = "NCPOR / MoES"

class UpdateUserIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    organization: Optional[str] = None

@router.get("", response_model=List[UserOut])
def get_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to list, search, and filter all users."""
    query = db.query(User)
    
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s), User.phone.ilike(s)))
        
    if role:
        query = query.filter(User.role == role.upper())
        
    if status_filter:
        query = query.filter(User.status == status_filter.upper())
        
    users = query.order_by(User.created_at.desc()).all()
    
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "status": u.status,
            "organization": u.organization,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None
        }
        for u in users
    ]

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    req: CreateUserIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to create a new user."""
    existing = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
        
    user = User(
        id=f"usr-{uuid.uuid4().hex[:8]}",
        name=req.name.strip(),
        email=req.email.strip().lower(),
        phone=req.phone,
        password_hash=hash_password(req.password),
        role=req.role.upper(),
        status=req.status.upper(),
        organization=req.organization or "NCPOR / MoES"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "organization": user.organization,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None
    }

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    req: UpdateUserIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to update user details, role, status, or password."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if req.name is not None:
        user.name = req.name.strip()
    if req.email is not None:
        user.email = req.email.strip().lower()
    if req.phone is not None:
        user.phone = req.phone
    if req.role is not None:
        user.role = req.role.upper()
    if req.status is not None:
        user.status = req.status.upper()
    if req.organization is not None:
        user.organization = req.organization
    if req.password:
        user.password_hash = hash_password(req.password)
        
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "organization": user.organization,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None
    }

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to delete a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"status": "SUCCESS", "message": f"User {user_id} deleted successfully"}
