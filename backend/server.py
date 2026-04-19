from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import uuid
import logging
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal

import asyncio
import hmac
import hashlib
import requests
import bcrypt
import jwt
import razorpay
import resend
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, get_session, init_db, SessionLocal
from models import User, Room as RoomModel, Student, Application, Complaint, Payment, PaymentOrder, UserSession

# ---------- Security ----------
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def generate_password(length: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ---------- Razorpay + Resend ----------
def get_razorpay_client():
    kid = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    ksec = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not kid or not ksec:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway not configured. Admin: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env",
        )
    return razorpay.Client(auth=(kid, ksec))


async def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        logging.info(f"[EMAIL DISABLED] to={to} subject={subject}")
        return False
    resend.api_key = api_key
    params = {
        "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logging.error(f"Email send failed to {to}: {e}")
        return False


def approval_email_html(name: str, phone: str, password: str, room: str, bed: int, room_type: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9;">
      <div style="background: #000; color: #fff; padding: 30px; border-radius: 12px 12px 0 0;">
        <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; opacity: 0.6; margin-bottom: 8px;">WIT Boys Hostel / 2026</div>
        <h1 style="margin: 0; font-size: 32px; letter-spacing: -1px;">Welcome, {name}!</h1>
        <p style="opacity: 0.8; margin-top: 12px;">Your application has been approved.</p>
      </div>
      <div style="background: #fff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: 0;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px;">Your allotment</h2>
        <table style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; color: #666; font-size: 13px;">Room</td><td style="padding: 10px 0; text-align: right; font-weight: 700;">#{room}</td></tr>
          <tr><td style="padding: 10px 0; color: #666; font-size: 13px; border-top: 1px solid #eee;">Bed</td><td style="padding: 10px 0; text-align: right; font-weight: 700; border-top: 1px solid #eee;">#{bed}</td></tr>
          <tr><td style="padding: 10px 0; color: #666; font-size: 13px; border-top: 1px solid #eee;">Type</td><td style="padding: 10px 0; text-align: right; font-weight: 700; border-top: 1px solid #eee;">{room_type}</td></tr>
        </table>
        <h2 style="margin: 24px 0 16px 0; font-size: 20px;">Your login credentials</h2>
        <div style="background: #fff3e6; border: 1px solid #ffb366; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace;">
          <div style="margin-bottom: 10px;"><strong>Phone:</strong> {phone}</div>
          <div><strong>Password:</strong> <span style="background: #ff6600; color: white; padding: 3px 8px; border-radius: 4px;">{password}</span></div>
        </div>
        <p style="color: #666; font-size: 13px; margin-top: 20px;">Login at the student portal using your phone + password.</p>
        <p style="color: #666; font-size: 13px;">See you at the hostel,<br><strong>WIT Boys Admin</strong></p>
      </div>
    </div>
    """


def waitlist_confirmation_html(name: str, app_id: str, amount: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #000; color: #fff; padding: 30px; border-radius: 12px;">
        <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; opacity: 0.6; margin-bottom: 8px;">WIT Boys Hostel / Waitlist</div>
        <h1 style="margin: 0; font-size: 28px;">You're on the priority list, {name}!</h1>
        <p style="opacity: 0.8; margin-top: 12px;">Refundable deposit of ₹{amount} received. Application ID: <code>{app_id[:8]}</code></p>
      </div>
    </div>
    """


# ---------- Pydantic (API) ----------
class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class StudentRegisterIn(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str


class StudentLoginIn(BaseModel):
    identifier: str
    password: str


class RoomIn(BaseModel):
    room_number: str
    room_type: Literal["2 Seater", "3 Seater", "4 Seater"]
    fees: float


class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[Literal["2 Seater", "3 Seater", "4 Seater"]] = None
    fees: Optional[float] = None


class StudentIn(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    preferred_room_type: Optional[Literal["2 Seater", "3 Seater", "4 Seater"]] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    fees_status: Optional[Literal["Paid", "Pending"]] = None


class ApplicationIn(BaseModel):
    course: str
    year: str
    percentage: float
    backlogs: int
    preferred_room_type: Literal["2 Seater", "3 Seater", "4 Seater"]


class ApplicationStatusIn(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


class ApproveApplicationIn(BaseModel):
    override_room_type: Optional[Literal["2 Seater", "3 Seater", "4 Seater"]] = None


class PaymentIn(BaseModel):
    student_id: str
    amount: float
    method: Optional[str] = "Cash"


class ComplaintIn(BaseModel):
    title: str
    description: str
    category: Optional[str] = "General"


class ComplaintStatusUpdate(BaseModel):
    status: Literal["Pending", "In Progress", "Resolved"]


# ---------- Row → dict (API / CSV same shape as old Mongo) ----------
def _dt_iso(v: Optional[datetime]) -> Optional[str]:
    if v is None:
        return None
    if v.tzinfo is None:
        v = v.replace(tzinfo=timezone.utc)
    return v.isoformat()


def user_public_dict(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "phone": u.phone,
        "student_id": u.student_id,
        "picture": u.picture,
    }


def room_dict(r: RoomModel) -> dict:
    return {
        "id": r.id,
        "room_number": r.room_number,
        "room_type": r.room_type,
        "total_beds": r.total_beds,
        "occupied_beds": r.occupied_beds,
        "fees": r.fees,
        "created_at": _dt_iso(r.created_at) or "",
    }


def student_dict(s: Student) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "phone": s.phone,
        "email": s.email,
        "room_id": s.room_id,
        "room_number": s.room_number,
        "room_type": s.room_type,
        "bed_number": s.bed_number,
        "fees_status": s.fees_status,
        "fees_amount": s.fees_amount,
        "application_id": s.application_id,
        "user_id": s.user_id,
        "course": s.course,
        "year": s.year,
        "created_at": _dt_iso(s.created_at) or "",
    }


def application_dict(a: Application) -> dict:
    return {
        "id": a.id,
        "user_id": a.user_id,
        "name": a.name,
        "email": a.email,
        "phone": a.phone,
        "course": a.course,
        "year": a.year,
        "percentage": a.percentage,
        "backlogs": a.backlogs,
        "preferred_room_type": a.preferred_room_type,
        "suggested_room_type": a.suggested_room_type,
        "status": a.status,
        "reject_reason": a.reject_reason,
        "assigned_room_id": a.assigned_room_id,
        "assigned_room_number": a.assigned_room_number,
        "assigned_room_type": a.assigned_room_type,
        "bed_number": a.bed_number,
        "merit_score": a.merit_score,
        "created_at": _dt_iso(a.created_at) or "",
        "override_room_type": a.override_room_type,
        "student_id": a.student_id,
        "approved_at": _dt_iso(a.approved_at),
        "waitlist_paid": a.waitlist_paid,
        "waitlist_paid_at": _dt_iso(a.waitlist_paid_at),
        "waitlist_payment_id": a.waitlist_payment_id,
        "priority_score": a.priority_score,
    }


def complaint_dict(c: Complaint) -> dict:
    return {
        "id": c.id,
        "student_id": c.student_id,
        "student_name": c.student_name,
        "room_number": c.room_number,
        "title": c.title,
        "description": c.description,
        "category": c.category,
        "status": c.status,
        "created_at": _dt_iso(c.created_at) or "",
        "updated_at": _dt_iso(c.updated_at) or "",
    }


def payment_dict(p: Payment) -> dict:
    return {
        "id": p.id,
        "student_id": p.student_id,
        "student_name": p.student_name,
        "amount": p.amount,
        "status": p.status,
        "method": p.method,
        "payment_id": p.payment_id,
        "order_id": p.order_id,
        "payment_date": _dt_iso(p.payment_date) or "",
    }


# ---------- Auth ----------
async def get_current_user(request: Request, session: AsyncSession = Depends(get_session)) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer ") and auth[7:].startswith("sess_"):
            session_token = auth[7:]
    if session_token:
        r = await session.execute(select(UserSession).where(UserSession.session_token == session_token))
        srow = r.scalar_one_or_none()
        if srow:
            exp = srow.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp >= datetime.now(timezone.utc):
                ur = await session.execute(select(User).where(User.id == srow.user_id))
                u = ur.scalar_one_or_none()
                if u:
                    return user_public_dict(u)

    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    ur = await session.execute(select(User).where(User.id == payload["sub"]))
    u = ur.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=401, detail="User not found")
    return user_public_dict(u)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_student(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return user


# ---------- App ----------
app = FastAPI(title="WIT Boys Hostel API")
api = APIRouter(prefix="/api")


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )


@api.get("/")
async def root():
    return {"message": "WIT Boys Hostel API"}


@api.post("/auth/admin/login")
async def admin_login(body: AdminLoginIn, response: Response, session: AsyncSession = Depends(get_session)):
    r = await session.execute(
        select(User).where(and_(User.email == body.email.lower(), User.role == "admin"))
    )
    user = r.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id, "admin")
    set_auth_cookie(response, token)
    await session.commit()
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": "admin"},
    }


@api.post("/auth/student/register")
async def student_register(body: StudentRegisterIn, response: Response, session: AsyncSession = Depends(get_session)):
    email = body.email.lower().strip()
    phone = body.phone.strip()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not phone.isdigit() or len(phone) < 7:
        raise HTTPException(status_code=400, detail="Valid phone (digits only) required")

    r = await session.execute(select(User).where(or_(User.email == email, User.phone == phone)))
    if r.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Account already exists with this email or phone. Please login.",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    session.add(
        User(
            id=user_id,
            email=email,
            phone=phone,
            name=body.name,
            role="student",
            password_hash=hash_password(body.password),
            auth_provider="password",
            created_at=now,
        )
    )
    token = create_access_token(user_id, "student")
    set_auth_cookie(response, token)
    await session.commit()
    return {
        "token": token,
        "user": {"id": user_id, "email": email, "name": body.name, "phone": phone, "role": "student"},
    }


