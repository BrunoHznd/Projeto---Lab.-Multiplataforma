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

from app.models import (
    Chamado, LogChamado, StatusChamado, User, Role,
    Notificacao, TipoNotificacao, Categoria, Prioridade
)
from app.services.push_service import enviar_push_para_usuario
from app.services.ml_service import classificar
from app.services.atribuicao_service import escolher_tecnico


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
    """Cria um novo chamado.

    Fluxo:
    1. Classifica titulo+descricao via ML -> `Categoria`.
    2. Tenta auto-atribuir tecnico (regras de habilidade + limite 10).
    3. Se atribuiu, status=EM_ATENDIMENTO, gera notificacao para o tecnico.
    4. Caso contrario, status=ABERTO -> ADMIN decide.
    """
    user = db.query(User).filter(User.id == usuario_id).first()
    org_id = user.organizacao_id if user else None

    titulo = chamado_data["titulo"]
    descricao = chamado_data["descricao"]

    # 1) Classificacao via ML
    categoria = classificar(titulo, descricao)

    chamado = Chamado(
        titulo=titulo,
        descricao=descricao,
        prioridade=Prioridade.NENHUMA,  # so tecnico/admin definem depois
        categoria=categoria,
        imagem_url=chamado_data.get("imagem_url"),
        maquina_id=chamado_data.get("maquina_id"),
        usuario_id=usuario_id,
        organizacao_id=org_id,
        status=StatusChamado.ABERTO,
    )
    db.add(chamado)
    db.flush()

    # 2) Auto-atribuicao
    tecnico = escolher_tecnico(db, org_id, categoria)
    if tecnico is not None:
        chamado.tecnico_id = tecnico.id
        chamado.status = StatusChamado.EM_ATENDIMENTO

        titulo_notif = "\U0001F4E5 Novo Chamado Atribuido"
        corpo_notif = (
            f"Chamado #{chamado.id} ({categoria.value}) atribuido automaticamente a voce."
        )
        db.add(Notificacao(
            user_id=tecnico.id,
            chamado_id=chamado.id,
            tipo=TipoNotificacao.STATUS,
            titulo=titulo_notif,
            corpo=corpo_notif,
        ))

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

    # Cria notificacao para o usuario dono do chamado
    titulo_notif = "🔧 Técnico Atribuído!"
    corpo_notif = f"Chamado #{chamado.id} agora está em atendimento com {tecnico.nome}."
    notif = Notificacao(
        user_id=chamado.usuario_id,
        chamado_id=chamado.id,
        tipo=TipoNotificacao.STATUS,
        titulo=titulo_notif,
        corpo=corpo_notif
    )
    db.add(notif)

    db.commit()
    db.refresh(chamado)

    # Dados para retorno — push será enviado pelo router (async)
    chamado._push_info = {
        "user_id": chamado.usuario_id,
        "titulo": titulo_notif,
        "corpo": corpo_notif,
        "data": {"chamado_id": chamado.id, "tipo": "STATUS"}
    }

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

    # Cria notificacao para o usuario dono do chamado
    titulo_notif = "✅ Chamado Finalizado!"
    corpo_notif = f"Chamado #{chamado.id} foi resolvido: {resolucao[:80]}{'...' if len(resolucao) > 80 else ''}"
    notif = Notificacao(
        user_id=chamado.usuario_id,
        chamado_id=chamado.id,
        tipo=TipoNotificacao.FINALIZADO,
        titulo=titulo_notif,
        corpo=corpo_notif
    )
    db.add(notif)

    db.commit()
    db.refresh(chamado)

    # Dados para retorno — push será enviado pelo router (async)
    chamado._push_info = {
        "user_id": chamado.usuario_id,
        "titulo": titulo_notif,
        "corpo": corpo_notif,
        "data": {"chamado_id": chamado.id, "tipo": "FINALIZADO"}
    }

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
    Gera notificacao para o USUARIO dono do chamado quando houver alteracao.
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

    # Regra: prioridade so pode ser alterada pelo TECNICO atribuido ou ADMIN.
    # (TECNICO ja foi validado acima como sendo o atribuido; ADMIN passa).
    # Se for outra role, remove o campo silenciosamente.
    if "prioridade" in dados and user.role not in (Role.ADMIN, Role.TECNICO):
        dados.pop("prioridade", None)

    # Detecta mudancas relevantes para notificacao
    alteracoes = []
    status_antigo = chamado.status
    prioridade_antiga = chamado.prioridade

    # Atualiza campos fornecidos
    for campo, valor in dados.items():
        if valor is not None and hasattr(chamado, campo):
            setattr(chamado, campo, valor)

    # Verifica o que mudou para gerar notificacao
    if "status" in dados and dados["status"] is not None and str(dados["status"]) != str(status_antigo):
        status_novo = dados["status"]
        alteracoes.append(f"Status alterado para {status_novo}")
    if "prioridade" in dados and dados["prioridade"] is not None and str(dados["prioridade"]) != str(prioridade_antiga):
        alteracoes.append(f"Prioridade alterada para {dados['prioridade']}")

    chamado.updated_at = datetime.utcnow()

    # Gera notificacao para o USUARIO dono do chamado (se quem editou nao for ele)
    if alteracoes and chamado.usuario_id != user.id:
        titulo_notif = "📝 Chamado Atualizado!"
        corpo_notif = f"Chamado #{chamado.id}: {', '.join(alteracoes)}"
        notif = Notificacao(
            user_id=chamado.usuario_id,
            chamado_id=chamado.id,
            tipo=TipoNotificacao.STATUS,
            titulo=titulo_notif,
            corpo=corpo_notif
        )
        db.add(notif)

        # Dados para push (enviado pelo router)
        chamado._push_info = {
            "user_id": chamado.usuario_id,
            "titulo": titulo_notif,
            "corpo": corpo_notif,
            "data": {"chamado_id": chamado.id, "tipo": "STATUS"}
        }

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
