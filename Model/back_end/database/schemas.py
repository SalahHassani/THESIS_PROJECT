from pydantic import BaseModel, EmailStr

# ======================
# 📝 Auth Schemas
# ======================
class UserRegister(BaseModel):
    firstname: str
    lastname: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ======================
# 👤 User Profile
# ======================
class UserResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    credits: int

    class Config:
        orm_mode = True

class ProfileUpdateRequest(BaseModel):
    new_name: str | None = None
    current_email: EmailStr | None = None
    new_email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = None

# ======================
# 🧠 Character History
# ======================
class CharacterData(BaseModel):
    name: str
    age: str
    gender: str
    hair: str
    eyes: str
    clothes: str
    special: str
    description: str
