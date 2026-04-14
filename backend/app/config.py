"""
tiResolve - Configuracoes
Gerencia variáveis de ambiente e configurações da aplicação.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações da aplicação carregadas via variáveis de ambiente."""

    # Banco de dados
    DATABASE_URL: str = "sqlite:///./tiresolve.db"

    # JWT
    SECRET_KEY: str = "chave-secreta-desenvolvimento-tiresolve-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas

    # Aplicação
    APP_NAME: str = "tiResolve"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # CORS - aceita qualquer origem (necessario para mobile via IP)
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância cacheada das configurações."""
    return Settings()
