"""
tiResolve - Migração do Banco de Dados
Cria/atualiza tabelas usando SQLAlchemy (compatível com PostgreSQL e SQLite).
"""

import sys
sys.path.insert(0, ".")

from app.database import engine, create_tables, SessionLocal
from app.models import (
    Organizacao, User, Chamado, LogChamado,
    Maquina, InventarioItem, Notificacao, VisualizacaoChamado
)


def migrate():
    """Cria todas as tabelas definidas nos models do SQLAlchemy."""
    print(f"Conectando ao banco: {engine.url}")
    print("Criando/verificando tabelas...")

    create_tables()

    # Lista tabelas criadas
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tabelas = inspector.get_table_names()

    print(f"\nTabelas no banco ({len(tabelas)}):")
    for t in sorted(tabelas):
        print(f"  ✔ {t}")

    print("\nMigração concluída com sucesso!")


if __name__ == "__main__":
    migrate()
