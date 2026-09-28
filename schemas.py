import re
from pydantic import BaseModel, EmailStr, field_validator
from decimal import Decimal

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

class BusinessCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    slug: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres.")
        return v

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v):
        v = v.strip().lower()
        if not SLUG_RE.match(v):
            raise ValueError(
                "O link personalizado só pode ter letras minúsculas, números e hífens "
                "(ex: barbearia-do-ze)."
            )
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("O nome do estabelecimento não pode ficar vazio.")
        return v

class BusinessLogin(BaseModel):
    email: EmailStr
    password: str

class ClientCreate(BaseModel):
    business_id: int
    name: str
    phone: str

    @field_validator("name", "phone")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Campo obrigatório não pode ficar vazio.")
        return v

class AppointmentCreate(BaseModel):
    business_id: int
    client_id: int
    service_id: int | None = None
    phone: str
    date: str
    time: str

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Informe o telefone para confirmar o agendamento.")
        return v


TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
ALLOWED_DURATIONS = [15, 30, 45, 60, 90, 120]

class ScheduleUpdate(BaseModel):
    working_days: str
    start_time: str
    end_time: str
    slot_duration_minutes: int = 60
    capacity: int = 1

    @field_validator("working_days")
    @classmethod
    def validate_working_days(cls, v):
        v = v.strip()
        if v == "":
            raise ValueError("Selecione pelo menos um dia de atendimento.")
        parts = v.split(",")
        for p in parts:
            if p not in ["0", "1", "2", "3", "4", "5", "6"]:
                raise ValueError("Dias de atendimento inválidos.")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v):
        if not TIME_RE.match(v):
            raise ValueError("Horário inválido. Use o formato HH:MM.")
        return v

    @field_validator("capacity")
    @classmethod
    def validate_capacity(cls, v):
        if v < 1 or v > 20:
            raise ValueError("O número de atendimentos simultâneos deve ser entre 1 e 20.")
        return v

    @field_validator("slot_duration_minutes")
    @classmethod
    def validate_duration(cls, v):
        if v not in ALLOWED_DURATIONS:
            raise ValueError(f"Intervalo inválido. Use um destes: {ALLOWED_DURATIONS}.")
        return v

class BlockedSlotCreate(BaseModel):
    date: str
    time: str | None = None
    reason: str | None = None

    @field_validator("time")
    @classmethod
    def validate_time_format(cls, v):
        if v is not None and not TIME_RE.match(v):
            raise ValueError("Horário inválido. Use o formato HH:MM.")
        return v

class ServiceCreate(BaseModel):
    name: str
    price: Decimal
    duration_minutes: int

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("O nome do serviço não pode ficar vazio.")
        return v

    @field_validator("price")
    @classmethod
    def price_positive(cls, v):
        if v < 0:
            raise ValueError("O preço não pode ser negativo.")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def duration_positive(cls, v):
        if v < 5 or v > 480:
            raise ValueError("A duração deve ser entre 5 minutos e 8 horas.")
        return v
