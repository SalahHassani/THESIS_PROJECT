from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    firstname: str
    lastname: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# class UserResponse(BaseModel):
#     user_id: int
#     email: EmailStr
#     first_name: str
#     last_name: str
#     role: str
#     credits: int

#     model_config = {
#         "from_attributes": True
#     }

class UserResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    credits: int

    class Config:
        orm_mode = True  # 👈 this is required for `.from_orm()`


class ProfileUpdateRequest(BaseModel):
    new_name: str | None = None
    current_email: EmailStr | None = None
    new_email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = None

