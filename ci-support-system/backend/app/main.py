"""
tiResolve - Aplicação Principal
Ponto de entrada do backend FastAPI.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_tables
from app.routers import auth, chamados, logs, monitoramento, upload, inventario

settings = get_settings()

# Inicializa a aplicação FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API do sistema de gestao de chamados e monitoramento "
                "do Centro de Informatica - FATEC Praia Grande",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuração de CORS para permitir acesso dos frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos routers
app.include_router(auth.router)
app.include_router(chamados.router)
app.include_router(logs.router)
app.include_router(monitoramento.router)
app.include_router(upload.router)
app.include_router(inventario.router)


@app.on_event("startup")
async def startup_event():
    """Evento executado ao iniciar a aplicação."""
    # Cria as tabelas no banco de dados
    create_tables()
    print(f"Server {settings.APP_NAME} v{settings.APP_VERSION} iniciado!")
    print(f"Banco de dados: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")


@app.get("/", tags=["Health"])
async def root():
    """Endpoint de saúde da API."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Verificação de saúde detalhada."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }
