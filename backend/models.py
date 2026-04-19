"""SQLAlchemy ORM models — mirrors schema.sql."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    picture: Mapped[str | None] = mapped_column(Text, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="password")
    student_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    room_number: Mapped[str] = mapped_column(String(32), unique=True)
    room_type: Mapped[str] = mapped_column(String(32))
    total_beds: Mapped[int] = mapped_column(Integer, default=0)
    occupied_beds: Mapped[int] = mapped_column(Integer, default=0)
    fees: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(64))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"))
    room_number: Mapped[str] = mapped_column(String(32))
    room_type: Mapped[str] = mapped_column(String(32))
    bed_number: Mapped[int] = mapped_column(Integer)
    fees_status: Mapped[str] = mapped_column(String(32), default="Pending")
    fees_amount: Mapped[float] = mapped_column(Float, default=0)
    application_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    course: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    course: Mapped[str] = mapped_column(String(255))
    year: Mapped[str] = mapped_column(String(64))
    percentage: Mapped[float] = mapped_column(Float)
    backlogs: Mapped[int] = mapped_column(Integer, default=0)
    preferred_room_type: Mapped[str] = mapped_column(String(32))
    suggested_room_type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="Pending")
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_room_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    assigned_room_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    assigned_room_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bed_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    merit_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    override_room_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    student_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    waitlist_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    waitlist_paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    waitlist_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    priority_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36))
    student_name: Mapped[str] = mapped_column(String(255))
    room_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(128), default="General")
    status: Mapped[str] = mapped_column(String(32), default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36))
    student_name: Mapped[str] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32))
    method: Mapped[str] = mapped_column(String(64))
    payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    order_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    type: Mapped[str] = mapped_column(String(64))
    student_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    application_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32))
    payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UserSession(Base):
    __tablename__ = "user_sessions"

    session_token: Mapped[str] = mapped_column(String(512), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
