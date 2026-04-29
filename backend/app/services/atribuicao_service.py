"""
tiResolve - Servico de Atribuicao Automatica de Chamados.

Regras:
- Cada tecnico tem um limite individual de chamados EM_ATENDIMENTO configurado
  pelo Admin (campo max_tickets no User). O default e 10 se nao definido.
  Chamados FINALIZADOS e ABERTOS sem atribuicao nao contam.
- Chamado classificado como `OUTROS` -> tecnico com MENOS chamados EM_ATENDIMENTO
  na organizacao (qualquer habilidade).
- Caso contrario, o chamado vai SOMENTE para tecnico com a habilidade EXATA
  requerida. Dentre varios candidatos, prioriza o de MENOR carga.
- Se nao houver tecnico com a habilidade exata OU todos estiverem no limite,
  retorna None -> chamado fica ABERTO e cabe ao ADMIN decidir.
  NAO ha fallback para habilidades similares.
"""

from __future__ import annotations

from typing import Optional, Iterable

from sqlalchemy.orm import Session

from app.models import User, Chamado, Role, StatusChamado, Categoria
from app.services.ml_service import categoria_para_habilidade

LIMITE_TICKETS_PADRAO = 10


def _tickets_em_atendimento(db: Session, tecnico_id: int) -> int:
    """Conta apenas chamados EM_ATENDIMENTO atribuidos ao tecnico."""
    return (
        db.query(Chamado)
        .filter(
            Chamado.tecnico_id == tecnico_id,
            Chamado.status == StatusChamado.EM_ATENDIMENTO,
        )
        .count()
    )


def _tecnicos_da_org(db: Session, organizacao_id: Optional[int]) -> list[User]:
    q = db.query(User).filter(User.role == Role.TECNICO)
    if organizacao_id is not None:
        q = q.filter(User.organizacao_id == organizacao_id)
    return q.all()


def _filtra_por_habilidade(tecnicos: Iterable[User], habilidade: str) -> list[User]:
    out = []
    for t in tecnicos:
        habs = t.habilidades or []
        if habilidade in habs:
            out.append(t)
    return out


def _melhor_tecnico(
    db: Session,
    candidatos: list[User],
) -> Optional[User]:
    """Dentre os candidatos, retorna o que tem MENOS tickets EM_ATENDIMENTO
    e ainda esta abaixo do seu limite individual (max_tickets). Em caso de
    empate, escolhe o de menor id (estavel)."""
    melhor: Optional[User] = None
    melhor_count: int = -1
    for t in candidatos:
        limite = t.max_tickets if t.max_tickets is not None else LIMITE_TICKETS_PADRAO
        count = _tickets_em_atendimento(db, t.id)
        if count >= limite:
            continue
        if melhor is None or count < melhor_count or (
            count == melhor_count and t.id < melhor.id
        ):
            melhor = t
            melhor_count = count
    return melhor


def escolher_tecnico(
    db: Session,
    organizacao_id: Optional[int],
    categoria: Categoria,
) -> Optional[User]:
    """Aplica as regras e retorna o tecnico escolhido (ou None p/ Admin decidir)."""
    tecnicos = _tecnicos_da_org(db, organizacao_id)
    if not tecnicos:
        return None

    # OUTROS -> tecnico com menos tickets ativos (qualquer skill)
    if categoria == Categoria.OUTROS:
        return _melhor_tecnico(db, tecnicos)

    habilidade_alvo = categoria_para_habilidade(categoria)
    if not habilidade_alvo:
        return _melhor_tecnico(db, tecnicos)

    # Tecnicos com a habilidade exata e com vaga disponivel
    candidatos = _filtra_por_habilidade(tecnicos, habilidade_alvo)
    escolhido = _melhor_tecnico(db, candidatos)
    if escolhido is not None:
        return escolhido

    # Sem tecnico disponivel com a skill exata -> Admin decide
    return None
