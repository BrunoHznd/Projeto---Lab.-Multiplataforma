"""
tiResolve - Serviço de Monitoramento
Lógica de negócio para dados de monitoramento de máquinas.
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Maquina, Organizacao, StatusMaquina, InventarioItem, TipoMaquina


def processar_dados_monitoramento(db: Session, dados: dict) -> Maquina:
    """
    Processa dados recebidos do agent de monitoramento.
    Vincula a máquina à organização via codigo_organizacao.
    """
    # Busca organizacao pelo codigo
    org_id = None
    codigo_org = dados.get("codigo_organizacao")
    if codigo_org:
        org = db.query(Organizacao).filter(
            Organizacao.codigo_acesso == codigo_org.upper()
        ).first()
        if org:
            org_id = org.id

    # Busca maquina existente (por identificador_agente ou fallback pro nome)
    # O filtro por tipo garante que agent de Rede nunca "cola" em uma maquina de Hardware e vice-versa
    from sqlalchemy import or_
    machine_id = dados["machine_id"]
    tipo_dado = dados.get("tipo", TipoMaquina.HARDWARE)
    query = db.query(Maquina).filter(
        or_(
            Maquina.identificador_agente == machine_id,
            Maquina.nome == machine_id
        ),
        Maquina.tipo == tipo_dado
    )
    if org_id:
        query = query.filter(Maquina.organizacao_id.in_([org_id, None]))
    maquina = query.first()

    if maquina:
        if org_id and not maquina.organizacao_id:
            maquina.organizacao_id = org_id
        if dados.get("cpu") is not None:
            maquina.cpu_uso = dados["cpu"]
        if dados.get("memory") is not None:
            maquina.memoria_uso = dados["memory"]
        if "download_speed" in dados and dados["download_speed"] is not None:
            maquina.download_speed = dados["download_speed"]
        if "upload_speed" in dados and dados["upload_speed"] is not None:
            maquina.upload_speed = dados["upload_speed"]
        maquina.ultimo_status = dados.get("status", StatusMaquina.ONLINE)
        maquina.ultima_verificacao = datetime.now()
        
        # Garante que as novas envios com tipo e identificador_agente sejam gravados em equipamentos legados
        if not maquina.identificador_agente:
            maquina.identificador_agente = machine_id
        if "tipo" in dados and dados["tipo"]:
            maquina.tipo = dados["tipo"]

        if dados.get("ip"):
            maquina.ip = dados["ip"]
        if dados.get("localizacao"):
            maquina.localizacao = dados["localizacao"]
    else:
        maquina = Maquina(
            nome=machine_id,
            identificador_agente=machine_id,
            tipo=dados.get("tipo", TipoMaquina.HARDWARE),
            ip=dados.get("ip"),
            localizacao=dados.get("localizacao"),
            cpu_uso=dados.get("cpu", 0.0) if dados.get("cpu") is not None else 0.0,
            memoria_uso=dados.get("memory", 0.0) if dados.get("memory") is not None else 0.0,
            download_speed=dados.get("download_speed", 0.0) if dados.get("download_speed") is not None else 0.0,
            upload_speed=dados.get("upload_speed", 0.0) if dados.get("upload_speed") is not None else 0.0,
            ultimo_status=dados.get("status", StatusMaquina.ONLINE),
            ultima_verificacao=datetime.now(),
            organizacao_id=org_id
        )
        db.add(maquina)

        # Auto-criar item no inventario apenas se for HARDWARE
        if org_id and dados.get("tipo", TipoMaquina.HARDWARE) != TipoMaquina.REDE:
            existente_inv = db.query(InventarioItem).filter(
                InventarioItem.nome == machine_id,
                InventarioItem.organizacao_id == org_id
            ).first()
            if not existente_inv:
                inv_item = InventarioItem(
                    organizacao_id=org_id,
                    nome=machine_id,
                    descricao=f"Adicionado automaticamente pelo Agent. IP: {dados.get('ip', 'N/A')}",
                    garantia=False,
                    campos_extras={"Origem": "Agent", "IP": dados.get("ip", "")}
                )
                db.add(inv_item)

    db.commit()
    db.refresh(maquina)
    return maquina


def listar_maquinas(
    db: Session,
    status: Optional[StatusMaquina] = None,
    tipo: Optional[TipoMaquina] = None,
    skip: int = 0,
    limit: int = 100,
    organizacao_id: int = None
) -> list[Maquina]:
    """Lista máquinas monitoradas, filtradas por organizacao.
    Atualiza automaticamente o status para OFFLINE se não houver
    verificação nos últimos 2 minutos."""
    from sqlalchemy.orm import joinedload
    query = db.query(Maquina).options(joinedload(Maquina.grupo))
    
    if organizacao_id:
        query = query.filter(Maquina.organizacao_id == organizacao_id)
    if tipo:
        query = query.filter(Maquina.tipo == tipo)

    # Auto-offline: marca como OFFLINE se sem verificação há mais de 2 minutos
    agora = datetime.now()
    todas = query.all()
    alterou = False
    for maquina in todas:
        if (maquina.ultimo_status == StatusMaquina.ONLINE
                and maquina.ultima_verificacao
                and (agora - maquina.ultima_verificacao) > timedelta(minutes=2)):
            maquina.ultimo_status = StatusMaquina.OFFLINE
            alterou = True
    if alterou:
        db.commit()

    # Agora aplica filtro de status (após atualizar offline)
    if status:
        query = query.filter(Maquina.ultimo_status == status)
    return query.order_by(Maquina.nome).offset(skip).limit(limit).all()


def obter_maquina(db: Session, maquina_id: int) -> Optional[Maquina]:
    """Obtém uma máquina por ID."""
    return db.query(Maquina).filter(Maquina.id == maquina_id).first()


def atualizar_maquina(db: Session, maquina_id: int, dados: dict) -> Optional[Maquina]:
    """Atualiza dados de uma máquina (nome, ip, localização)."""
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not maquina:
        return None

    for campo, valor in dados.items():
        if valor is not None and hasattr(maquina, campo):
            setattr(maquina, campo, valor)

    db.commit()
    db.refresh(maquina)
    return maquina


def deletar_maquina(db: Session, maquina_id: int) -> bool:
    """Remove uma máquina do sistema."""
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not maquina:
        return False
    db.delete(maquina)
    db.commit()
    return True