@api.post("/auth/student/login")
async def student_login(body: StudentLoginIn, response: Response, session: AsyncSession = Depends(get_session)):
    identifier = body.identifier.strip().lower()
    r = await session.execute(
        select(User).where(
            and_(
                User.role == "student",
                or_(User.email == identifier, User.phone == body.identifier.strip()),
            )
        )
    )
    user = r.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")
    token = create_access_token(user.id, "student")
    set_auth_cookie(response, token)
    await session.commit()
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "role": "student",
            "email": user.email,
            "phone": user.phone,
            "student_id": user.student_id,
        },
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response, session: AsyncSession = Depends(get_session)):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    emergent_url = os.environ.get(
        "EMERGENT_AUTH_URL",
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
    )
    try:
        r = await asyncio.to_thread(requests.get, emergent_url, headers={"X-Session-ID": session_id}, timeout=10)
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Emergent auth fetch failed: {e}")
        raise HTTPException(status_code=502, detail="Auth service unreachable")

    email = data.get("email", "").lower()
    name = data.get("name") or "Student"
    picture = data.get("picture")
    session_token = data.get("session_token")

    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Invalid session data")

    ur = await session.execute(select(User).where(User.email == email))
    user = ur.scalar_one_or_none()
    if user:
        user_id = user.id
        user_role = user.role
        user.name = name
        user.picture = picture
    else:
        ar = await session.execute(
            select(Application).where(and_(Application.email == email, Application.status == "Approved"))
        )
        app_doc = ar.scalar_one_or_none()
        if not app_doc:
            raise HTTPException(
                status_code=403,
                detail="No hostel account found for this Google email. Please apply first.",
            )
        sr = await session.execute(select(Student).where(Student.application_id == app_doc.id))
        student = sr.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=500, detail="Student record missing. Contact admin.")
        user_id = str(uuid.uuid4())
        user_role = "student"
        now = datetime.now(timezone.utc)
        session.add(
            User(
                id=user_id,
                email=email,
                name=name,
                picture=picture,
                phone=app_doc.phone,
                role="student",
                student_id=student.id,
                auth_provider="google",
                created_at=now,
            )
        )
        student.user_id = user_id

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    now = datetime.now(timezone.utc)
    sr2 = await session.execute(select(UserSession).where(UserSession.session_token == session_token))
    existing_s = sr2.scalar_one_or_none()
    if existing_s:
        existing_s.user_id = user_id
        existing_s.expires_at = expires_at
    else:
        session.add(
            UserSession(session_token=session_token, user_id=user_id, expires_at=expires_at, created_at=now)
        )

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )
    await session.commit()
    return {
        "ok": True,
        "session_token": session_token,
        "user": {"id": user_id, "email": email, "name": name, "picture": picture, "role": user_role},
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Rooms ----------
def _room_beds(room_type: str) -> int:
    return {"2 Seater": 2, "3 Seater": 3, "4 Seater": 4}[room_type]


@api.post("/rooms")
async def create_room(body: RoomIn, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(RoomModel).where(RoomModel.room_number == body.room_number))
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Room number already exists")
    now = datetime.now(timezone.utc)
    doc = RoomModel(
        id=str(uuid.uuid4()),
        room_number=body.room_number,
        room_type=body.room_type,
        total_beds=_room_beds(body.room_type),
        occupied_beds=0,
        fees=body.fees,
        created_at=now,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return room_dict(doc)


@api.get("/rooms")
async def list_rooms(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(RoomModel).order_by(RoomModel.room_number))
    rooms = [room_dict(x) for x in r.scalars().all()]
    return rooms


@api.get("/rooms/public")
async def list_rooms_public(session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(RoomModel))
    return [room_dict(x) for x in r.scalars().all()]


@api.patch("/rooms/{room_id}")
async def update_room(
    room_id: str, body: RoomUpdate, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)
):
    r = await session.execute(select(RoomModel).where(RoomModel.id == room_id))
    room = r.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    data = body.model_dump(exclude_unset=True)
    if "room_type" in data and data["room_type"]:
        room.room_type = data["room_type"]
        room.total_beds = _room_beds(data["room_type"])
    if "room_number" in data and data["room_number"] is not None:
        room.room_number = data["room_number"]
    if "fees" in data and data["fees"] is not None:
        room.fees = data["fees"]
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await session.commit()
    await session.refresh(room)
    return room_dict(room)


@api.delete("/rooms/{room_id}")
async def delete_room(room_id: str, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(RoomModel).where(RoomModel.id == room_id))
    room = r.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.occupied_beds > 0:
        raise HTTPException(status_code=400, detail="Cannot delete: room has students")
    await session.delete(room)
    await session.commit()
    return {"ok": True}


async def allocate_room(session: AsyncSession, preferred_type: str):
    q = (
        select(RoomModel)
        .where(and_(RoomModel.room_type == preferred_type, RoomModel.occupied_beds < RoomModel.total_beds))
        .order_by(RoomModel.room_number)
        .limit(1)
    )
    r = await session.execute(q)
    room = r.scalar_one_or_none()
    if not room:
        q2 = (
            select(RoomModel)
            .where(RoomModel.occupied_beds < RoomModel.total_beds)
            .order_by(RoomModel.room_number)
            .limit(1)
        )
        r2 = await session.execute(q2)
        room = r2.scalar_one_or_none()
    if not room:
        return None, None
    bed_number = room.occupied_beds + 1
    room.occupied_beds += 1
    await session.flush()
    return room.id, bed_number


async def deallocate_bed(session: AsyncSession, room_id: Optional[str]):
    if not room_id:
        return
    r = await session.execute(select(RoomModel).where(and_(RoomModel.id == room_id, RoomModel.occupied_beds > 0)))
    room = r.scalar_one_or_none()
    if room:
        room.occupied_beds -= 1
        await session.flush()


# ---------- Students ----------
@api.post("/students")
async def create_student(body: StudentIn, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    preferred = body.preferred_room_type or "4 Seater"
    room_id, bed = await allocate_room(session, preferred)
    if not room_id:
        raise HTTPException(status_code=400, detail="No rooms available")
    rr = await session.execute(select(RoomModel).where(RoomModel.id == room_id))
    room = rr.scalar_one()
    now = datetime.now(timezone.utc)
    doc = Student(
        id=str(uuid.uuid4()),
        name=body.name,
        phone=body.phone,
        email=str(body.email) if body.email else None,
        room_id=room_id,
        room_number=room.room_number,
        room_type=room.room_type,
        bed_number=bed,
        fees_status="Pending",
        fees_amount=room.fees,
        application_id=None,
        user_id=None,
        created_at=now,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return student_dict(doc)


@api.get("/students")
async def list_students(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student))
    return [student_dict(x) for x in r.scalars().all()]


@api.patch("/students/{student_id}")
async def update_student(
    student_id: str, body: StudentUpdate, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)
):
    r = await session.execute(select(Student).where(Student.id == student_id))
    student = r.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    d = body.model_dump(exclude_unset=True)
    if not d:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "name" in d and d["name"] is not None:
        student.name = d["name"]
    if "phone" in d and d["phone"] is not None:
        student.phone = d["phone"]
    if "email" in d:
        student.email = str(d["email"]) if d["email"] is not None else None
    if "fees_status" in d and d["fees_status"] is not None:
        student.fees_status = d["fees_status"]
    await session.commit()
    await session.refresh(student)
    return student_dict(student)


@api.delete("/students/{student_id}")
async def delete_student(student_id: str, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student).where(Student.id == student_id))
    student = r.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await deallocate_bed(session, student.room_id)
    uid = student.user_id
    aid = student.application_id
    await session.delete(student)
    if uid:
        ur = await session.execute(select(User).where(User.id == uid))
        u = ur.scalar_one_or_none()
        if u:
            await session.delete(u)
    if aid:
        ar = await session.execute(select(Application).where(Application.id == aid))
        app = ar.scalar_one_or_none()
        if app:
            app.status = "Removed"
    await session.commit()
    return {"ok": True}


