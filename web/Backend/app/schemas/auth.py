from pydantic import BaseModel


class RFIDLoginRequest(BaseModel):
    rfid_uid: str


class RFIDLoginResponse(BaseModel):
    id: int
    nama: str
    rfid_uid: str
    total_point: float
    saldo_reward: float


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginResponse(BaseModel):
    name: str
    email: str
    role: str
    source: str = "backend"


class UserRegisterRequest(BaseModel):
    username: str
    email: str


class UserLoginRequest(BaseModel):
    username: str
    email: str


class UserLoginResponse(BaseModel):
    id: int
    nama: str
    rfid_uid: str
    username: str
    email: str
    total_point: float
    saldo_reward: float
