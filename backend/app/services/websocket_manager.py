from typing import Dict, List, Optional
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Mapeia usuario_id para uma lista de WebSockets ativos dele
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Mapeia usuario_id para organizacao_id (para broadcast por org)
        self.user_org_map: Dict[int, int] = {}

    async def connect(self, websocket: WebSocket, usuario_id: int, organizacao_id: Optional[int] = None):
        await websocket.accept()
        if usuario_id not in self.active_connections:
            self.active_connections[usuario_id] = []
        self.active_connections[usuario_id].append(websocket)
        if organizacao_id:
            self.user_org_map[usuario_id] = organizacao_id
        print(f"[WS] Usuario {usuario_id} conectado (org={organizacao_id}). Total conexoes: {sum(len(v) for v in self.active_connections.values())}. Org map: {self.user_org_map}")

    def disconnect(self, websocket: WebSocket, usuario_id: int):
        if usuario_id in self.active_connections:
            if websocket in self.active_connections[usuario_id]:
                self.active_connections[usuario_id].remove(websocket)
            if not self.active_connections[usuario_id]:
                del self.active_connections[usuario_id]
                self.user_org_map.pop(usuario_id, None)
        print(f"[WS] Usuario {usuario_id} desconectado. Total conexoes: {sum(len(v) for v in self.active_connections.values())}. Org map: {self.user_org_map}")

    async def send_personal_message(self, message: dict, usuario_id: int):
        """Envia mensagem para todas as conexões (abas/devices) do mesmo usuario_id."""
        if usuario_id in self.active_connections:
            for connection in self.active_connections[usuario_id]:
                try:
                    await connection.send_json(message)
                    print(f"[WS] Mensagem enviada para usuario {usuario_id}: type={message.get('type')}")
                except Exception as e:
                    print(f"[WS] Erro ao enviar mensagem no socket {usuario_id}: {e}")
                    pass

    async def broadcast_to_org(self, message: dict, organizacao_id: int, exclude_user_id: Optional[int] = None):
        """Envia mensagem para TODOS os usuarios conectados de uma organizacao."""
        destinatarios = [(uid, org_id) for uid, org_id in self.user_org_map.items() if org_id == organizacao_id and uid != exclude_user_id]
        print(f"[WS] Broadcast org={organizacao_id} (excluindo user={exclude_user_id}): {len(destinatarios)} destinatarios -> {[d[0] for d in destinatarios]}")
        for uid, org_id in destinatarios:
            await self.send_personal_message(message, uid)

    async def send_event(self, event_type: str, organizacao_id: int, exclude_user_id: Optional[int] = None, **kwargs):
        """Helper para enviar eventos tipados para toda a organização."""
        message = {"type": event_type, **kwargs}
        print(f"[WS] Emitindo evento '{event_type}' para org={organizacao_id}")
        await self.broadcast_to_org(message, organizacao_id, exclude_user_id)

manager = ConnectionManager()

