from typing import List
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import NotificacaoResponse
from app.services.notificacao_service import listar_nao_lidas, marcar_como_lida
from app.services.websocket_manager import manager
from app.services.auth_service import validar_token_ws
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/notificacoes", tags=["Notificacoes"])

@router.get("/", response_model=List[NotificacaoResponse])
async def get_notificacoes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas as notificacoes nao lidas do usuario."""
    return listar_nao_lidas(db, current_user.id)

@router.put("/{notificacao_id}/ler")
async def marcar_lida(
    notificacao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca uma notificacao especifica como lida."""
    sucesso = marcar_como_lida(db, notificacao_id, current_user.id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Notificacao nao encontrada")
    return {"message": "Notificacao marcada como lida"}

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str = Query(...), 
    db: Session = Depends(get_db)
):
    """
    Endpoint WebSocket para receber notificacoes em tempo real.
    O client deve se conectar passando ?token=JWT_TOKEN
    """
    user_info = validar_token_ws(token, db)
    if not user_info:
        await websocket.close(code=1008) # Policy violation
        return
        
    usuario_id = user_info.id
    organizacao_id = user_info.organizacao_id
    await manager.connect(websocket, usuario_id, organizacao_id)
    
    try:
        while True:
            # Mantem a conexao aberta recebendo qualquer lixo que o cliente possa mandar (ping)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, usuario_id)
