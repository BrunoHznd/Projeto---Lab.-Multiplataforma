"""
tiResolve - Schemas Pydantic
Define os schemas de request/response para a API.
"""

from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, field_validator

from app.models import (
    Role, StatusChamado, Prioridade, StatusMaquina,
    TipoNotificacao, TipoMaquina, Categoria, Habilidade
)


# ==================== ORGANIZACAO ====================

class OrganizacaoCreate(BaseModel):
    """Schema para criar organizacao (fluxo 'Sou Novo Na Plataforma')."""
    nome_empresa: str
    email_admin: str
    senha_admin: str
    logo_url: Optional[str] = None


class OrganizacaoResponse(BaseModel):
    """Schema de resposta de organizacao."""
    id: int
    nome: str
    logo_url: Optional[str] = None
    codigo_acesso: str
    created_at: datetime

    class Config:
        from_attributes = True


class RegistroComID(BaseModel):
    """Schema para cadastro de usuario com codigo da organizacao."""
    email: str
    senha: str
    nome: str
    codigo_organizacao: str


# ==================== AUTH ====================

class LoginRequest(BaseModel):
    """Schema de requisicao de login."""
    email: str
    senha: str


class TokenResponse(BaseModel):
    """Schema de resposta com token JWT."""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"
    organizacao: Optional[OrganizacaoResponse] = None


# ==================== USERS ====================

class UserCreate(BaseModel):
    """Schema para criacao de usuario."""
    nome: str
    email: str
    senha: str
    role: Role = Role.USUARIO
    habilidades: Optional[List[Habilidade]] = None
    max_tickets: Optional[int] = None

    @field_validator("habilidades")
    @classmethod
    def _valida_habilidades(cls, v, info):
        role = info.data.get("role")
        if role == Role.TECNICO:
            if not v or len(v) < 1:
                raise ValueError("Tecnico deve ter pelo menos 1 habilidade")
        return v


class UserUpdate(BaseModel):
    """Schema para atualizacao de usuario."""
    nome: Optional[str] = None
    email: Optional[str] = None
    role: Optional[Role] = None
    habilidades: Optional[List[Habilidade]] = None
    max_tickets: Optional[int] = None


class AlterarSenhaRequest(BaseModel):
    """Schema para troca de senha."""
    senha_atual: str
    nova_senha: str


class UserStatsResponse(BaseModel):
    """Schema com estatísticas do usuario."""
    id: int
    nome: str
    email: str
    role: Role
    total_chamados: int = 0
    chamados_abertos: int = 0
    chamados_finalizados: int = 0


class UserResponse(BaseModel):
    """Schema de resposta de usuario."""
    id: int
    nome: str
    email: str
    role: Role
    organizacao_id: Optional[int] = None
    habilidades: Optional[List[str]] = None
    max_tickets: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CHAMADOS ====================

class ChamadoCreate(BaseModel):
    """Schema para criacao de chamado (apenas USUARIO cria).
    Prioridade NAO eh aceita aqui: somente o tecnico atribuido ou ADMIN definem.
    A categoria eh determinada automaticamente pelo classificador de ML.
    """
    titulo: str
    descricao: str
    imagem_url: Optional[str] = None
    maquina_id: Optional[int] = None


