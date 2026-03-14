"""
tiResolve - Router de Monitoramento
Endpoints para receber dados de agents e consultar máquinas.
Inclui endpoint para download do agent com ID da org embutido.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, StatusMaquina, Maquina, Chamado, Organizacao, Role
from app.schemas import (
    MonitoramentoData, MaquinaResponse, MaquinaUpdate, MaquinaCreate,
    ChamadoResponse
)
from app.services.monitoramento_service import (
    processar_dados_monitoramento, listar_maquinas,
    obter_maquina, atualizar_maquina, deletar_maquina
)
from app.utils.dependencies import get_current_user, require_tecnico_or_admin

router = APIRouter(tags=["Monitoramento"])


AGENT_TEMPLATE = '''"""
tiResolve - Agent de Monitoramento
Configurado para a organizacao: {org_nome}
Codigo: {org_codigo}

Uso:
    python tiresolve_agent.py
    
Dependencias:
    pip install psutil requests
"""

import json, os, sys, time, socket, platform, subprocess
from datetime import datetime

try:
    import psutil
    import requests
except ImportError:
    print("Dependencias nao instaladas. Execute:")
    print("   pip install psutil requests")
    sys.exit(1)

# ===== CONFIGURACAO =====
API_URL = "{api_url}/monitoramento"
CODIGO_ORGANIZACAO = "{org_codigo}"
MACHINE_ID = f"pc_{{socket.gethostname().lower()}}"
INTERVALO = 60  # segundos

def obter_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "0.0.0.0"

def verificar_ping(host="8.8.8.8"):
    try:
        param = "-n" if platform.system().lower() == "windows" else "-c"
        r = subprocess.run(["ping", param, "1", "-w", "2000", host],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
        return r.returncode == 0
    except:
        return False

def ciclo():
    ts = datetime.utcnow().isoformat()
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory().percent
    online = verificar_ping()
    
    print(f"[{{ts}}] CPU: {{cpu}}% | Mem: {{mem}}% | {{'ONLINE' if online else 'OFFLINE'}}")
    
    dados = {{
        "machine_id": MACHINE_ID,
        "cpu": cpu,
        "memory": mem,
        "status": "ONLINE" if online else "OFFLINE",
        "timestamp": ts,
        "ip": obter_ip(),
        "codigo_organizacao": CODIGO_ORGANIZACAO
    }}
    
    try:
        r = requests.post(API_URL, json=dados, timeout=10)
        if r.status_code in [200, 201]:
            print("  -> Enviado!")
        else:
            print(f"  -> Erro: {{r.status_code}}")
    except Exception as e:
        print(f"  -> Falha: {{e}}")

if __name__ == "__main__":
    print("=" * 50)
    print("tiResolve Agent - {org_nome}")
    print(f"Maquina: {{MACHINE_ID}}")
    print(f"Org: {{CODIGO_ORGANIZACAO}}")
    print(f"API: {{API_URL}}")
    print("=" * 50)
    print("Ctrl+C para parar\\n")
    
    try:
        while True:
            ciclo()
            time.sleep(INTERVALO)
    except KeyboardInterrupt:
        print("\\nAgent encerrado.")
'''


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


@router.get("/maquinas/download-agent")
async def download_agent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gera script Python do agent com o ID da org embutido."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=400, detail="Sem organizacao vinculada")

    org = db.query(Organizacao).filter(Organizacao.id == current_user.organizacao_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizacao nao encontrada")

    # Gera o script com as variaveis da org embutidas
    script = AGENT_TEMPLATE.format(
        org_nome=org.nome,
        org_codigo=org.codigo_acesso,
        api_url="http://SEU_IP:8000"
    )

    return PlainTextResponse(
        content=script,
        media_type="text/x-python",
        headers={"Content-Disposition": f"attachment; filename=tiresolve_agent_{org.codigo_acesso}.py"}
    )


@router.get("/maquinas", response_model=list[MaquinaResponse])
async def lista_maquinas(
    status_filter: Optional[StatusMaquina] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista maquinas filtradas por organizacao do usuario."""
    return listar_maquinas(db, status_filter, skip, limit, current_user.organizacao_id)


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
