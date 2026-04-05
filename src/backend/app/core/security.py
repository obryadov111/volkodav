from datetime import datetime, timedelta, timezone
from hashlib import sha256
import base64
import os

from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _build_fernet() -> Fernet:
    raw = sha256(settings.TOTP_SECRET_ENCRYPTION_KEY.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


def encrypt_totp_secret(secret: str) -> str:
    return _build_fernet().encrypt(secret.encode("utf-8")).decode("utf-8")


def decrypt_totp_secret(secret_encrypted: str) -> str:
    return _build_fernet().decrypt(secret_encrypted.encode("utf-8")).decode("utf-8")


def hash_backup_code(code: str) -> str:
    return sha256(code.encode("utf-8")).hexdigest()


def generate_random_password(length: int = 24) -> str:
    alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*"
    return "".join(alphabet[ord(os.urandom(1)) % len(alphabet)] for _ in range(length))