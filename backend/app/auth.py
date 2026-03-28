from datetime import UTC, datetime, timedelta
import hmac
from typing import Any, Dict

from fastapi import Cookie, Depends, HTTPException, Response, status
from jose import JWTError, jwt

from app.config import Settings, get_settings


def create_access_token(subject: str, settings: Settings) -> str:
    now = datetime.now(UTC)
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_expiry_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_access_token(token: str, settings: Settings) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token") from exc

    if payload.get("sub") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication subject")

    return payload


def set_auth_cookie(response: Response, token: str, settings: Settings) -> None:
    is_secure = settings.environment.lower() in {"production", "staging"}
    same_site = "none" if is_secure else "lax"
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        secure=is_secure,
        samesite=same_site,
        max_age=settings.jwt_expiry_hours * 3600,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="admin_token", path="/")


def verify_admin_password(password: str, settings: Settings) -> bool:
    if not settings.admin_password:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admin password is not configured")
    return hmac.compare_digest(password, settings.admin_password)


def require_admin(
    admin_token: str | None = Cookie(default=None),
    settings: Settings = Depends(get_settings),
) -> str:
    if not admin_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    verify_access_token(admin_token, settings)
    return "admin"
