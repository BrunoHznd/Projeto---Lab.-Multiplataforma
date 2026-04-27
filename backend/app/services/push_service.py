"""
tiResolve - Servico de Push Notifications
Envia notificacoes push via Expo Push API (sem Firebase direto).
Docs: https://docs.expo.dev/push-notifications/sending-notifications/
"""

import httpx
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models import User

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def enviar_push(
    push_token: str,
    titulo: str,
    corpo: str,
    data: Optional[dict] = None
) -> bool:
    """
    Envia uma notificacao push individual via Expo Push API.
    
    Args:
        push_token: Token Expo do dispositivo (formato ExponentPushToken[xxx])
        titulo: Titulo da notificacao
        corpo: Corpo/descricao da notificacao
        data: Dados extras (ex: chamado_id para navegacao)
    
    Returns:
        True se enviou com sucesso, False caso contrario
    """
    if not push_token or not push_token.startswith("ExponentPushToken"):
        logger.warning(f"Token invalido ignorado: {push_token}")
        return False

    payload = {
        "to": push_token,
        "sound": "default",
        "title": titulo,
        "body": corpo,
        "priority": "high",
        "channelId": "tiresolve-tickets",
    }

    if data:
        payload["data"] = data

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }
            )

            if response.status_code == 200:
                result = response.json()
                # Verifica se o Expo retornou erro no ticket
                if result.get("data", {}).get("status") == "error":
                    error_msg = result["data"].get("message", "Erro desconhecido")
                    logger.error(f"Expo push error: {error_msg}")
                    return False
                logger.info(f"Push enviado com sucesso para {push_token[:30]}...")
                return True
            else:
                logger.error(f"Expo push HTTP {response.status_code}: {response.text}")
                return False

    except httpx.TimeoutException:
        logger.warning(f"Timeout ao enviar push para {push_token[:30]}...")
        return False
    except Exception as e:
        logger.error(f"Erro ao enviar push: {e}")
        return False


async def enviar_push_para_usuario(
    db: Session,
    user_id: int,
    titulo: str,
    corpo: str,
    data: Optional[dict] = None
) -> bool:
    """
    Busca o push token do usuario no banco e envia a notificacao.
    
    Args:
        db: Sessao do banco de dados
        user_id: ID do usuario destinatario
        titulo: Titulo da notificacao
        corpo: Corpo/descricao
        data: Dados extras (ex: chamado_id)
    
    Returns:
        True se enviou, False se usuario nao tem token ou falhou
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.push_token:
        logger.info(f"Usuario {user_id} nao tem push token registrado")
        return False

    return await enviar_push(user.push_token, titulo, corpo, data)
