import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import User, hash_password, verify_password
from ..schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    UserAdminCreateRequest,
    UserUpdateRequest,
    AuthResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])

def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        email=user.email,
        organization=user.organization,
        role=user.role,
        status=user.status,
        created_at=user.created_at.isoformat() if user.created_at else None,
        last_login=user.last_login.isoformat() if user.last_login else None,
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user account into the persistent SQLite database."""
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.email.ilike(req.email.strip())) | (User.username.ilike(req.username.strip()))
    ).first()

    if existing_user:
        if existing_user.email.lower() == req.email.strip().lower():
            raise HTTPException(status_code=400, detail="An account with this email is already registered.")
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose another.")

    user_id = f"usr-{uuid.uuid4().hex[:8]}"
    new_user = User(
        id=user_id,
        username=req.username.strip(),
        name=req.name.strip(),
        email=req.email.strip().lower(),
        password_hash=hash_password(req.password),
        organization=req.organization.strip() if req.organization else "National Centre for Polar and Ocean Research",
        role=req.role or "Researcher",
        status="Active",
        created_at=datetime.now(timezone.utc),
        last_login=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = f"dhr-token-{uuid.uuid4().hex}"
    return AuthResponse(token=token, user=_to_user_response(new_user))

@router.post("/login", response_model=AuthResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates a user by email or username against the database."""
    identifier = req.username_or_email.strip().lower()
    user = db.query(User).filter(
        (User.email.ilike(identifier)) | (User.username.ilike(identifier))
    ).first()

    # If user not found directly, check demo aliases
    if not user:
        if identifier in ["dr_ananya", "dr_ananya@ncpor.gov.in", "researcher@ncpor.res.in", "researcher@example.org"]:
            user = db.query(User).filter(User.username == "dr_ananya").first()
        elif identifier in ["capt_menon", "captain@polarstar.gov.in", "capt_menon@navy.gov.in", "operator@example.org"]:
            user = db.query(User).filter(User.username == "capt_menon").first()
        elif identifier in ["admin", "admin@ncpor.gov.in", "admin@example.org"]:
            user = db.query(User).filter(User.role == "Admin").first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    # Check password with hash or demo passwords
    is_valid_pw = verify_password(req.password, user.password_hash)
    if not is_valid_pw:
        # Check known demo passwords
        if user.role == "Admin" and req.password in ["admin123", "admin"]:
            is_valid_pw = True
        elif user.username in ["dr_ananya", "ananya_gov", "researcher_mock"] and req.password in ["polar2026", "polar"]:
            is_valid_pw = True
        elif user.username in ["capt_menon", "capt_menon_navy", "operator_mock"] and req.password in ["captain2026", "vessel2026", "vessel", "captain"]:
            is_valid_pw = True

    if not is_valid_pw:
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    if user.status != "Active":
        raise HTTPException(status_code=403, detail="Account is suspended. Please contact NCPOR Mission Administrator.")

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = f"dhr-token-{uuid.uuid4().hex}"
    return AuthResponse(token=token, user=_to_user_response(user))

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    """Admin endpoint to retrieve all registered users from the database."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_to_user_response(u) for u in users]

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(req: UserAdminCreateRequest, db: Session = Depends(get_db)):
    """Admin endpoint to manually create a user."""
    existing_user = db.query(User).filter(
        (User.email.ilike(req.email.strip())) | (User.username.ilike(req.username.strip()))
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email or username already exists.")

    new_user = User(
        id=f"usr-{uuid.uuid4().hex[:8]}",
        username=req.username.strip(),
        name=req.name.strip(),
        email=req.email.strip().lower(),
        password_hash=hash_password(req.password),
        organization=req.organization.strip() if req.organization else "NCPOR Operations",
        role=req.role,
        status=req.status or "Active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _to_user_response(new_user)

@router.put("/users/{user_id}", response_model=UserResponse)
def admin_update_user(user_id: str, req: UserUpdateRequest, db: Session = Depends(get_db)):
    """Admin endpoint to update user details, role, status, or reset password."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.name is not None:
        user.name = req.name.strip()
    if req.email is not None:
        user.email = req.email.strip().lower()
    if req.organization is not None:
        user.organization = req.organization.strip()
    if req.role is not None:
        user.role = req.role
    if req.status is not None:
        user.status = req.status
    if req.password:
        user.password_hash = hash_password(req.password)

    db.commit()
    db.refresh(user)
    return _to_user_response(user)

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: str, db: Session = Depends(get_db)):
    """Admin endpoint to delete a user from the database."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(user)
    db.commit()
    return {"status": "SUCCESS", "message": f"User {user.username} ({user_id}) successfully deleted."}
