from typing import Optional
from sqlalchemy.orm import Session
from app.models import Notificacao
from app.services.websocket_manager import manager
import asyncio

def criar_notificacao(
    db: Session,
    organizacao_id: int,
    usuario_id: int,
    titulo: str,
    mensagem: str,
    chamado_id: Optional[int] = None
) -> Notificacao:
    """Cria notificacao no banco de dados e tenta enviar por WebSocket."""
    notificacao = Notificacao(
        organizacao_id=organizacao_id,
        usuario_id=usuario_id,
        chamado_id=chamado_id,
        titulo=titulo,
        mensagem=mensagem,
        lida=False
    )
    db.add(notificacao)
    db.commit()
    db.refresh(notificacao)
    
    # Prepara payload pro frontend via websockets
    payload = {
        "type": "NOTIFICACAO",
        "id": notificacao.id,
        "titulo": notificacao.titulo,
        "mensagem": notificacao.mensagem,
        "chamado_id": notificacao.chamado_id,
        "lida": notificacao.lida,
        "created_at": notificacao.created_at.isoformat()
    }
    
    # Envia de forma assincrona sem bloquear a request
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.send_personal_message(payload, usuario_id))
    except RuntimeError:
        pass # Sem loop rodando em teste sincrono
        
    return notificacao


def marcar_como_lida(db: Session, notificacao_id: int, usuario_id: int) -> bool:
    notificacao = db.query(Notificacao).filter(
        Notificacao.id == notificacao_id, 
        Notificacao.usuario_id == usuario_id
    ).first()
    
    if notificacao:
        notificacao.lida = True
        db.commit()
        return True
    return False

def listar_nao_lidas(db: Session, usuario_id: int) -> list[Notificacao]:
    return db.query(Notificacao).filter(
        Notificacao.usuario_id == usuario_id,
        Notificacao.lida == False
    ).order_by(Notificacao.created_at.desc()).all()
