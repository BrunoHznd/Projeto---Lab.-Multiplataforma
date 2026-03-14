"""Script para registrar o usuario admin inicial."""
import sys
sys.path.insert(0, ".")
from app.database import SessionLocal, create_tables
from app.models import User, Role
from app.services.auth_service import hash_senha

create_tables()
db = SessionLocal()

# Verifica se ja existe
existente = db.query(User).filter(User.email == "admin@fatec.sp.gov.br").first()
if existente:
    print(f"Admin ja existe! ID={existente.id}, Role={existente.role.value}")
else:
    admin = User(
        nome="Admin",
        email="admin@fatec.sp.gov.br",
        senha_hash=hash_senha("admin123"),
        role=Role.ADMIN,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print(f"Admin criado com sucesso! ID={admin.id}")

# Cria tambem um usuario tecnico e um usuario comum para testes
for dados in [
    ("Tecnico CI", "tecnico@fatec.sp.gov.br", "tech123", Role.TECNICO),
    ("Aluno Teste", "aluno@fatec.sp.gov.br", "aluno123", Role.USUARIO),
]:
    nome, email, senha, role = dados
    existe = db.query(User).filter(User.email == email).first()
    if not existe:
        user = User(nome=nome, email=email, senha_hash=hash_senha(senha), role=role)
        db.add(user)
        db.commit()
        print(f"Usuario '{nome}' ({role.value}) criado!")
    else:
        print(f"'{nome}' ja existe.")

db.close()
print("\nUsuarios prontos para uso!")
print("  Admin:   admin@fatec.sp.gov.br   / admin123")
print("  Tecnico: tecnico@fatec.sp.gov.br / tech123")
print("  Aluno:   aluno@fatec.sp.gov.br   / aluno123")
