from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    firstname: str
    lastname: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    credits: int

    model_config = {
        "from_attributes": True
    }

