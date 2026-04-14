"""
tiResolve - Servico de Autenticacao
Gerencia hash de senhas e tokens JWT.
Usa bcrypt diretamente (passlib e incompativel com bcrypt >= 4.2).
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import User

settings = get_settings()


def hash_senha(senha: str) -> str:
    """Gera hash bcrypt da senha."""
    senha_bytes = senha.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha_bytes, salt).decode("utf-8")


def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    """Verifica se a senha corresponde ao hash."""
    try:
        return bcrypt.checkpw(
            senha_plana.encode("utf-8"),
            senha_hash.encode("utf-8"),
        )
    except Exception:
        return False


def criar_token_acesso(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria um token JWT com os dados fornecidos.

    Args:
        data: Dados a serem codificados no token
        expires_delta: Tempo de expiracao customizado

    Returns:
        Token JWT codificado
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verificar_token(token: str) -> Optional[dict]:
    """
    Verifica e decodifica um token JWT.

    Args:
        token: Token JWT a ser verificado

    Returns:
        Dados decodificados do token ou None se invalido
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def autenticar_usuario(db: Session, email: str, senha: str) -> Optional[User]:
    """
    Autentica um usuario por email e senha.

    Args:
        db: Sessao do banco
        email: Email do usuario
        senha: Senha em texto plano

    Returns:
        Objeto User se autenticado, None caso contrario
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not verificar_senha(senha, user.senha_hash):
        return None
    return user


def validar_token_ws(token: str, db: Session) -> Optional[User]:
    """Valida o token JWT recebido no WebSocket e retorna o usuario."""
    payload = verificar_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()
