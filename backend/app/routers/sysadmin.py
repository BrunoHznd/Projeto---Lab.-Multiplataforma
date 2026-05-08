"""
tiResolve - Router SysAdmin
Endpoints exclusivos do administrador global do sistema.
Permite criar, listar, editar e remover organizações e seus administradores.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Role, Organizacao, Chamado, StatusChamado
from app.schemas import OrganizacaoResponse, UserResponse
from app.services.auth_service import hash_senha, criar_token_acesso
from app.utils.dependencies import require_sysadmin

router = APIRouter(prefix="/sysadmin", tags=["SysAdmin"])


# ==================== SCHEMAS LOCAIS ====================

class OrgCreateFull(BaseModel):
    """Cria organização + admin dela."""
    nome_empresa: str
    email_admin: str
    senha_admin: str
    nome_admin: Optional[str] = None
    logo_url: Optional[str] = None


class OrgUpdateRequest(BaseModel):
    """Atualiza dados de uma organização."""
    nome: Optional[str] = None
    logo_url: Optional[str] = None


class OrgStatsResponse(BaseModel):
    """Resposta com stats de uma organização."""
    id: int
    nome: str
    logo_url: Optional[str] = None
    codigo_acesso: str
    created_at: datetime
    total_usuarios: int
    usuarios_admin: int = 0
    usuarios_tecnico: int = 0
    usuarios_comum: int = 0
    total_chamados: int
    chamados_abertos: int
    chamados_em_atendimento: int
    chamados_finalizados: int

    class Config:
        from_attributes = True


class SysAdminCreate(BaseModel):
    """Cria um novo usuário SYSADMIN."""
    nome: str
    email: str
    senha: str


# ==================== ENDPOINTS ====================

@router.get("/organizacoes", response_model=List[OrgStatsResponse])
async def listar_organizacoes(
    db: Session = Depends(get_db),
    _: User = Depends(require_sysadmin)
):
    """Lista todas as organizações com estatísticas."""
    orgs = db.query(Organizacao).order_by(Organizacao.created_at.desc()).all()
    resultado = []
    for org in orgs:
        usuarios_q = db.query(User).filter(User.organizacao_id == org.id)
        total_usuarios = usuarios_q.count()
        usuarios_admin = usuarios_q.filter(User.role == Role.ADMIN).count()
        usuarios_tecnico = usuarios_q.filter(User.role == Role.TECNICO).count()
        usuarios_comum = usuarios_q.filter(User.role == Role.USUARIO).count()
        chamados = db.query(Chamado).filter(Chamado.organizacao_id == org.id)
        total_ch = chamados.count()
        abertos = chamados.filter(Chamado.status == StatusChamado.ABERTO).count()
        em_atend = chamados.filter(Chamado.status == StatusChamado.EM_ATENDIMENTO).count()
        finalizados = chamados.filter(Chamado.status == StatusChamado.FINALIZADO).count()
        resultado.append(OrgStatsResponse(
            id=org.id,
            nome=org.nome,
            logo_url=org.logo_url,
            codigo_acesso=org.codigo_acesso,
            created_at=org.created_at,
            total_usuarios=total_usuarios,
            usuarios_admin=usuarios_admin,
            usuarios_tecnico=usuarios_tecnico,
            usuarios_comum=usuarios_comum,
            total_chamados=total_ch,
            chamados_abertos=abertos,
            chamados_em_atendimento=em_atend,
            chamados_finalizados=finalizados,
        ))
    return resultado


@router.post("/organizacoes", response_model=OrgStatsResponse, status_code=status.HTTP_201_CREATED)
async def criar_organizacao(
    dados: OrgCreateFull,
    db: Session = Depends(get_db),
    _: User = Depends(require_sysadmin)
):
    """Cria nova organização com seu administrador."""
    if db.query(User).filter(User.email == dados.email_admin).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado no sistema")

    nova_org = Organizacao(nome=dados.nome_empresa, logo_url=dados.logo_url)
    db.add(nova_org)
    db.flush()

    nome_admin = dados.nome_admin or f"Admin {dados.nome_empresa}"
    novo_admin = User(
        nome=nome_admin,
        email=dados.email_admin,
        senha_hash=hash_senha(dados.senha_admin),
        role=Role.ADMIN,
        organizacao_id=nova_org.id,
    )
    db.add(novo_admin)
    db.commit()
    db.refresh(nova_org)

    return OrgStatsResponse(
        id=nova_org.id,
        nome=nova_org.nome,
        logo_url=nova_org.logo_url,
        codigo_acesso=nova_org.codigo_acesso,
        created_at=nova_org.created_at,
        total_usuarios=1,
        total_chamados=0,
        chamados_abertos=0,
        chamados_em_atendimento=0,
        chamados_finalizados=0,
    )


@router.put("/organizacoes/{org_id}", response_model=OrgStatsResponse)
async def editar_organizacao(
    org_id: int,
    dados: OrgUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_sysadmin)
):
    """Edita nome ou logo de uma organização."""
    org = db.query(Organizacao).filter(Organizacao.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada")

    if dados.nome is not None:
        org.nome = dados.nome
    if dados.logo_url is not None:
        org.logo_url = dados.logo_url

    db.commit()
    db.refresh(org)

    total_usuarios = db.query(User).filter(User.organizacao_id == org.id).count()
    chamados = db.query(Chamado).filter(Chamado.organizacao_id == org.id)
    return OrgStatsResponse(
        id=org.id,
        nome=org.nome,
        logo_url=org.logo_url,
        codigo_acesso=org.codigo_acesso,
        created_at=org.created_at,
        total_usuarios=total_usuarios,
        total_chamados=chamados.count(),
        chamados_abertos=chamados.filter(Chamado.status == StatusChamado.ABERTO).count(),
        chamados_em_atendimento=chamados.filter(Chamado.status == StatusChamado.EM_ATENDIMENTO).count(),
        chamados_finalizados=chamados.filter(Chamado.status == StatusChamado.FINALIZADO).count(),
    )


@router.delete("/organizacoes/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_organizacao(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_sysadmin)
):
    """Remove uma organização e todos os seus dados."""
    org = db.query(Organizacao).filter(Organizacao.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada")
    db.delete(org)
    db.commit()
    return


@router.get("/organizacoes/{org_id}/usuarios", response_model=List[UserResponse])
async def listar_usuarios_org(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_sysadmin)
):
    """Lista todos os usuários de uma organização."""
    org = db.query(Organizacao).filter(Organizacao.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada")
    return db.query(User).filter(User.organizacao_id == org_id).order_by(User.created_at.desc()).all()


@router.post("/criar-sysadmin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def criar_sysadmin(
    dados: SysAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_sysadmin)
):
    """Cria um novo usuário com role SYSADMIN."""
    if db.query(User).filter(User.email == dados.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado no sistema")

    novo = User(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        role=Role.SYSADMIN,
        organizacao_id=None,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return UserResponse.model_validate(novo)


@router.get("/me", response_model=UserResponse)
async def sysadmin_me(current_user: User = Depends(require_sysadmin)):
    """Retorna dados do sysadmin logado."""
    return UserResponse.model_validate(current_user)
