"""
Script para criar o primeiro usuario SYSADMIN da plataforma.
Execute uma vez para bootstrapar o acesso global ao sistema.

Uso:
    python register_sysadmin.py
    python register_sysadmin.py --email meu@email.com --senha minhasenha --nome "Meu Nome"
"""
import sys
import argparse

sys.path.insert(0, ".")

from app.database import SessionLocal, create_tables
from app.models import User, Role
from app.services.auth_service import hash_senha

parser = argparse.ArgumentParser(description="Cria o usuario SYSADMIN inicial")
parser.add_argument("--email", default="sysadmin@tiresolve.io", help="Email do sysadmin")
parser.add_argument("--senha", default="sysadmin123", help="Senha do sysadmin")
parser.add_argument("--nome", default="SysAdmin", help="Nome do sysadmin")
args = parser.parse_args()

create_tables()
db = SessionLocal()

existente = db.query(User).filter(User.email == args.email).first()
if existente:
    if existente.role == Role.SYSADMIN:
        print(f"[--] SysAdmin ja existe! ID={existente.id}, Email={existente.email}")
    else:
        existente.role = Role.SYSADMIN
        db.commit()
        print(f"[OK] Usuario {existente.email} promovido a SYSADMIN (ID={existente.id})")
else:
    sysadmin = User(
        nome=args.nome,
        email=args.email,
        senha_hash=hash_senha(args.senha),
        role=Role.SYSADMIN,
        organizacao_id=None,
    )
    db.add(sysadmin)
    db.commit()
    db.refresh(sysadmin)
    print(f"[OK] SysAdmin criado com sucesso! ID={sysadmin.id}")

db.close()
print("\n=== Credenciais do SysAdmin ===")
print(f"  Email: {args.email}")
print(f"  Senha: {args.senha}")
print("\nAcesse o painel web e faca login com essas credenciais.")
print("O SysAdmin sera redirecionado automaticamente para /sysadmin\n")
