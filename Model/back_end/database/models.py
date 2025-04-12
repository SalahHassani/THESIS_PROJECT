from sqlalchemy import Column, Integer, String, ForeignKey, Text, Numeric, Date, TIMESTAMP, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default='Registered User', nullable=False)
    credits = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        CheckConstraint(role.in_(['Admin', 'Registered User']), name="check_role"),
    )

    comics = relationship("Comic", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    admin = relationship("Admin", uselist=False, back_populates="user", cascade="all, delete-orphan")

class Comic(Base):
    __tablename__ = "comics"

    comic_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    story_text = Column(Text, nullable=False)
    images_path = Column(Text, nullable=False)
    total_pages = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(total_pages > 0, name="check_total_pages"),
    )

    user = relationship("User", back_populates="comics")

class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    credits_added = Column(Integer, nullable=False)
    transaction_id = Column(Text, unique=True, nullable=False)
    payment_date = Column(TIMESTAMP, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(amount > 0, name="check_amount"),
        CheckConstraint(credits_added > 0, name="check_credits_added"),
    )

    user = relationship("User", back_populates="payments")

class Admin(Base):
    __tablename__ = "admins"

    admin_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    permissions = Column(Text, nullable=False)
    created_at = Column(Date, default=datetime.utcnow)

    user = relationship("User", back_populates="admin")