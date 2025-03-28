from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from pydantic import BaseModel
from back_end.database.models import User as DBUser
from back_end.database.schemas import UserLogin, UserResponse, UserRegister
from back_end.database.auth import verify_password, create_access_token, hash_password

# Database Configuration
URL_DATABASE = "postgresql+asyncpg://postgres:shassani@localhost:5432/diffusion_model_db"
engine = create_async_engine(URL_DATABASE, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

db_dependency = Annotated[AsyncSession, Depends(get_db)]

# Auth Configuration
SECRET_KEY = "4ffe57b0833f048a04c90652e263fb87c3b85f480f485a370804db2bd5b38b21"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# FastAPI Router
router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

# Utility functions
async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(DBUser).where(DBUser.email == email))
    return result.scalar_one_or_none()

async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    return user

# Routes
@router.post("/token", response_model=Token)
async def login_for_access_token(db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(db: AsyncSession = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    return current_user

@router.post("/register")
async def register_user(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBUser).where(DBUser.email == user_data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = DBUser(
        first_name=user_data.firstname,
        last_name=user_data.lastname,
        email=user_data.email,
        password=hash_password(user_data.password)
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User registered successfully"}
