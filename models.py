from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)

    working_days = Column(String, nullable=False, default="0,1,2,3,4")
    start_time = Column(String, nullable=False, default="08:00")
    end_time = Column(String, nullable=False, default="18:00")
    slot_duration_minutes = Column(Integer, nullable=False, default=60)
    capacity = Column(Integer, nullable=False, default=1)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(String, nullable=True)  # ISO datetime, string por simplicidade

    clients = relationship("Client", back_populates="business")
    appointments = relationship("Appointment", back_populates="business")
    blocked_slots = relationship("BlockedSlot", back_populates="business")
    services = relationship("Service", back_populates="business")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)

    business = relationship("Business", back_populates="clients")
    appointments = relationship("Appointment", back_populates="client")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    name = Column(String, nullable=False)           # Ex: "Corte + Barba"
    price = Column(Numeric(10, 2), nullable=False)   # Ex: 45.00
    duration_minutes = Column(Integer, nullable=False, default=60)  # Ex: 45

    business = relationship("Business", back_populates="services")
    appointments = relationship("Appointment", back_populates="service")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)

    business = relationship("Business", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")


class BlockedSlot(Base):
    __tablename__ = "blocked_slots"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=True)
    reason = Column(String, nullable=True)

    business = relationship("Business", back_populates="blocked_slots")