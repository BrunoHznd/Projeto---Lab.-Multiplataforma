"""
tiResolve - Migracao do Banco de Dados
Adiciona colunas e tabelas novas sem perder dados existentes.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "tiresolve.db")


def migrate():
    if not os.path.exists(DB_PATH):
        print("Banco nao encontrado. Sera criado ao iniciar o backend.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ===== Tabela organizacoes =====
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(255) NOT NULL,
            logo_url VARCHAR(500),
            codigo_acesso VARCHAR(36) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  [OK] tabela organizacoes criada/verificada")

    # ===== Tabela inventario =====
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizacao_id INTEGER NOT NULL REFERENCES organizacoes(id),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            foto_url VARCHAR(500),
            garantia BOOLEAN DEFAULT 0,
            garantia_ate DATETIME,
            campos_extras JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  [OK] tabela inventario criada/verificada")

    # ===== Colunas novas em tabelas existentes =====
    migrations = [
        ("users", "organizacao_id", "INTEGER REFERENCES organizacoes(id)"),
        ("chamados", "imagem_url", "VARCHAR(500)"),
        ("chamados", "resolucao", "TEXT"),
        ("chamados", "resolucao_imagem_url", "VARCHAR(500)"),
        ("chamados", "finalizado_at", "DATETIME"),
        ("chamados", "maquina_id", "INTEGER REFERENCES maquinas(id)"),
        ("chamados", "organizacao_id", "INTEGER REFERENCES organizacoes(id)"),
        ("maquinas", "organizacao_id", "INTEGER REFERENCES organizacoes(id)"),
        ("logs_chamado", "imagem_url", "VARCHAR(500)"),
    ]

    for table, column, col_type in migrations:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            print(f"  [OK] {table}.{column} adicionada")
        except sqlite3.OperationalError:
            print(f"  [--] {table}.{column} ja existe")

    conn.commit()
    conn.close()
    print("\nMigracao concluida!")


if __name__ == "__main__":
    migrate()