@api.get("/students/me")
async def my_student_record(user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student).where(Student.user_id == user["id"]))
    student = r.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    return student_dict(student)


# ---------- Applications ----------
def suggest_room_type(percentage: float) -> str:
    if percentage >= 80:
        return "2 Seater"
    if percentage >= 60:
        return "3 Seater"
    return "4 Seater"


@api.post("/applications")
async def submit_application(body: ApplicationIn, user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    if body.percentage < 0 or body.percentage > 100:
        raise HTTPException(status_code=400, detail="Percentage must be between 0 and 100")
    if body.backlogs < 0:
        raise HTTPException(status_code=400, detail="Backlogs cannot be negative")

    r = await session.execute(
        select(Application).where(
            and_(
                Application.user_id == user["id"],
                Application.status.in_(["Pending", "Approved"]),
            )
        )
    )
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have an active application. Check your dashboard.")

    suggested = suggest_room_type(body.percentage)
    auto_status = "Rejected" if body.backlogs > 2 else "Pending"
    reject_reason = "More than 2 backlogs" if auto_status == "Rejected" else None
    now = datetime.now(timezone.utc)
    ur = await session.execute(select(User).where(User.id == user["id"]))
    u = ur.scalar_one()
    doc = Application(
        id=str(uuid.uuid4()),
        user_id=user["id"],
        name=u.name,
        email=(u.email or "").lower() if u.email else None,
        phone=u.phone,
        course=body.course,
        year=body.year,
        percentage=body.percentage,
        backlogs=body.backlogs,
        preferred_room_type=body.preferred_room_type,
        suggested_room_type=suggested,
        status=auto_status,
        reject_reason=reject_reason,
        merit_score=body.percentage - (body.backlogs * 10),
        created_at=now,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return application_dict(doc)


@api.get("/applications/me")
async def my_application(user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    r = await session.execute(
        select(Application).where(Application.user_id == user["id"]).order_by(Application.created_at.desc()).limit(1)
    )
    app = r.scalar_one_or_none()
    return application_dict(app) if app else None


@api.post("/applications/status")
async def check_status(body: ApplicationStatusIn, session: AsyncSession = Depends(get_session)):
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Provide email or phone")
    conds = []
    if body.email:
        conds.append(Application.email == body.email.lower())
    if body.phone:
        conds.append(Application.phone == body.phone)
    r = await session.execute(select(Application).where(or_(*conds)).order_by(Application.created_at.desc()).limit(1))
    app = r.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="No application found")
    return application_dict(app)


@api.get("/applications")
async def list_applications(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Application))
    return [application_dict(x) for x in r.scalars().all()]


@api.post("/applications/{app_id}/approve")
async def approve_application(
    app_id: str, body: ApproveApplicationIn, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)
):
    r = await session.execute(select(Application).where(Application.id == app_id))
    app_doc = r.scalar_one_or_none()
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_doc.status == "Approved":
        raise HTTPException(status_code=400, detail="Already approved")

    room_type = body.override_room_type or app_doc.suggested_room_type
    room_id, bed = await allocate_room(session, room_type)
    if not room_id:
        raise HTTPException(status_code=400, detail=f"No {room_type} rooms available")
    rr = await session.execute(select(RoomModel).where(RoomModel.id == room_id))
    room = rr.scalar_one()

    existing_user_id = app_doc.user_id
    raw_password = None
    if existing_user_id:
        user_id = existing_user_id
    else:
        raw_password = generate_password(10)
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        session.add(
            User(
                id=user_id,
                name=app_doc.name,
                email=app_doc.email,
                phone=app_doc.phone,
                role="student",
                password_hash=hash_password(raw_password),
                auth_provider="password",
                created_at=now,
            )
        )
        app_doc.user_id = user_id
        await session.flush()

    ur = await session.execute(select(User).where(User.id == user_id))
    urow = ur.scalar_one()
    student_id = str(uuid.uuid4())
    urow.student_id = student_id
    now = datetime.now(timezone.utc)
    student_doc = Student(
        id=student_id,
        name=app_doc.name,
        email=app_doc.email,
        phone=app_doc.phone or "",
        course=app_doc.course,
        year=app_doc.year,
        room_id=room_id,
        room_number=room.room_number,
        room_type=room.room_type,
        bed_number=bed,
        fees_status="Pending",
        fees_amount=room.fees,
        application_id=app_id,
        user_id=user_id,
        created_at=now,
    )
    session.add(student_doc)

    app_doc.status = "Approved"
    app_doc.assigned_room_id = room_id
    app_doc.assigned_room_number = room.room_number
    app_doc.assigned_room_type = room.room_type
    app_doc.bed_number = bed
    app_doc.override_room_type = body.override_room_type
    app_doc.student_id = student_id
    app_doc.approved_at = now

    await session.commit()

    if app_doc.email:
        asyncio.create_task(
            send_email(
                to=app_doc.email,
                subject=f"🎉 WIT Boys Hostel — Room #{room.room_number} allotted to you",
                html=approval_email_html(
                    app_doc.name,
                    app_doc.phone or "",
                    raw_password or "(use your signup password)",
                    room.room_number,
                    bed,
                    room.room_type,
                ),
            )
        )

    return {
        "ok": True,
        "student_id": student_id,
        "room_number": room.room_number,
        "room_type": room.room_type,
        "bed_number": bed,
        "login_credentials": (
            {"phone": app_doc.phone, "password": raw_password}
            if raw_password
            else {"phone": app_doc.phone, "password": "(student's existing signup password)"}
        ),
    }


