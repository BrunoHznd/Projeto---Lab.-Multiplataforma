"""
tiResolve - WebSocket Manager
Gerencia conexoes WebSocket para atualizacoes em tempo real.
Conexoes sao agrupadas por organizacao_id.
"""

import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """Gerencia conexoes WebSocket ativas, agrupadas por org."""

    def __init__(self):
        # { org_id: [ (websocket, user_id), ... ] }
        self.active: Dict[int, List[tuple]] = {}

    async def connect(self, ws: WebSocket, org_id: int, user_id: int):
        await ws.accept()
        if org_id not in self.active:
            self.active[org_id] = []
        self.active[org_id].append((ws, user_id))

    def disconnect(self, ws: WebSocket, org_id: int):
        if org_id in self.active:
            self.active[org_id] = [
                (w, u) for w, u in self.active[org_id] if w is not ws
            ]
            if not self.active[org_id]:
                del self.active[org_id]

    async def broadcast(self, org_id: int, event: str, data: dict = None):
        """Envia evento para todos os clientes da mesma organizacao."""
        if org_id not in self.active:
            return
        payload = json.dumps({"event": event, "data": data or {}})
        stale = []
        for ws, uid in self.active[org_id]:
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(ws)
        # Remove conexoes mortas
        for ws in stale:
            self.disconnect(ws, org_id)


# Instancia global (singleton)
manager = ConnectionManager()
