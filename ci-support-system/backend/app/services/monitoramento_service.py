"""
tiResolve - Serviço de Monitoramento
Lógica de negócio para dados de monitoramento de máquinas.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Maquina, Organizacao, StatusMaquina, InventarioItem


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

    # Busca maquina existente (por nome + org)
    query = db.query(Maquina).filter(Maquina.nome == dados["machine_id"])
    if org_id:
        query = query.filter(Maquina.organizacao_id == org_id)
    maquina = query.first()

    if maquina:
        maquina.cpu_uso = dados["cpu"]
        maquina.memoria_uso = dados["memory"]
        maquina.ultimo_status = dados.get("status", StatusMaquina.ONLINE)
        maquina.ultima_verificacao = dados.get("timestamp", datetime.utcnow())
        if dados.get("ip"):
            maquina.ip = dados["ip"]
        if dados.get("localizacao"):
            maquina.localizacao = dados["localizacao"]
    else:
        maquina = Maquina(
            nome=dados["machine_id"],
            ip=dados.get("ip"),
            localizacao=dados.get("localizacao"),
            cpu_uso=dados["cpu"],
            memoria_uso=dados["memory"],
            ultimo_status=dados.get("status", StatusMaquina.ONLINE),
            ultima_verificacao=dados.get("timestamp", datetime.utcnow()),
            organizacao_id=org_id
        )
        db.add(maquina)

        # Auto-criar item no inventario
        if org_id:
            existente_inv = db.query(InventarioItem).filter(
                InventarioItem.nome == dados["machine_id"],
                InventarioItem.organizacao_id == org_id
            ).first()
            if not existente_inv:
                inv_item = InventarioItem(
                    organizacao_id=org_id,
                    nome=dados["machine_id"],
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
    skip: int = 0,
    limit: int = 100,
    organizacao_id: int = None
) -> list[Maquina]:
    """Lista máquinas monitoradas, filtradas por organizacao."""
    query = db.query(Maquina)
    if organizacao_id:
        query = query.filter(Maquina.organizacao_id == organizacao_id)
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
