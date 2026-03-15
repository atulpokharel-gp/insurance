import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from backend.config import get_settings


def _derive_key(source: str) -> bytes:
    digest = hashlib.sha256(source.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _build_fernet(raw_key: Optional[str]) -> Fernet:
    if not raw_key:
        raw_key = "default-fallback-key"

    try:
        return Fernet(raw_key.encode("utf-8"))
    except Exception:
        return Fernet(_derive_key(raw_key))


def get_fernet() -> Fernet:
    settings = get_settings()
    key_source = settings.encryption_key or settings.secret_key
    return _build_fernet(key_source)


def encrypt_value(value: Optional[str]) -> str:
    if not value:
        return ""
    fernet = get_fernet()
    return fernet.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_value(value: Optional[str]) -> str:
    if not value:
        return ""
    fernet = get_fernet()
    try:
        return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""
