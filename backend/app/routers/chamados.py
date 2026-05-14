"""
tiResolve - Router de Chamados
Endpoints CRUD + atribuicao, finalizacao, chat e edicao com historico.
"""

import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    User, Chamado, LogChamado, StatusChamado, Role, Notificacao, TipoNotificacao,
    InventarioItem, EstadoInventario, Maquina
)
from app.schemas import (
    ChamadoCreate, ChamadoUpdate, ChamadoResponse, ChamadoEditRequest,
    AtribuirTecnicoRequest, FinalizarChamadoRequest, UserResponse,
    LogChamadoCreate, LogChamadoResponse
)
from app.services.chamado_service import (
    listar_chamados, obter_chamado, criar_chamado,
    atualizar_chamado, deletar_chamado,
    atribuir_tecnico, finalizar_chamado, listar_tecnicos
)
from app.services.push_service import enviar_push_para_usuario
from app.services.ws_manager import manager as ws_manager
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/chamados", tags=["Chamados"])


@router.get("/", response_model=list[ChamadoResponse])
async def lista_chamados(
    status_filter: Optional[StatusChamado] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista chamados conforme role (filtrado por org)."""
    return listar_chamados(db, current_user, status_filter, skip, limit)


@router.post("/", response_model=ChamadoResponse, status_code=status.HTTP_201_CREATED)
async def novo_chamado(
    dados: ChamadoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um novo chamado tecnico. Apenas USUARIO pode criar."""
    if current_user.role != Role.USUARIO:
        raise HTTPException(status_code=403, detail="Apenas usuarios podem abrir chamados")
    chamado = criar_chamado(db, dados.model_dump(), current_user.id)
    result = obter_chamado(db, chamado.id)
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_criado", {"id": chamado.id})
    return result


@router.get("/tecnicos", response_model=list[UserResponse])
async def lista_tecnicos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista tecnicos da mesma organizacao."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem listar tecnicos")
    return listar_tecnicos(db, current_user.organizacao_id)


