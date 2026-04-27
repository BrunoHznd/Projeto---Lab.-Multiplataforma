"""
tiResolve - Router de Notificacoes
Endpoints para listar e gerenciar notificacoes in-app.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Notificacao
from app.schemas import NotificacaoResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/notificacoes", tags=["Notificacoes"])


@router.get("/", response_model=list[NotificacaoResponse])
async def listar_notificacoes(
    nao_lidas: bool = Query(False, description="Filtrar apenas nao lidas"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista notificacoes do usuario logado."""
    query = db.query(Notificacao).filter(Notificacao.user_id == current_user.id)
    if nao_lidas:
        query = query.filter(Notificacao.lida == False)
    return query.order_by(Notificacao.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/contagem")
async def contagem_nao_lidas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna quantidade de notificacoes nao lidas."""
    count = db.query(Notificacao).filter(
        Notificacao.user_id == current_user.id,
        Notificacao.lida == False
    ).count()
    return {"nao_lidas": count}


@router.put("/{notificacao_id}/lida", response_model=NotificacaoResponse)
async def marcar_como_lida(
    notificacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca uma notificacao como lida."""
    notif = db.query(Notificacao).filter(
        Notificacao.id == notificacao_id,
        Notificacao.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificacao nao encontrada")
    notif.lida = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/ler-todas", status_code=status.HTTP_200_OK)
async def marcar_todas_lidas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca todas as notificacoes do usuario como lidas."""
    db.query(Notificacao).filter(
        Notificacao.user_id == current_user.id,
        Notificacao.lida == False
    ).update({"lida": True})
    db.commit()
    return {"message": "Todas as notificacoes foram marcadas como lidas"}
