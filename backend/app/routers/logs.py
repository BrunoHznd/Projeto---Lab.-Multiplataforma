"""
tiResolve - Router de Logs de Chamado
Endpoints para adicionar e listar logs/mensagens em chamados.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import LogChamadoCreate, LogChamadoResponse
from app.services.chamado_service import adicionar_log, listar_logs, obter_chamado
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/chamados", tags=["Logs de Chamado"])


@router.post(
    "/{chamado_id}/logs",
    response_model=LogChamadoResponse,
    status_code=status.HTTP_201_CREATED
)
async def criar_log(
    chamado_id: int,
    dados: LogChamadoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adiciona um log/mensagem a um chamado."""
    # Verifica se o chamado existe
    chamado = obter_chamado(db, chamado_id)
    if not chamado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chamado não encontrado"
        )

    log = adicionar_log(db, chamado_id, current_user.id, dados.mensagem)
    return log


@router.get("/{chamado_id}/logs", response_model=list[LogChamadoResponse])
async def lista_logs(
    chamado_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os logs de um chamado."""
    # Verifica se o chamado existe
    chamado = obter_chamado(db, chamado_id)
    if not chamado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chamado não encontrado"
        )

    return listar_logs(db, chamado_id)
