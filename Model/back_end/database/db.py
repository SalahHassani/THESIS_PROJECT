# ---------------------- db.py ----------------------

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import os
from uuid import uuid4
from pydantic import BaseModel

from back_end.database.models import Comic, User


from back_end.database.models import Comic
from back_end.database.models import User as DBUser
from back_end.database.schemas import UserLogin, UserResponse, UserRegister, ProfileUpdateRequest
from back_end.database.auth import verify_password, create_access_token, hash_password, SECRET_KEY, ALGORITHM

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

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
    access_token_expires = timedelta(minutes=30)
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

# @router.get("/users/me", response_model=UserResponse)
# async def read_users_me(db: AsyncSession = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
#     return current_user

# @router.get("/users/me", response_model=UserResponse)
# async def read_users_me(
#     db: AsyncSession = Depends(get_db),
#     current_user: DBUser = Depends(get_current_user)
# ):
#     return UserResponse.model_validate(current_user)

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    return UserResponse.from_orm(current_user)



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

# PDF Upload Handling
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "front_end")
PDF_STORAGE_PATH = os.path.join(FRONTEND_DIR, "uploads", "pdfs")
os.makedirs(PDF_STORAGE_PATH, exist_ok=True)

@router.post("/upload-pdf")
async def upload_pdf(
    title: str = Form(...),
    story_text: str = Form(...),
    pdf: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    if not pdf.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_ext = os.path.splitext(pdf.filename)[1]
    unique_filename = f"{uuid4()}{file_ext}"
    file_path = os.path.join(PDF_STORAGE_PATH, unique_filename)

    with open(file_path, "wb") as f:
        content = await pdf.read()
        f.write(content)

    relative_path = f"/uploads/pdfs/{unique_filename}"

    new_comic = Comic(
        user_id=current_user.user_id,
        title=title,
        story_text=story_text,
        images_path=relative_path,
        total_pages=1
    )
    db.add(new_comic)
    await db.commit()

    return {
        "message": "Comic uploaded successfully",
        "path": relative_path,
        "title": title
    }





@router.get("/api/user/comics")
async def get_user_comics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(Comic.user_id == current_user.user_id))
    comics = result.scalars().all()

    return [
        {
            "id": comic.comic_id,
            "title": comic.title,
            "description": comic.story_text,
            "pdf_path": comic.images_path,
            "created_at": str(comic.created_at)
        }
        for comic in comics
    ]


# 📜 Get Comic Details
@router.delete("/api/user/comics/{comic_id}")
async def delete_comic(
    comic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(Comic.comic_id == comic_id, Comic.user_id == current_user.user_id))
    comic = result.scalar_one_or_none()

    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")   

    # Delete PDF file
    pdf_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    # Delete from DB
    await db.delete(comic)
    await db.commit()

    return {"message": "Comic deleted"}



# 🗑️ Delete Account
@router.delete("/api/delete-account")
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    # 🔍 Get all comics associated with the user
    result = await db.execute(select(Comic).where(Comic.user_id == current_user.user_id))
    comics = result.scalars().all()

    # 🗑️ Delete all PDF files on disk
    for comic in comics:
        if comic.images_path:  # just in case
            file_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")

        # Explicitly delete the comic from DB
        await db.delete(comic)

    # 🧨 Delete the user
    await db.delete(current_user)
    await db.commit()

    return {"message": "Account and all associated comics deleted successfully"}


# 🔄 Update Profile
@router.post("/api/update-profile")
async def update_profile(
    data: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    updated = False

    # Update name
    if data.new_name:
        names = data.new_name.strip().split(" ", 1)
        current_user.first_name = names[0]
        current_user.last_name = names[1] if len(names) > 1 else ""
        updated = True

    # Update email
    if data.current_email and data.new_email:
        if current_user.email != data.current_email:
            raise HTTPException(status_code=403, detail="Current email does not match.")
        current_user.email = data.new_email
        updated = True

    # Update password
    if data.current_password and data.new_password:
        if not verify_password(data.current_password, current_user.password):
            raise HTTPException(status_code=403, detail="Current password is incorrect.")
        current_user.password = hash_password(data.new_password)
        updated = True

    if not updated:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    await db.commit()
    return {"message": "Profile updated successfully"}
