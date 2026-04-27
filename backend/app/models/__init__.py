"""
tiResolve - Modelos do Banco de Dados
Define as entidades: Organizacao, User, Chamado, LogChamado, Maquina, InventarioItem.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    Float, ForeignKey, Enum as SAEnum, Boolean, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


# ==================== ENUMS ====================

class Role(str, enum.Enum):
    """Papeis de usuario no sistema."""
    ADMIN = "ADMIN"
    TECNICO = "TECNICO"
    USUARIO = "USUARIO"


class StatusChamado(str, enum.Enum):
    """Status possiveis de um chamado."""
    ABERTO = "ABERTO"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    FINALIZADO = "FINALIZADO"


class Prioridade(str, enum.Enum):
    """Niveis de prioridade de um chamado."""
    NENHUMA = "NENHUMA"
    BAIXA = "BAIXA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    CRITICA = "CRITICA"


class StatusMaquina(str, enum.Enum):
    """Status de uma maquina monitorada."""
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


class TipoMaquina(str, enum.Enum):
    """Tipo do equipamento monitorado."""
    HARDWARE = "HARDWARE"
    REDE = "REDE"


# ==================== MODELOS ====================

class Organizacao(Base):
    """Modelo de organizacao/empresa."""
    __tablename__ = "organizacoes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    codigo_acesso = Column(String(36), unique=True, index=True, nullable=False,
                           default=lambda: str(uuid.uuid4())[:8].upper())
    created_at = Column(DateTime, default=datetime.now)

    # Relacionamentos
    usuarios = relationship("User", back_populates="organizacao")
    chamados = relationship("Chamado", back_populates="organizacao")
    maquinas = relationship("Maquina", back_populates="organizacao")
    inventario = relationship("InventarioItem", back_populates="organizacao")
    grupos = relationship("GrupoMaquina", back_populates="organizacao")


class GrupoMaquina(Base):
    """Modelo de grupo de maquinas (substitui a localizacao em texto livre)."""
    __tablename__ = "grupos_maquinas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    organizacao_id = Column(Integer, ForeignKey("organizacoes.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    # Relacionamentos
    organizacao = relationship("Organizacao", back_populates="grupos")
    maquinas = relationship("Maquina", back_populates="grupo")


class User(Base):
    """Modelo de usuario do sistema."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(Role), default=Role.USUARIO, nullable=False)
    organizacao_id = Column(Integer, ForeignKey("organizacoes.id"), nullable=True)
    push_token = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # Relacionamentos
    organizacao = relationship("Organizacao", back_populates="usuarios")
    chamados_abertos = relationship(
        "Chamado",
        back_populates="usuario",
        foreign_keys="Chamado.usuario_id"
    )
    chamados_atendidos = relationship(
        "Chamado",
        back_populates="tecnico",
        foreign_keys="Chamado.tecnico_id"
    )
    logs = relationship("LogChamado", back_populates="autor")


class Chamado(Base):
    """Modelo de chamado tecnico."""
    __tablename__ = "chamados"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    titulo = Column(String(500), nullable=False)
    descricao = Column(Text, nullable=False)
    imagem_url = Column(String(500), nullable=True)
    status = Column(
        SAEnum(StatusChamado),
        default=StatusChamado.ABERTO,
        nullable=False
    )
    prioridade = Column(
        SAEnum(Prioridade),
        default=Prioridade.MEDIA,
        nullable=False
    )
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True)
    organizacao_id = Column(Integer, ForeignKey("organizacoes.id"), nullable=True)
    resolucao = Column(Text, nullable=True)
    resolucao_imagem_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    finalizado_at = Column(DateTime, nullable=True)

    # Relacionamentos
    organizacao = relationship("Organizacao", back_populates="chamados")
    usuario = relationship(
        "User",
        back_populates="chamados_abertos",
        foreign_keys=[usuario_id]
    )
    tecnico = relationship(
        "User",
        back_populates="chamados_atendidos",
        foreign_keys=[tecnico_id]
    )
    maquina = relationship("Maquina", back_populates="chamados")
    logs = relationship(
        "LogChamado",
        back_populates="chamado",
        cascade="all, delete-orphan"
    )


class LogChamado(Base):
    """Modelo de log/mensagem de um chamado (tambem usado como chat)."""
    __tablename__ = "logs_chamado"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    chamado_id = Column(Integer, ForeignKey("chamados.id"), nullable=False)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mensagem = Column(Text, nullable=False)
    imagem_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # Relacionamentos
    chamado = relationship("Chamado", back_populates="logs")
    autor = relationship("User", back_populates="logs")


class Maquina(Base):
    """Modelo de maquina monitorada na rede ou conexão de rede."""
    __tablename__ = "maquinas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False, index=True)
    identificador_agente = Column(String(255), nullable=True, index=True)
    tipo = Column(SAEnum(TipoMaquina), default=TipoMaquina.HARDWARE, nullable=False)
    ip = Column(String(45), nullable=True)
    localizacao = Column(String(255), nullable=True) # Mantido por retrocompatibilidade, mas será deprecado nas listagens
    grupo_id = Column(Integer, ForeignKey("grupos_maquinas.id"), nullable=True)
    ultimo_status = Column(
        SAEnum(StatusMaquina),
        default=StatusMaquina.OFFLINE,
        nullable=False
    )
    cpu_uso = Column(Float, default=0.0)
    memoria_uso = Column(Float, default=0.0)
    download_speed = Column(Float, default=0.0)  # Em Mbps
    upload_speed = Column(Float, default=0.0)    # Em Mbps
    ultima_verificacao = Column(DateTime, nullable=True)
    organizacao_id = Column(Integer, ForeignKey("organizacoes.id"), nullable=True)

    # Relacionamentos
    organizacao = relationship("Organizacao", back_populates="maquinas")
    grupo = relationship("GrupoMaquina", back_populates="maquinas")
    chamados = relationship("Chamado", back_populates="maquina")


class InventarioItem(Base):
    """Modelo de item de inventario."""
    __tablename__ = "inventario"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    organizacao_id = Column(Integer, ForeignKey("organizacoes.id"), nullable=False)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    foto_url = Column(String(500), nullable=True)
    garantia = Column(Boolean, default=False)
    garantia_ate = Column(DateTime, nullable=True)
    campos_extras = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relacionamentos
    organizacao = relationship("Organizacao", back_populates="inventario")


# ==================== NOTIFICAÇÕES ====================

class TipoNotificacao(str, enum.Enum):
    """Tipos de notificacao do sistema."""
    STATUS = "STATUS"
    MENSAGEM = "MENSAGEM"
    FINALIZADO = "FINALIZADO"


class Notificacao(Base):
    """Modelo de notificacao in-app para o mobile."""
    __tablename__ = "notificacoes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chamado_id = Column(Integer, ForeignKey("chamados.id"), nullable=True)
    tipo = Column(SAEnum(TipoNotificacao), nullable=False)
    titulo = Column(String(255), nullable=False)
    corpo = Column(Text, nullable=True)
    lida = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    # Relacionamentos
    usuario = relationship("User")
    chamado = relationship("Chamado")
