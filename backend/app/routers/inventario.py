"""
tiResolve - Router de Inventario
CRUD de itens de inventario com campos dinamicos e garantia.
"""

import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Role, InventarioItem, Maquina, StatusMaquina, TipoMaquina, Organizacao
)
from app.schemas import (
    InventarioItemCreate, InventarioItemUpdate, InventarioItemResponse
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/inventario", tags=["Inventario"])


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
AGENTS_DIR = os.path.join(BASE_DIR, "agents")


def _construir_api_url(request: Request) -> str:
    """Constroi a URL publica de monitoramento a partir dos headers."""
    scheme = request.headers.get("x-forwarded-proto", "http")
    host = request.headers.get("host", "localhost:8000")
    if "127.0.0.1" in host or "localhost" in host:
        host = request.headers.get("x-forwarded-host", host)
    return f"{scheme}://{host}/api/monitoramento"


@router.get("", response_model=list[InventarioItemResponse])
async def listar_inventario(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista itens do inventario da organizacao."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=400, detail="Usuario nao pertence a nenhuma organizacao. Crie ou entre em uma primeiro.")
    return db.query(InventarioItem).filter(
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).order_by(InventarioItem.created_at.desc()).all()


@router.post("", response_model=InventarioItemResponse, status_code=201)
async def criar_item(
    dados: InventarioItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um item no inventario."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    # Validacao: se o usuario marcou "Incluir em Infraestrutura" precisa do tipo
    if dados.incluir_em_infraestrutura and not dados.tipo_dispositivo:
        raise HTTPException(
            status_code=400,
            detail="tipo_dispositivo e obrigatorio quando incluir_em_infraestrutura=True"
        )

    item = InventarioItem(
        organizacao_id=current_user.organizacao_id,
        nome=dados.nome,
        descricao=dados.descricao,
        foto_url=dados.foto_url,
        garantia=dados.garantia,
        garantia_ate=dados.garantia_ate,
        campos_extras=dados.campos_extras or {}
    )
    if dados.incluir_em_infraestrutura:
        item.agent_token = secrets.token_urlsafe(24)
        item.tipo_dispositivo = dados.tipo_dispositivo
    db.add(item)
    db.flush()

    # Cria placeholder em Infraestrutura ja vinculado, em status OFFLINE.
    if dados.incluir_em_infraestrutura:
        maquina = Maquina(
            nome=item.nome,
            tipo=dados.tipo_dispositivo,
            organizacao_id=current_user.organizacao_id,
            ultimo_status=StatusMaquina.OFFLINE,
            inventario_item_id=item.id,
        )
        db.add(maquina)

    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=InventarioItemResponse)
async def obter_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtem um item do inventario."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    return item


@router.put("/{item_id}", response_model=InventarioItemResponse)
async def atualizar_item(
    item_id: int,
    dados: InventarioItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza um item do inventario."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")

    payload = dados.model_dump(exclude_unset=True)
    incluir = payload.pop("incluir_em_infraestrutura", None)
    tipo_disp = payload.pop("tipo_dispositivo", None)

    for campo, valor in payload.items():
        setattr(item, campo, valor)

    # Se o usuario acabou de marcar "Incluir em Infraestrutura", gera token e
    # cria a maquina vinculada (caso ainda nao exista).
    if incluir is True:
        if not tipo_disp and not item.tipo_dispositivo:
            raise HTTPException(
                status_code=400,
                detail="tipo_dispositivo e obrigatorio para incluir em infraestrutura"
            )
        if tipo_disp:
            item.tipo_dispositivo = tipo_disp
        if not item.agent_token:
            item.agent_token = secrets.token_urlsafe(24)
        existente = db.query(Maquina).filter(Maquina.inventario_item_id == item.id).first()
        if not existente:
            maquina = Maquina(
                nome=item.nome,
                tipo=item.tipo_dispositivo,
                organizacao_id=item.organizacao_id,
                ultimo_status=StatusMaquina.OFFLINE,
                inventario_item_id=item.id,
            )
            db.add(maquina)
    elif incluir is False:
        # Desmarcou: limpa o token (mantem a maquina, ela nao recebera mais dados via token).
        item.agent_token = None
    elif tipo_disp is not None:
        item.tipo_dispositivo = tipo_disp

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def deletar_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove um item do inventario. Apenas ADMIN."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas admin pode remover itens")

    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")

    db.delete(item)
    db.commit()


@router.get("/{item_id}/download-agent")
async def download_agent_inventario(
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera o script do agent (HARDWARE ou REDE) com o agent_token deste item embutido.
    Quando executado, o agent se identificara via token e sera vinculado a este
    InventarioItem (sem duplicar em Infraestrutura).
    """
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    if not item.agent_token or not item.tipo_dispositivo:
        raise HTTPException(
            status_code=400,
            detail="Este item nao esta marcado para Inclusao em Infraestrutura",
        )

    org = db.query(Organizacao).filter(Organizacao.id == item.organizacao_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizacao nao encontrada")

    arquivo = (
        "monitor_agent.py"
        if item.tipo_dispositivo == TipoMaquina.HARDWARE
        else "network_agent.py"
    )
    agent_path = os.path.join(AGENTS_DIR, arquivo)
    if not os.path.exists(agent_path):
        raise HTTPException(status_code=500, detail="Arquivo base do agent nao encontrado")

    with open(agent_path, "r", encoding="utf-8") as f:
        script = f.read()

    api_url = _construir_api_url(request)
    script = script.replace("COLE_SEU_CODIGO_AQUI", org.codigo_acesso)
    script = script.replace("__API_URL__", api_url)
    script = script.replace("__AGENT_TOKEN__", item.agent_token)

    sufixo = "hw" if item.tipo_dispositivo == TipoMaquina.HARDWARE else "rede"
    filename = f"tiresolve_agent_{sufixo}_inv{item.id}.py"
    return PlainTextResponse(
        content=script,
        media_type="text/x-python",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
