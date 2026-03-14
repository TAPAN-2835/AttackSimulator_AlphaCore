from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from templates.templates_data import get_all_templates, get_template

router = APIRouter()


class TemplateOut(BaseModel):
    id: str
    name: str
    type: str
    difficulty: str
    subject: str
    body: str
    cta_text: str
    landing_page: str


@router.get("/", response_model=list[TemplateOut])
async def list_templates():
    """Return all available simulation templates."""
    return get_all_templates()


@router.get("/{template_id}", response_model=TemplateOut)
async def get_template_by_id(template_id: str):
    """Return a single simulation template by its string ID."""
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return template
