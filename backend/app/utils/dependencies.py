"""
tiResolve - Dependências FastAPI
Funções de dependência para injeção em endpoints.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role
from app.services.auth_service import verificar_token

# Schema OAuth2 para extração do token do header Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependência que extrai e valida o usuário atual pelo token JWT.
    
    Raises:
        HTTPException 401: Se o token for inválido ou o usuário não existir
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verificar_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependência que exige que o usuário seja ADMIN."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )
    return current_user


async def require_tecnico_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependência que exige que o usuário seja TECNICO ou ADMIN."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a técnicos e administradores"
        )
    return current_user


async def require_sysadmin(current_user: User = Depends(get_current_user)) -> User:
    """Dependência que exige que o usuário seja SYSADMIN."""
    if current_user.role != Role.SYSADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao administrador do sistema"
        )
    return current_user