@api.post("/applications/{app_id}/reject")
async def reject_application(app_id: str, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Application).where(and_(Application.id == app_id, Application.status == "Pending")))
    app = r.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or not pending")
    app.status = "Rejected"
    app.reject_reason = "Admin review"
    await session.commit()
    return {"ok": True}


# ---------- Payments ----------
@api.get("/payments/config")
async def payments_config():
    return {
        "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", "").strip(),
        "waitlist_amount": int(os.environ.get("WAITLIST_DEPOSIT_AMOUNT", "500")),
        "enabled": bool(os.environ.get("RAZORPAY_KEY_ID", "").strip()),
    }


@api.post("/payments/fees/create-order")
async def create_fees_order(user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student).where(Student.user_id == user["id"]))
    student = r.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    if student.fees_status == "Paid":
        raise HTTPException(status_code=400, detail="Fees already paid")
    amount = int(student.fees_amount or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid fees amount")

    client = get_razorpay_client()
    order = await asyncio.to_thread(
        client.order.create,
        {
            "amount": amount * 100,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"type": "hostel_fees", "student_id": student.id},
        },
    )
    now = datetime.now(timezone.utc)
    session.add(
        PaymentOrder(
            order_id=order["id"],
            type="hostel_fees",
            student_id=student.id,
            amount=float(amount),
            status="created",
            created_at=now,
        )
    )
    await session.commit()
    return {
        "order_id": order["id"],
        "amount": amount * 100,
        "currency": "INR",
        "student_name": student.name,
        "student_email": student.email,
        "student_phone": student.phone,
    }


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not secret:
        return False
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@api.post("/payments/fees/verify")
async def verify_fees_payment(body: VerifyPaymentIn, user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    if not _verify_razorpay_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    r = await session.execute(
        select(PaymentOrder).where(
            and_(PaymentOrder.order_id == body.razorpay_order_id, PaymentOrder.type == "hostel_fees")
        )
    )
    order = r.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    sr = await session.execute(select(Student).where(Student.user_id == user["id"]))
    student = sr.scalar_one_or_none()
    if not student or student.id != order.student_id:
        raise HTTPException(status_code=403, detail="Order mismatch")
    now = datetime.now(timezone.utc)
    payment_doc = Payment(
        id=str(uuid.uuid4()),
        student_id=student.id,
        student_name=student.name,
        amount=order.amount,
        status="Paid",
        method="Razorpay",
        payment_id=body.razorpay_payment_id,
        order_id=body.razorpay_order_id,
        payment_date=now,
    )
    session.add(payment_doc)
    student.fees_status = "Paid"
    order.status = "paid"
    order.payment_id = body.razorpay_payment_id
    await session.commit()
    return {"ok": True, "payment": payment_dict(payment_doc)}


class WaitlistOrderIn(BaseModel):
    application_id: str


@api.post("/waitlist/create-order")
async def create_waitlist_order(body: WaitlistOrderIn, session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Application).where(Application.id == body.application_id))
    app_doc = r.scalar_one_or_none()
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_doc.status != "Pending":
        raise HTTPException(status_code=400, detail="Waitlist only available for pending applications")
    if app_doc.waitlist_paid:
        raise HTTPException(status_code=400, detail="Already on priority waitlist")

    amount = int(os.environ.get("WAITLIST_DEPOSIT_AMOUNT", "500"))
    client = get_razorpay_client()
    order = await asyncio.to_thread(
        client.order.create,
        {
            "amount": amount * 100,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"type": "waitlist_deposit", "application_id": app_doc.id},
        },
    )
    now = datetime.now(timezone.utc)
    session.add(
        PaymentOrder(
            order_id=order["id"],
            type="waitlist_deposit",
            application_id=app_doc.id,
            amount=float(amount),
            status="created",
            created_at=now,
        )
    )
    await session.commit()
    return {
        "order_id": order["id"],
        "amount": amount * 100,
        "currency": "INR",
        "applicant_name": app_doc.name,
        "applicant_email": app_doc.email,
        "applicant_phone": app_doc.phone,
    }


class VerifyWaitlistIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    application_id: str


@api.post("/waitlist/verify")
async def verify_waitlist(body: VerifyWaitlistIn, session: AsyncSession = Depends(get_session)):
    if not _verify_razorpay_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    r = await session.execute(
        select(PaymentOrder).where(
            and_(PaymentOrder.order_id == body.razorpay_order_id, PaymentOrder.type == "waitlist_deposit")
        )
    )
    order = r.scalar_one_or_none()
    if not order or order.application_id != body.application_id:
        raise HTTPException(status_code=404, detail="Order mismatch")
    ar = await session.execute(select(Application).where(Application.id == body.application_id))
    app_doc = ar.scalar_one_or_none()
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    now = datetime.now(timezone.utc)
    app_doc.waitlist_paid = True
    app_doc.waitlist_paid_at = now
    app_doc.waitlist_payment_id = body.razorpay_payment_id
    app_doc.priority_score = (app_doc.merit_score or 0) + 50
    order.status = "paid"
    order.payment_id = body.razorpay_payment_id
    await session.commit()

    if app_doc.email:
        asyncio.create_task(
            send_email(
                to=app_doc.email,
                subject="WIT Boys Hostel — You're on the priority waitlist",
                html=waitlist_confirmation_html(app_doc.name, app_doc.id, int(order.amount)),
            )
        )
    return {"ok": True}