@router.get("/{chamado_id}", response_model=ChamadoResponse)
async def detalhe_chamado(
    chamado_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtem detalhes de um chamado especifico."""
    chamado = obter_chamado(db, chamado_id)
    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado nao encontrado")
    return chamado


@router.put("/{chamado_id}/atribuir", response_model=ChamadoResponse)
async def atribuir_chamado(
    chamado_id: int,
    dados: AtribuirTecnicoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atribui tecnico a um chamado. Apenas ADMIN."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem atribuir tecnicos")
    chamado = atribuir_tecnico(db, chamado_id, dados.tecnico_id, current_user)
    if not chamado:
        raise HTTPException(status_code=400, detail="Chamado nao encontrado ou tecnico invalido")

    # Envia push notification (async, nao bloqueia resposta)
    if hasattr(chamado, '_push_info'):
        pi = chamado._push_info
        asyncio.ensure_future(
            enviar_push_para_usuario(db, pi["user_id"], pi["titulo"], pi["corpo"], pi["data"])
        )

    result = obter_chamado(db, chamado_id)
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_atribuido", {"id": chamado_id})
    return result


@router.put("/{chamado_id}/finalizar", response_model=ChamadoResponse)
async def finalizar(
    chamado_id: int,
    dados: FinalizarChamadoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Finaliza chamado com relatorio. Apenas TECNICO atribuido."""
    if current_user.role != Role.TECNICO:
        raise HTTPException(status_code=403, detail="Apenas tecnicos podem finalizar chamados")
    chamado = finalizar_chamado(db, chamado_id, current_user, dados.resolucao, dados.imagem_url)
    if not chamado:
        raise HTTPException(status_code=400, detail="Chamado nao encontrado ou nao atribuido a voce")

    # Envia push notification (async, nao bloqueia resposta)
    if hasattr(chamado, '_push_info'):
        pi = chamado._push_info
        asyncio.ensure_future(
            enviar_push_para_usuario(db, pi["user_id"], pi["titulo"], pi["corpo"], pi["data"])
        )

    result = obter_chamado(db, chamado_id)
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_finalizado", {"id": chamado_id})
    return result


@router.put("/{chamado_id}/manutencao")
async def marcar_manutencao(
    chamado_id: int,
    dados: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca o equipamento vinculado ao chamado como EM_MANUTENCAO.
    Apenas o tecnico atribuido ou ADMIN pode executar.
    Requer campo 'motivo' no body.
    """
    motivo = dados.get("motivo", "").strip()
    if not motivo:
        raise HTTPException(status_code=400, detail="O motivo da manutencao e obrigatorio")

    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado nao encontrado")

    # Permissao: ADMIN ou tecnico atribuido
    if current_user.role == Role.TECNICO and chamado.tecnico_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o tecnico atribuido pode executar")
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    # Busca equipamento vinculado ao chamado
    if not chamado.maquina_id:
        raise HTTPException(status_code=400, detail="Este chamado nao possui equipamento vinculado")

    maquina = db.query(Maquina).filter(Maquina.id == chamado.maquina_id).first()
    if not maquina:
        raise HTTPException(status_code=400, detail="Maquina nao encontrada")

    # Altera o estado do item no inventario (se vinculado)
    item_atualizado = False
    if maquina.inventario_item_id:
        item = db.query(InventarioItem).filter(InventarioItem.id == maquina.inventario_item_id).first()
        if item:
            item.estado = EstadoInventario.EM_MANUTENCAO
            item.motivo_manutencao = motivo
            item_atualizado = True

    # Registra log no chamado
    log = LogChamado(
        chamado_id=chamado_id,
        autor_id=current_user.id,
        mensagem=f"[Manutencao] Equipamento marcado como Em Manutencao: {motivo}"
    )
    db.add(log)

    db.commit()

    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_atualizado", {"id": chamado_id})

    return {"ok": True, "motivo": motivo, "item_atualizado": item_atualizado}


@router.put("/{chamado_id}/editar", response_model=ChamadoResponse)
async def editar_chamado_usuario(
    chamado_id: int,
    dados: ChamadoEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """USUARIO edita seu chamado. Registra alteracoes no log automaticamente."""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado nao encontrado")
    if chamado.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o dono pode editar o chamado")

    alteracoes = []
    if dados.titulo and dados.titulo != chamado.titulo:
        alteracoes.append(f"Titulo alterado de '{chamado.titulo}' para '{dados.titulo}'")
        chamado.titulo = dados.titulo
    if dados.descricao and dados.descricao != chamado.descricao:
        alteracoes.append("Descricao atualizada")
        chamado.descricao = dados.descricao
    if dados.imagem_url is not None and dados.imagem_url != chamado.imagem_url:
        alteracoes.append("Imagem atualizada")
        chamado.imagem_url = dados.imagem_url

    # Registra alteracoes como log
    for alt in alteracoes:
        log = LogChamado(
            chamado_id=chamado_id,
            autor_id=current_user.id,
            mensagem=f"[Editado] {alt}"
        )
        db.add(log)

    db.commit()
    result = obter_chamado(db, chamado_id)
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_editado", {"id": chamado_id})
    return result


@router.put("/{chamado_id}", response_model=ChamadoResponse)
async def editar_chamado(
    chamado_id: int,
    dados: ChamadoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza um chamado existente (admin/tecnico). Envia push ao USUARIO dono."""
    chamado = atualizar_chamado(db, chamado_id, dados.model_dump(exclude_unset=True), current_user)
    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado nao encontrado ou sem permissao")

    # Envia push notification para o USUARIO dono do chamado
    if hasattr(chamado, '_push_info'):
        pi = chamado._push_info
        asyncio.ensure_future(
            enviar_push_para_usuario(db, pi["user_id"], pi["titulo"], pi["corpo"], pi["data"])
        )

    result = obter_chamado(db, chamado_id)
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_atualizado", {"id": chamado_id})
    return result


@router.delete("/{chamado_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_chamado(
    chamado_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove um chamado. Somente administradores."""
    if not deletar_chamado(db, chamado_id, current_user):
        raise HTTPException(status_code=403, detail="Sem permissao para deletar")
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "chamado_deletado", {"id": chamado_id})


# ================ CHAT / LOGS ================

@router.get("/{chamado_id}/mensagens", response_model=list[LogChamadoResponse])
async def listar_mensagens(
    chamado_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista mensagens/chat de um chamado."""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado nao encontrado")

    # Permissao: dono, tecnico atribuido ou admin
    if (current_user.role == Role.USUARIO and chamado.usuario_id != current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissao")

    return db.query(LogChamado).options(
        joinedload(LogChamado.autor)
    ).filter(
        LogChamado.chamado_id == chamado_id
    ).order_by(LogChamado.created_at.asc()).all()


@router.post("/{chamado_id}/mensagens", response_model=LogChamadoResponse, status_code=201)
async def enviar_mensagem(
    chamado_id: int,
    dados: LogChamadoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envia mensagem no chat do chamado."""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado nao encontrado")

    # Permissao: dono, tecnico atribuido ou admin
    if current_user.role == Role.USUARIO and chamado.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissao")
    if current_user.role == Role.TECNICO and chamado.tecnico_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chamado nao atribuido a voce")

    log = LogChamado(
        chamado_id=chamado_id,
        autor_id=current_user.id,
        mensagem=dados.mensagem,
        imagem_url=dados.imagem_url
    )
    db.add(log)

    # Cria notificacao para o outro participante
    destinatario_id = None
    if current_user.id == chamado.usuario_id and chamado.tecnico_id:
        # Usuario mandou -> notifica tecnico
        destinatario_id = chamado.tecnico_id
    elif current_user.id != chamado.usuario_id:
        # Tecnico/Admin mandou -> notifica usuario dono
        destinatario_id = chamado.usuario_id

    titulo_notif = "💬 Nova Mensagem!"
    corpo_notif = f"{current_user.nome} enviou: {dados.mensagem[:60]}{'...' if len(dados.mensagem) > 60 else ''}"

    if destinatario_id:
        notif = Notificacao(
            user_id=destinatario_id,
            chamado_id=chamado_id,
            tipo=TipoNotificacao.MENSAGEM,
            titulo=titulo_notif,
            corpo=corpo_notif
        )
        db.add(notif)

    db.commit()
    db.refresh(log)

    # Envia push notification para o destinatario
    if destinatario_id:
        asyncio.ensure_future(
            enviar_push_para_usuario(
                db, destinatario_id, titulo_notif, corpo_notif,
                {"chamado_id": chamado_id, "tipo": "MENSAGEM"}
            )
        )

    result = db.query(LogChamado).options(
        joinedload(LogChamado.autor)
    ).filter(LogChamado.id == log.id).first()
    if current_user.organizacao_id:
        await ws_manager.broadcast(current_user.organizacao_id, "nova_mensagem", {"chamado_id": chamado_id})
    return result