class ChamadoUpdate(BaseModel):
    """Schema para atualizacao de chamado."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[StatusChamado] = None
    prioridade: Optional[Prioridade] = None
    tecnico_id: Optional[int] = None


class ChamadoEditRequest(BaseModel):
    """Schema para edicao pelo USUARIO (gera log automatico)."""
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    imagem_url: Optional[str] = None


class AtribuirTecnicoRequest(BaseModel):
    """Schema para atribuir tecnico a um chamado (apenas ADMIN)."""
    tecnico_id: int


class FinalizarChamadoRequest(BaseModel):
    """Schema para finalizar chamado (apenas TECNICO atribuido)."""
    resolucao: str
    imagem_url: Optional[str] = None


class ChamadoResponse(BaseModel):
    """Schema de resposta de chamado."""
    id: int
    titulo: str
    descricao: str
    imagem_url: Optional[str] = None
    status: StatusChamado
    prioridade: Prioridade
    categoria: Categoria
    usuario_id: int
    tecnico_id: Optional[int] = None
    maquina_id: Optional[int] = None
    organizacao_id: Optional[int] = None
    resolucao: Optional[str] = None
    resolucao_imagem_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    finalizado_at: Optional[datetime] = None
    usuario: Optional[UserResponse] = None
    tecnico: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ==================== LOGS DE CHAMADO (CHAT) ====================

class LogChamadoCreate(BaseModel):
    """Schema para enviar mensagem no chat do chamado."""
    mensagem: str
    imagem_url: Optional[str] = None


class LogChamadoResponse(BaseModel):
    """Schema de resposta de log/mensagem de chamado."""
    id: int
    chamado_id: int
    autor_id: int
    mensagem: str
    imagem_url: Optional[str] = None
    created_at: datetime
    autor: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ==================== GRUPOS ====================

class GrupoCreate(BaseModel):
    """Schema para criar um grupo de infraestrutura."""
    nome: str


class GrupoUpdate(BaseModel):
    """Schema para atualizar um grupo."""
    nome: str


class GrupoResponse(BaseModel):
    """Schema de resposta de um grupo."""
    id: int
    nome: str
    organizacao_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== MONITORAMENTO ====================

class MonitoramentoData(BaseModel):
    """Schema para dados enviados pelo agent de monitoramento."""
    machine_id: str
    tipo: TipoMaquina = TipoMaquina.HARDWARE
    cpu: Optional[float] = None
    memory: Optional[float] = None
    download_speed: Optional[float] = None
    upload_speed: Optional[float] = None
    status: StatusMaquina = StatusMaquina.ONLINE
    timestamp: Optional[datetime] = None
    ip: Optional[str] = None
    localizacao: Optional[str] = None
    codigo_organizacao: Optional[str] = None
    # Token gerado quando o agent foi baixado a partir de um item de Inventario.
    # Quando presente, vincula a Maquina diretamente ao InventarioItem (sem duplicar).
    agent_token: Optional[str] = None


class MaquinaResponse(BaseModel):
    """Schema de resposta de maquina monitorada."""
    id: int
    nome: str
    identificador_agente: Optional[str] = None
    tipo: TipoMaquina
    ip: Optional[str] = None
    localizacao: Optional[str] = None
    grupo_id: Optional[int] = None
    grupo: Optional[GrupoResponse] = None
    ultimo_status: StatusMaquina
    cpu_uso: float
    memoria_uso: float
    download_speed: float
    upload_speed: float
    ultima_verificacao: Optional[datetime] = None
    inventario_item_id: Optional[int] = None

    class Config:
        from_attributes = True


class MaquinaCreate(BaseModel):
    """Schema para criacao de maquina."""
    nome: str
    tipo: TipoMaquina = TipoMaquina.HARDWARE
    ip: Optional[str] = None
    localizacao: Optional[str] = None
    grupo_id: Optional[int] = None


class MaquinaUpdate(BaseModel):
    """Schema para atualizacao manual de maquina."""
    nome: Optional[str] = None
    ip: Optional[str] = None
    localizacao: Optional[str] = None
    grupo_id: Optional[int] = None


# ==================== INVENTARIO ====================

class InventarioItemCreate(BaseModel):
    """Schema para criar item de inventario."""
    nome: str
    descricao: Optional[str] = None
    foto_url: Optional[str] = None
    garantia: bool = False
    garantia_ate: Optional[datetime] = None
    campos_extras: Optional[dict[str, Any]] = None
    # Quando True, gera agent_token e cria placeholder em Infraestrutura.
    incluir_em_infraestrutura: bool = False
    # Tipo do agent (HARDWARE ou REDE). Obrigatorio se incluir_em_infraestrutura=True.
    tipo_dispositivo: Optional[TipoMaquina] = None


class InventarioItemUpdate(BaseModel):
    """Schema para atualizar item de inventario."""
    nome: Optional[str] = None
    descricao: Optional[str] = None
    foto_url: Optional[str] = None
    garantia: Optional[bool] = None
    garantia_ate: Optional[datetime] = None
    campos_extras: Optional[dict[str, Any]] = None
    incluir_em_infraestrutura: Optional[bool] = None
    tipo_dispositivo: Optional[TipoMaquina] = None


class InventarioItemResponse(BaseModel):
    """Schema de resposta de item de inventario."""
    id: int
    organizacao_id: int
    nome: str
    descricao: Optional[str] = None
    foto_url: Optional[str] = None
    garantia: bool
    garantia_ate: Optional[datetime] = None
    campos_extras: Optional[dict[str, Any]] = None
    agent_token: Optional[str] = None
    tipo_dispositivo: Optional[TipoMaquina] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== NOTIFICACOES ====================

class NotificacaoResponse(BaseModel):
    """Schema de resposta de notificacao."""
    id: int
    user_id: int
    chamado_id: Optional[int] = None
    tipo: TipoNotificacao
    titulo: str
    corpo: Optional[str] = None
    lida: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Atualiza referencias circulares
TokenResponse.model_rebuild()