@api.get("/payments")
async def list_payments(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Payment))
    return [payment_dict(x) for x in r.scalars().all()]


@api.post("/payments")
async def record_payment(body: PaymentIn, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student).where(Student.id == body.student_id))
    student = r.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    now = datetime.now(timezone.utc)
    doc = Payment(
        id=str(uuid.uuid4()),
        student_id=body.student_id,
        student_name=student.name,
        amount=body.amount,
        status="Paid",
        method=body.method or "Cash",
        payment_date=now,
    )
    session.add(doc)
    student.fees_status = "Paid"
    await session.commit()
    await session.refresh(doc)
    return payment_dict(doc)


# ---------- Complaints ----------
@api.post("/complaints")
async def submit_complaint(body: ComplaintIn, user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student).where(Student.user_id == user["id"]))
    student = r.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    now = datetime.now(timezone.utc)
    doc = Complaint(
        id=str(uuid.uuid4()),
        student_id=student.id,
        student_name=student.name,
        room_number=student.room_number,
        title=body.title,
        description=body.description,
        category=body.category or "General",
        status="Pending",
        created_at=now,
        updated_at=now,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return complaint_dict(doc)


@api.get("/complaints")
async def list_complaints(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Complaint))
    return [complaint_dict(x) for x in r.scalars().all()]


