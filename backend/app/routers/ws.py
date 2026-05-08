"""
tiResolve - WebSocket Router
Endpoint /ws/chamados?token=JWT para atualizacoes em tempo real.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.services.auth_service import verificar_token
from app.services.ws_manager import manager

router = APIRouter()


def _autenticar_ws(token: str) -> User | None:
    """Valida JWT e retorna o User, ou None."""
    payload = verificar_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    db: Session = SessionLocal()
    try:
        return db.query(User).filter(User.id == int(user_id)).first()
    finally:
        db.close()


@router.websocket("/ws/chamados")
async def ws_chamados(ws: WebSocket, token: str = Query(...)):
    user = _autenticar_ws(token)
    if not user or not user.organizacao_id:
        await ws.close(code=4001, reason="Token invalido")
        return

    org_id = user.organizacao_id
    await manager.connect(ws, org_id, user.id)
    try:
        while True:
            # Mantém a conexao viva; ignora mensagens do cliente
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws, org_id)
