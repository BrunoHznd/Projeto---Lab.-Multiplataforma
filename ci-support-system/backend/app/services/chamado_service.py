"""
tiResolve - Servico de Chamados
Logica de negocio para operacoes de chamados.
Regras:
- USUARIO: cria chamados, ve apenas os proprios
- ADMIN: ve todos, atribui tecnico, deleta
- TECNICO: ve todos, altera apenas os atribuidos a ele, finaliza com relatorio
"""

from typing import Optional
from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models import Chamado, LogChamado, StatusChamado, User, Role


def listar_chamados(
    db: Session,
    user: User,
    status: Optional[StatusChamado] = None,
    skip: int = 0,
    limit: int = 50
) -> list[Chamado]:
    """
    Lista chamados conforme o papel do usuario.
    - ADMIN: ve todos
    - TECNICO: ve todos (mas so altera os dele)
    - USUARIO: ve apenas os proprios
    """
    query = db.query(Chamado).options(
        joinedload(Chamado.usuario),
        joinedload(Chamado.tecnico),
        joinedload(Chamado.maquina)
    )

    # Filtrar por organizacao
    if user.organizacao_id:
        query = query.filter(Chamado.organizacao_id == user.organizacao_id)

    # USUARIO so ve os proprios
    if user.role == Role.USUARIO:
        query = query.filter(Chamado.usuario_id == user.id)

    # Filtro por status
    if status:
        query = query.filter(Chamado.status == status)

    return query.order_by(Chamado.created_at.desc()).offset(skip).limit(limit).all()


def obter_chamado(db: Session, chamado_id: int) -> Optional[Chamado]:
    """Obtem um chamado por ID com relacionamentos carregados."""
    return db.query(Chamado).options(
        joinedload(Chamado.usuario),
        joinedload(Chamado.tecnico),
        joinedload(Chamado.maquina),
        joinedload(Chamado.logs).joinedload(LogChamado.autor)
    ).filter(Chamado.id == chamado_id).first()


def criar_chamado(db: Session, chamado_data: dict, usuario_id: int) -> Chamado:
    """Cria um novo chamado (apenas USUARIO)."""
    # Busca org do usuario
    user = db.query(User).filter(User.id == usuario_id).first()
    chamado = Chamado(
        titulo=chamado_data["titulo"],
        descricao=chamado_data["descricao"],
        prioridade=chamado_data.get("prioridade", "MEDIA"),
        imagem_url=chamado_data.get("imagem_url"),
        maquina_id=chamado_data.get("maquina_id"),
        usuario_id=usuario_id,
        organizacao_id=user.organizacao_id if user else None,
        status=StatusChamado.ABERTO
    )
    db.add(chamado)
    db.commit()
    db.refresh(chamado)
    return chamado


def atribuir_tecnico(
    db: Session,
    chamado_id: int,
    tecnico_id: int,
    admin_user: User
) -> Optional[Chamado]:
    """
    Admin atribui um tecnico ao chamado.
    Muda status para EM_ATENDIMENTO.
    """
    if admin_user.role != Role.ADMIN:
        return None

    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        return None

    # Verifica se o tecnico existe e tem role TECNICO
    tecnico = db.query(User).filter(
        User.id == tecnico_id,
        User.role == Role.TECNICO
    ).first()
    if not tecnico:
        return None

    chamado.tecnico_id = tecnico_id
    chamado.status = StatusChamado.EM_ATENDIMENTO
    chamado.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(chamado)
    return chamado


def finalizar_chamado(
    db: Session,
    chamado_id: int,
    tecnico_user: User,
    resolucao: str,
    imagem_url: Optional[str] = None
) -> Optional[Chamado]:
    """
    Tecnico finaliza chamado com relatorio obrigatorio.
    So o tecnico atribuido pode finalizar.
    """
    if tecnico_user.role != Role.TECNICO:
        return None

    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        return None

    # Verifica se o tecnico e o atribuido
    if chamado.tecnico_id != tecnico_user.id:
        return None

    # Verifica se o chamado esta em atendimento
    if chamado.status != StatusChamado.EM_ATENDIMENTO:
        return None

    chamado.status = StatusChamado.FINALIZADO
    chamado.resolucao = resolucao
    chamado.resolucao_imagem_url = imagem_url
    chamado.finalizado_at = datetime.utcnow()
    chamado.updated_at = datetime.utcnow()

    # Adiciona log automatico de finalizacao
    log = LogChamado(
        chamado_id=chamado_id,
        autor_id=tecnico_user.id,
        mensagem=f"Chamado finalizado: {resolucao}",
        imagem_url=imagem_url
    )
    db.add(log)
    db.commit()
    db.refresh(chamado)
    return chamado


def atualizar_chamado(
    db: Session,
    chamado_id: int,
    dados: dict,
    user: User
) -> Optional[Chamado]:
    """
    Atualiza um chamado existente.
    - ADMIN: pode atualizar qualquer campo
    - TECNICO: so pode atualizar se for o atribuido
    - USUARIO: nao pode atualizar (so cria)
    """
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        return None

    # Verifica permissoes
    if user.role == Role.USUARIO:
        return None

    if user.role == Role.TECNICO:
        if chamado.tecnico_id != user.id:
            return None

    # Atualiza campos fornecidos
    for campo, valor in dados.items():
        if valor is not None and hasattr(chamado, campo):
            setattr(chamado, campo, valor)

    chamado.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(chamado)
    return chamado


def deletar_chamado(db: Session, chamado_id: int, user: User) -> bool:
    """Deleta um chamado. Somente ADMIN pode deletar."""
    if user.role != Role.ADMIN:
        return False

    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        return False

    db.delete(chamado)
    db.commit()
    return True


def adicionar_log(
    db: Session,
    chamado_id: int,
    autor_id: int,
    mensagem: str,
    imagem_url: Optional[str] = None
) -> Optional[LogChamado]:
    """Adiciona um log/mensagem a um chamado."""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()
    if not chamado:
        return None

    log = LogChamado(
        chamado_id=chamado_id,
        autor_id=autor_id,
        mensagem=mensagem,
        imagem_url=imagem_url
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def listar_logs(db: Session, chamado_id: int) -> list[LogChamado]:
    """Lista todos os logs de um chamado."""
    return db.query(LogChamado).options(
        joinedload(LogChamado.autor)
    ).filter(
        LogChamado.chamado_id == chamado_id
    ).order_by(LogChamado.created_at.asc()).all()


def listar_tecnicos(db: Session, organizacao_id: int = None) -> list[User]:
    """Lista tecnicos filtrados por organizacao."""
    query = db.query(User).filter(User.role == Role.TECNICO)
    if organizacao_id:
        query = query.filter(User.organizacao_id == organizacao_id)
    return query.all()