@api.get("/complaints/me")
async def my_complaints(user: dict = Depends(require_student), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student).where(Student.user_id == user["id"]))
    student = r.scalar_one_or_none()
    if not student:
        return []
    r2 = await session.execute(select(Complaint).where(Complaint.student_id == student.id))
    return [complaint_dict(x) for x in r2.scalars().all()]


@api.patch("/complaints/{cid}")
async def update_complaint(
    cid: str, body: ComplaintStatusUpdate, _: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)
):
    r = await session.execute(select(Complaint).where(Complaint.id == cid))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    c.status = body.status
    c.updated_at = datetime.now(timezone.utc)
    await session.commit()
    return {"ok": True}


# ---------- Dashboard ----------
@api.get("/dashboard/stats")
async def dashboard_stats(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    total_students = (await session.execute(select(func.count()).select_from(Student))).scalar() or 0
    total_rooms = (await session.execute(select(func.count()).select_from(RoomModel))).scalar() or 0
    agg = await session.execute(
        select(func.coalesce(func.sum(RoomModel.total_beds), 0), func.coalesce(func.sum(RoomModel.occupied_beds), 0))
    )
    row = agg.one()
    total_beds = int(row[0])
    occupied_beds = int(row[1])
    pending_complaints = (
        await session.execute(select(func.count()).select_from(Complaint).where(Complaint.status == "Pending"))
    ).scalar() or 0
    in_progress_complaints = (
        await session.execute(select(func.count()).select_from(Complaint).where(Complaint.status == "In Progress"))
    ).scalar() or 0
    pending_applications = (
        await session.execute(select(func.count()).select_from(Application).where(Application.status == "Pending"))
    ).scalar() or 0
    rev = await session.execute(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "Paid"))
    revenue = float(rev.scalar() or 0)

    by_type_r = await session.execute(
        select(RoomModel.room_type, func.sum(RoomModel.total_beds), func.sum(RoomModel.occupied_beds)).group_by(RoomModel.room_type)
    )
    by_type = [{"type": t, "total": int(tb), "occupied": int(ob)} for t, tb, ob in by_type_r.all()]

    return {
        "total_students": total_students,
        "total_rooms": total_rooms,
        "total_beds": total_beds,
        "available_beds": total_beds - occupied_beds,
        "occupied_beds": occupied_beds,
        "pending_complaints": pending_complaints,
        "in_progress_complaints": in_progress_complaints,
        "pending_applications": pending_applications,
        "revenue": revenue,
        "room_type_breakdown": by_type,
    }


