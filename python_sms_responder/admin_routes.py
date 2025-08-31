from fastapi import APIRouter, HTTPException, Body, Depends, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import os
from .business_knowledge import BusinessKnowledge

router = APIRouter(prefix="/admin", tags=["admin"])

# Initialize BusinessKnowledge service
business_knowledge = BusinessKnowledge()

# Admin authentication - simple for demo purposes
def verify_admin_token(token: str = Query(...)):
    """Simple admin token verification"""
    admin_token = os.getenv("ADMIN_TOKEN", "admin123")
    if token != admin_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True

# Models for requests
class BusinessInfoUpdate(BaseModel):
    """Model for updating business information"""
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    hours: Optional[Dict[str, str]] = None

class FAQItem(BaseModel):
    """Model for FAQ item"""
    question: str
    answer: str

class ServiceItem(BaseModel):
    """Model for service item"""
    name: str
    price: str
    duration: int
    description: Optional[str] = None

class PromotionItem(BaseModel):
    """Model for promotion item"""
    title: str
    description: str
    expiration_date: Optional[str] = None
    code: Optional[str] = None

class StaffItem(BaseModel):
    """Model for staff item"""
    name: str
    title: str
    specialties: List[str]
    bio: Optional[str] = None

# Routes
@router.get("/business-knowledge")
async def get_business_knowledge(authorized: bool = Depends(verify_admin_token)):
    """Get all business knowledge"""
    return business_knowledge.get_all_knowledge()

@router.put("/business-info")
async def update_business_info(
    info: BusinessInfoUpdate,
    authorized: bool = Depends(verify_admin_token)
):
    """Update business information"""
    result = business_knowledge.update_business_info(info.dict(exclude_none=True))
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update business information")
    return {"message": "Business information updated successfully"}

@router.get("/faqs")
async def get_faqs(authorized: bool = Depends(verify_admin_token)):
    """Get all FAQs"""
    return business_knowledge.get_faqs()

@router.post("/faqs")
async def add_faq(
    faq: FAQItem,
    authorized: bool = Depends(verify_admin_token)
):
    """Add a new FAQ"""
    result = business_knowledge.add_faq(faq.question, faq.answer)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to add FAQ")
    return {"message": "FAQ added successfully"}

@router.get("/services")
async def get_services(authorized: bool = Depends(verify_admin_token)):
    """Get all services"""
    return business_knowledge.get_services()

@router.post("/services/{category}")
async def add_service(
    category: str,
    service: ServiceItem,
    authorized: bool = Depends(verify_admin_token)
):
    """Add a new service to a category"""
    result = business_knowledge.add_service(category, service.dict())
    if not result:
        raise HTTPException(status_code=500, detail="Failed to add service")
    return {"message": f"Service added successfully to {category}"}

@router.get("/promotions")
async def get_promotions(authorized: bool = Depends(verify_admin_token)):
    """Get all promotions"""
    return business_knowledge.get_promotions()

@router.post("/promotions")
async def add_promotion(
    promotion: PromotionItem,
    authorized: bool = Depends(verify_admin_token)
):
    """Add a new promotion"""
    result = business_knowledge.add_promotion(promotion.dict())
    if not result:
        raise HTTPException(status_code=500, detail="Failed to add promotion")
    return {"message": "Promotion added successfully"}

@router.get("/staff")
async def get_staff(authorized: bool = Depends(verify_admin_token)):
    """Get all staff information"""
    return business_knowledge.get_staff()

@router.get("/llm-prompt")
async def get_llm_prompt(authorized: bool = Depends(verify_admin_token)):
    """Get the formatted business knowledge for LLM prompt"""
    return {"prompt": business_knowledge.get_knowledge_for_llm()}
