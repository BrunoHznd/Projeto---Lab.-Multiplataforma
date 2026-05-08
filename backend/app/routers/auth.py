"""
tiResolve - Router de Autenticacao
Endpoints de login, registro, criacao de organizacao e cadastro com ID.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role, Organizacao, Chamado, StatusChamado
from app.schemas import (
    LoginRequest, TokenResponse, UserCreate, UserResponse, UserUpdate,
    OrganizacaoResponse, RegistroComID,
    AlterarSenhaRequest, UserStatsResponse
)
from app.services.auth_service import (
    hash_senha, autenticar_usuario, criar_token_acesso, verificar_senha
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticacao"])


@router.post("/login", response_model=TokenResponse)
async def login(dados: LoginRequest, db: Session = Depends(get_db)):
    """Autentica o usuario e retorna um token JWT + dados da organizacao."""
    user = autenticar_usuario(db, dados.email, dados.senha)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = criar_token_acesso(data={"sub": str(user.id), "role": user.role.value})

    # Busca organizacao do usuario
    org = None
    if user.organizacao_id:
        org_obj = db.query(Organizacao).filter(Organizacao.id == user.organizacao_id).first()
        if org_obj:
            org = OrganizacaoResponse.model_validate(org_obj)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
        organizacao=org
    )


# Observacao: o antigo endpoint publico POST /auth/criar-organizacao foi
# removido. A criacao de novas organizacoes agora e exclusiva do SysAdmin
# atraves de POST /sysadmin/organizacoes.


@router.post("/registrar-com-id", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def registrar_com_id(dados: RegistroComID, db: Session = Depends(get_db)):
    """Registra um USUARIO usando o codigo de acesso da organizacao."""
    # Verifica se email ja existe
    user_existente = db.query(User).filter(User.email == dados.email).first()
    if user_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email indisponivel"
        )

    # Busca organizacao pelo codigo
    org = db.query(Organizacao).filter(
        Organizacao.codigo_acesso == dados.codigo_organizacao.upper()
    ).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Codigo de organizacao invalido"
        )

    # Cria o usuario (sempre USUARIO - tecnicos/admins sao criados pelo admin)
    novo_user = User(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        role=Role.USUARIO,
        organizacao_id=org.id
    )
    db.add(novo_user)
    db.commit()
    db.refresh(novo_user)

    token = criar_token_acesso(data={"sub": str(novo_user.id), "role": Role.USUARIO.value})

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(novo_user),
        organizacao=OrganizacaoResponse.model_validate(org)
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def register(
    dados: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra um novo usuario (ADMIN cria tecnicos/admins na mesma org)."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar usuarios"
        )

    user_existente = db.query(User).filter(User.email == dados.email).first()
    if user_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ja cadastrado no sistema"
        )

    # Habilidades obrigatorias para TECNICO
    habilidades = None
    if dados.habilidades:
        habilidades = [h.value if hasattr(h, "value") else str(h) for h in dados.habilidades]
    if dados.role == Role.TECNICO and not habilidades:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tecnico deve ter pelo menos 1 habilidade"
        )

    novo_user = User(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        role=dados.role,
        organizacao_id=current_user.organizacao_id,
        habilidades=habilidades or [],
        max_tickets=dados.max_tickets if dados.role == Role.TECNICO and dados.max_tickets is not None else (10 if dados.role == Role.TECNICO else None),
    )
    db.add(novo_user)
    db.commit()
    db.refresh(novo_user)

    return UserResponse.model_validate(novo_user)


@router.get("/users", response_model=list[UserResponse])
async def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista usuarios da mesma organizacao. Apenas ADMIN."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem listar usuarios"
        )
    return db.query(User).filter(
        User.organizacao_id == current_user.organizacao_id
    ).order_by(User.created_at.desc()).all()


@router.get("/tecnicos", response_model=list[UserResponse])
async def listar_tecnicos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista tecnicos da mesma organizacao."""
    return db.query(User).filter(
        User.role == Role.TECNICO,
        User.organizacao_id == current_user.organizacao_id
    ).all()