def _csv_response(rows: list, filename: str, fieldnames: list):
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api.get("/export/students")
async def export_students(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Student))
    rows = [student_dict(x) for x in r.scalars().all()]
    return _csv_response(
        rows,
        "students.csv",
        [
            "id",
            "name",
            "phone",
            "email",
            "room_number",
            "room_type",
            "bed_number",
            "fees_status",
            "fees_amount",
            "created_at",
        ],
    )


@api.get("/export/applications")
async def export_applications(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Application))
    rows = [application_dict(x) for x in r.scalars().all()]
    return _csv_response(
        rows,
        "applications.csv",
        [
            "id",
            "name",
            "email",
            "phone",
            "course",
            "year",
            "percentage",
            "backlogs",
            "preferred_room_type",
            "suggested_room_type",
            "status",
            "assigned_room_number",
            "bed_number",
            "merit_score",
            "created_at",
        ],
    )


@api.get("/export/payments")
async def export_payments(_: dict = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    r = await session.execute(select(Payment))
    rows = [payment_dict(x) for x in r.scalars().all()]
    return _csv_response(rows, "payments.csv", ["id", "student_id", "student_name", "amount", "status", "method", "payment_date"])


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await init_db()
    async with SessionLocal() as session:
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@witboys.com").lower()
        admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
        r = await session.execute(select(User).where(and_(User.email == admin_email, User.role == "admin")))
        existing = r.scalar_one_or_none()
        if not existing:
            session.add(
                User(
                    id=str(uuid.uuid4()),
                    email=admin_email,
                    password_hash=hash_password(admin_password),
                    name="Admin",
                    role="admin",
                    auth_provider="password",
                    created_at=datetime.now(timezone.utc),
                )
            )
            logger.info("Seeded default admin user")
        else:
            if not verify_password(admin_password, existing.password_hash or ""):
                existing.password_hash = hash_password(admin_password)
                logger.info("Updated admin password from env")

        rc = (await session.execute(select(func.count()).select_from(RoomModel))).scalar() or 0
        if rc == 0:
            now = datetime.now(timezone.utc)
            demo_rooms = [
                ("101", "2 Seater", 45000),
                ("102", "2 Seater", 45000),
                ("201", "3 Seater", 35000),
                ("202", "3 Seater", 35000),
                ("203", "3 Seater", 35000),
                ("301", "4 Seater", 28000),
                ("302", "4 Seater", 28000),
                ("303", "4 Seater", 28000),
            ]
            for num, rt, fees in demo_rooms:
                session.add(
                    RoomModel(
                        id=str(uuid.uuid4()),
                        room_number=num,
                        room_type=rt,
                        total_beds=_room_beds(rt),
                        occupied_beds=0,
                        fees=fees,
                        created_at=now,
                    )
                )
            logger.info("Seeded demo rooms")
        await session.commit()


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
