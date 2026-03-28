from fastapi import APIRouter, Depends, Response, status

from app.auth import clear_auth_cookie, create_access_token, require_admin, set_auth_cookie, verify_admin_password
from app.config import Settings, get_settings
from app.models.auth import AuthStatusResponse, LoginRequest, LoginResponse, LogoutResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, settings: Settings = Depends(get_settings)) -> LoginResponse:
    if not verify_admin_password(payload.password, settings):
        response.status_code = status.HTTP_401_UNAUTHORIZED
        return LoginResponse(success=False, message="Invalid password")

    token = create_access_token("admin", settings)
    set_auth_cookie(response, token, settings)
    return LoginResponse(success=True, message="Login successful")


@router.post("/logout", response_model=LogoutResponse)
def logout(response: Response) -> LogoutResponse:
    clear_auth_cookie(response)
    return LogoutResponse(success=True, message="Logout successful")


@router.get("/me", response_model=AuthStatusResponse)
def auth_me(_: str = Depends(require_admin)) -> AuthStatusResponse:
    return AuthStatusResponse(authenticated=True)