@router.get("/organizacao", response_model=OrganizacaoResponse)
async def obter_organizacao(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna dados da organizacao do usuario logado."""
    if not current_user.organizacao_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario nao pertence a nenhuma organizacao"
        )
    org = db.query(Organizacao).filter(Organizacao.id == current_user.organizacao_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizacao nao encontrada")
    return org


@router.put("/organizacao/logo", response_model=OrganizacaoResponse)
async def atualizar_logo_org(
    dados: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin atualiza a logo da organizacao."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=404, detail="Usuario nao pertence a nenhuma organizacao")
    org = db.query(Organizacao).filter(Organizacao.id == current_user.organizacao_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizacao nao encontrada")
    logo_url = dados.get("logo_url")
    if logo_url is not None:
        org.logo_url = logo_url
    db.commit()
    db.refresh(org)
    return org


@router.put("/users/{user_id}", response_model=UserResponse)
async def editar_usuario(
    user_id: int,
    dados: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin edita nome/role de um usuario da mesma org."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores")

    user = db.query(User).filter(
        User.id == user_id,
        User.organizacao_id == current_user.organizacao_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    if dados.nome is not None:
        user.nome = dados.nome
    if dados.role is not None:
        user.role = dados.role
    if dados.email is not None:
        existente = db.query(User).filter(User.email == dados.email, User.id != user_id).first()
        if existente:
            raise HTTPException(status_code=400, detail="Email indisponivel")
        user.email = dados.email
    if dados.habilidades is not None:
        user.habilidades = [h.value if hasattr(h, "value") else str(h) for h in dados.habilidades]
    if dados.max_tickets is not None and user.role == Role.TECNICO:
        user.max_tickets = dados.max_tickets

    # Tecnico precisa ter ao menos 1 habilidade
    if user.role == Role.TECNICO and (not user.habilidades or len(user.habilidades) < 1):
        raise HTTPException(
            status_code=400,
            detail="Tecnico deve ter pelo menos 1 habilidade"
        )

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/redefinir-senha")
async def redefinir_senha(dados: dict, db: Session = Depends(get_db)):
    """Redefine a senha do usuario validando email + codigo da organizacao.

    Body: {email: str, codigo_organizacao: str, nova_senha: str}
    Fluxo sem e-mail: usuario precisa conhecer o codigo da sua organizacao.
    SYSADMIN (sem organizacao) nao pode usar este fluxo.
    """
    email = (dados.get("email") or "").strip()
    codigo = (dados.get("codigo_organizacao") or "").strip().upper()
    nova_senha = dados.get("nova_senha") or ""

    if not email or not codigo or not nova_senha:
        raise HTTPException(status_code=400, detail="Preencha email, codigo da organizacao e nova senha")
    if len(nova_senha) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter no minimo 6 caracteres")

    org = db.query(Organizacao).filter(Organizacao.codigo_acesso == codigo).first()
    if not org:
        raise HTTPException(status_code=400, detail="Email ou codigo da organizacao invalido")

    user = db.query(User).filter(
        User.email == email,
        User.organizacao_id == org.id
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Email ou codigo da organizacao invalido")

    user.senha_hash = hash_senha(nova_senha)
    db.commit()
    return {"detail": "Senha redefinida com sucesso"}


@router.put("/alterar-senha")
async def alterar_senha(
    dados: AlterarSenhaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Qualquer usuario pode alterar a propria senha."""
    if not verificar_senha(dados.senha_atual, current_user.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")

    current_user.senha_hash = hash_senha(dados.nova_senha)
    db.commit()
    return {"detail": "Senha alterada com sucesso"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_usuario(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exclui um usuario da organizacao. Apenas ADMIN."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem excluir usuarios")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Nao e possivel excluir o proprio usuario")

    user = db.query(User).filter(
        User.id == user_id,
        User.organizacao_id == current_user.organizacao_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    # Verifica se o usuario tem chamados nao finalizados
    chamados_pendentes = db.query(Chamado).filter(
        Chamado.usuario_id == user_id,
        Chamado.status != StatusChamado.FINALIZADO
    ).count()
    if chamados_pendentes > 0:
        raise HTTPException(
            status_code=400,
            detail="Nao e possivel excluir usuario com chamados pendentes (abra, em atendimento ou finalizados). Finalize ou reatribua os chamados primeiro."
        )

    # Verifica se o usuario e tecnico de chamados pendentes
    chamados_tecnico = db.query(Chamado).filter(
        Chamado.tecnico_id == user_id,
        Chamado.status != StatusChamado.FINALIZADO
    ).count()
    if chamados_tecnico > 0:
        raise HTTPException(
            status_code=400,
            detail="Nao e possivel excluir usuario que e tecnico em chamados pendentes. Reatribua os chamados primeiro."
        )

    db.delete(user)
    db.commit()
    return


@router.get("/users/{user_id}/stats", response_model=UserStatsResponse)
async def stats_usuario(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna total de chamados de um usuario. ADMIN/TECNICO."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    user = db.query(User).filter(
        User.id == user_id,
        User.organizacao_id == current_user.organizacao_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    total = db.query(Chamado).filter(Chamado.usuario_id == user_id).count()
    abertos = db.query(Chamado).filter(
        Chamado.usuario_id == user_id,
        Chamado.status != StatusChamado.FINALIZADO
    ).count()
    finalizados = db.query(Chamado).filter(
        Chamado.usuario_id == user_id,
        Chamado.status == StatusChamado.FINALIZADO
    ).count()

    return UserStatsResponse(
        id=user.id, nome=user.nome, email=user.email, role=user.role,
        total_chamados=total, chamados_abertos=abertos, chamados_finalizados=finalizados
    )


@router.post("/push-token")
async def registrar_push_token(
    dados: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra o Expo Push Token do dispositivo do usuario."""
    token = dados.get("push_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="push_token é obrigatório"
        )

    # Salva/atualiza o push token do usuario
    current_user.push_token = token
    db.commit()

    return {"detail": "Push token registrado com sucesso"}

