"""
tiResolve - Router de Upload de Imagens
Endpoint para upload de imagens (chamados e resolucoes).
"""

import os
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse

from app.models import User
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/upload", tags=["Upload"])

# Diretorio de uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Extensoes permitidas
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_SIZE_MB = 5


@router.post("/")
async def upload_imagem(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload de imagem. Retorna URL da imagem salva."""
    # Valida extensao
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensao nao permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Le conteudo
    content = await file.read()

    # Valida tamanho
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Maximo: {MAX_SIZE_MB}MB"
        )

    # Gera nome unico
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Salva arquivo
    with open(filepath, "wb") as f:
        f.write(content)

    # Retorna URL relativa
    return {"url": f"/upload/files/{filename}", "filename": filename}


@router.get("/files/{filename}")
async def get_file(filename: str):
    """Serve uma imagem salva."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")
    return FileResponse(filepath)
