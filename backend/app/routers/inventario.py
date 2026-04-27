"""
tiResolve - Router de Inventario
CRUD de itens de inventario com campos dinamicos e garantia.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role, InventarioItem
from app.schemas import (
    InventarioItemCreate, InventarioItemUpdate, InventarioItemResponse
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/inventario", tags=["Inventario"])


@router.get("", response_model=list[InventarioItemResponse])
async def listar_inventario(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista itens do inventario da organizacao."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    if not current_user.organizacao_id:
        raise HTTPException(status_code=400, detail="Usuario nao pertence a nenhuma organizacao. Crie ou entre em uma primeiro.")
    return db.query(InventarioItem).filter(
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).order_by(InventarioItem.created_at.desc()).all()


@router.post("", response_model=InventarioItemResponse, status_code=201)
async def criar_item(
    dados: InventarioItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um item no inventario."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    item = InventarioItem(
        organizacao_id=current_user.organizacao_id,
        nome=dados.nome,
        descricao=dados.descricao,
        foto_url=dados.foto_url,
        garantia=dados.garantia,
        garantia_ate=dados.garantia_ate,
        campos_extras=dados.campos_extras or {}
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=InventarioItemResponse)
async def obter_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtem um item do inventario."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")
    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    return item


@router.put("/{item_id}", response_model=InventarioItemResponse)
async def atualizar_item(
    item_id: int,
    dados: InventarioItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza um item do inventario."""
    if current_user.role not in [Role.ADMIN, Role.TECNICO]:
        raise HTTPException(status_code=403, detail="Acesso restrito")

    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def deletar_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove um item do inventario. Apenas ADMIN."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas admin pode remover itens")

    item = db.query(InventarioItem).filter(
        InventarioItem.id == item_id,
        InventarioItem.organizacao_id == current_user.organizacao_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")

    db.delete(item)
    db.commit()
