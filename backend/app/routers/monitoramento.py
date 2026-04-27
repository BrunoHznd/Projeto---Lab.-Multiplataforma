"""
tiResolve - Router de Monitoramento
Endpoints para receber dados de agents e consultar máquinas.
Inclui endpoint para download do agent com ID da org embutido.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, StatusMaquina, Maquina, Chamado, Organizacao, Role, TipoMaquina, GrupoMaquina
from app.schemas import (
    MonitoramentoData, MaquinaResponse, MaquinaUpdate, MaquinaCreate,
    ChamadoResponse, GrupoCreate, GrupoResponse, GrupoUpdate
)
from app.services.monitoramento_service import (
    processar_dados_monitoramento, listar_maquinas,
    obter_maquina, atualizar_maquina, deletar_maquina
)
from app.utils.dependencies import get_current_user, require_tecnico_or_admin

router = APIRouter(tags=["Monitoramento"])


import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
AGENTS_DIR = os.path.join(BASE_DIR, "agents")


@router.post(
    "/monitoramento",
    response_model=MaquinaResponse,
    status_code=status.HTTP_201_CREATED
)
async def receber_monitoramento(
    dados: MonitoramentoData,
    db: Session = Depends(get_db)
):
    """Recebe dados de monitoramento dos agents Python."""
    return processar_dados_monitoramento(db, dados.model_dump())


def _construir_api_url(request: Request) -> str:
    """Constrói a URL pública da API a partir dos headers da requisição."""
    scheme = request.headers.get("x-forwarded-proto", "http")
    host = request.headers.get("host", "localhost:8000")
    # Se o host for localhost/127.0.0.1 (proxy interno), tenta x-forwarded-host
    if "127.0.0.1" in host or "localhost" in host:
        host = request.headers.get("x-forwarded-host", host)
    return f"{scheme}://{host}/api/monitoramento"


@router.get("/maquinas/download-agent/hardware")
async def download_agent_hardware(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gera script Python do agent de hardware pronto para executar."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=400, detail="Sem organizacao vinculada")

    org = db.query(Organizacao).filter(Organizacao.id == current_user.organizacao_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizacao nao encontrada")

    agent_path = os.path.join(AGENTS_DIR, "monitor_agent.py")
    if not os.path.exists(agent_path):
        raise HTTPException(status_code=500, detail="Arquivo base do agent de hardware nao encontrado")

    with open(agent_path, "r", encoding="utf-8") as f:
        script = f.read()

    # Injeta código da org e URL da API no script
    api_url = _construir_api_url(request)
    script = script.replace("COLE_SEU_CODIGO_AQUI", org.codigo_acesso)
    script = script.replace("__API_URL__", api_url)

    return PlainTextResponse(
        content=script,
        media_type="text/x-python",
        headers={"Content-Disposition": f"attachment; filename=tiresolve_agent_hw_{org.codigo_acesso}.py"}
    )


@router.get("/maquinas/download-agent/rede")
async def download_agent_rede(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gera script Python do agent de rede pronto para executar."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=400, detail="Sem organizacao vinculada")

    org = db.query(Organizacao).filter(Organizacao.id == current_user.organizacao_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizacao nao encontrada")

    agent_path = os.path.join(AGENTS_DIR, "network_agent.py")
    if not os.path.exists(agent_path):
        raise HTTPException(status_code=500, detail="Arquivo base do agent de rede nao encontrado")

    with open(agent_path, "r", encoding="utf-8") as f:
        script = f.read()

    # Injeta código da org e URL da API no script
    api_url = _construir_api_url(request)
    script = script.replace("COLE_SEU_CODIGO_AQUI", org.codigo_acesso)
    script = script.replace("__API_URL__", api_url)

    return PlainTextResponse(
        content=script,
        media_type="text/x-python",
        headers={"Content-Disposition": f"attachment; filename=tiresolve_agent_rede_{org.codigo_acesso}.py"}
    )


@router.get("/maquinas", response_model=list[MaquinaResponse])
async def lista_maquinas(
    status_filter: Optional[StatusMaquina] = Query(None, alias="status"),
    tipo: Optional[TipoMaquina] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista maquinas filtradas por organizacao do usuario e tipo."""
    return listar_maquinas(db, status_filter, tipo, skip, limit, current_user.organizacao_id)


# ==================== GRUPOS ====================

@router.get("/grupos", response_model=list[GrupoResponse])
async def listar_grupos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista grupos de infraestrutura da organização do usuário."""
    if not current_user.organizacao_id:
        return []
    return db.query(GrupoMaquina).filter(GrupoMaquina.organizacao_id == current_user.organizacao_id).all()


@router.post("/grupos", response_model=GrupoResponse, status_code=status.HTTP_201_CREATED)
async def criar_grupo(
    dados: GrupoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um novo grupo de infraestrutura."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=400, detail="Sem organizacao vinculada")
        
    grupo = GrupoMaquina(nome=dados.nome, organizacao_id=current_user.organizacao_id)
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo

@router.delete("/grupos/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_grupo(
    grupo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    
    grupo = db.query(GrupoMaquina).filter(
        GrupoMaquina.id == grupo_id,
        GrupoMaquina.organizacao_id == current_user.organizacao_id
    ).first()
    
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    
    db.delete(grupo)
    db.commit()
    return None

@router.post(
    "/maquinas",
    response_model=MaquinaResponse,
    status_code=status.HTTP_201_CREATED
)
async def criar_maquina(
    dados: MaquinaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tecnico_or_admin)
):
    """Cria uma nova maquina/equipamento. ADMIN ou TECNICO."""
    existente = db.query(Maquina).filter(
        Maquina.nome == dados.nome,
        Maquina.organizacao_id == current_user.organizacao_id
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ja existe uma maquina com esse nome na sua organizacao")
    maquina = Maquina(
        nome=dados.nome,
        ip=dados.ip,
        localizacao=dados.localizacao,
        organizacao_id=current_user.organizacao_id
    )
    db.add(maquina)
    db.commit()
    db.refresh(maquina)
    return maquina


@router.get("/maquinas/{maquina_id}", response_model=MaquinaResponse)
async def detalhe_maquina(
    maquina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtém detalhes de uma máquina específica."""
    maquina = obter_maquina(db, maquina_id)
    if not maquina:
        raise HTTPException(status_code=404, detail="Maquina nao encontrada")
    return maquina


@router.get("/maquinas/{maquina_id}/chamados", response_model=list[ChamadoResponse])
async def historico_chamados_maquina(
    maquina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os chamados associados a uma maquina."""
    maquina = obter_maquina(db, maquina_id)
    if not maquina:
        raise HTTPException(status_code=404, detail="Maquina nao encontrada")
    chamados = db.query(Chamado).options(
        joinedload(Chamado.usuario),
        joinedload(Chamado.tecnico)
    ).filter(
        Chamado.maquina_id == maquina_id
    ).order_by(Chamado.created_at.desc()).all()
    return chamados


@router.put("/maquinas/{maquina_id}", response_model=MaquinaResponse)
async def editar_maquina(
    maquina_id: int,
    dados: MaquinaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tecnico_or_admin)
):
    """Atualiza dados de uma máquina."""
    maquina = atualizar_maquina(db, maquina_id, dados.model_dump(exclude_unset=True))
    if not maquina:
        raise HTTPException(status_code=404, detail="Maquina nao encontrada")
    return maquina


@router.delete("/maquinas/{maquina_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_maquina(
    maquina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tecnico_or_admin)
):
    """Remove uma máquina do monitoramento."""
    if not deletar_maquina(db, maquina_id):
        raise HTTPException(status_code=404, detail="Maquina nao encontrada")
