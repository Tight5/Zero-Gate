"""
Grants router for Zero Gate ESO Platform
Handles grant management with backwards planning and timeline tracking
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging

# Mock auth dependencies for development
def require_auth():
    return {"id": "dev-user", "tenant_id": "dev-tenant"}

def require_role(role: str):
    def dependency():
        return {"id": "dev-user", "tenant_id": "dev-tenant", "role": role}
    return dependency

def get_current_user_tenant(user):
    return "dev-tenant"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v2/grants", tags=["grants"])

# Pydantic Models
class GrantCreate(BaseModel):
    title: str = Field(..., description="Grant title")
    funder: str = Field(..., description="Grant funding organization")
    amount: Optional[float] = Field(None, description="Grant amount requested")
    deadline: datetime = Field(..., description="Grant submission deadline")
    description: Optional[str] = Field(None, description="Grant description")
    status: Optional[str] = Field("draft", description="Grant status")

class GrantUpdate(BaseModel):
    title: Optional[str] = None
    funder: Optional[str] = None
    amount: Optional[float] = None
    deadline: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[str] = None

class GrantResponse(BaseModel):
    id: str
    title: str
    funder: str
    amount: Optional[float]
    deadline: datetime
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    tenant_id: str

class GrantMilestone(BaseModel):
    id: str
    grant_id: str
    title: str
    description: str
    due_date: datetime
    status: str
    milestone_type: str
    created_at: datetime

class GrantTimeline(BaseModel):
    grant_id: str
    milestones: List[GrantMilestone]
    total_milestones: int
    completed_milestones: int
    completion_percentage: float
    next_milestone: Optional[GrantMilestone]

@router.get("/")
async def list_grants(
    request: Request,
    current_user=Depends(require_auth),
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None
):
    """List all grants for the current tenant with filtering"""
    try:
        tenant_id = get_current_user_tenant(current_user)
        
        # Mock data for development
        mock_grants = [
            {
                "id": f"grant-{i}",
                "title": f"Mock Grant {i}",
                "funder": f"Foundation {i}",
                "amount": 50000.0 * i,
                "deadline": (datetime.utcnow() + timedelta(days=30 * i)).isoformat(),
                "description": f"Description for grant {i}",
                "status": "active" if i % 2 == 0 else "draft",
                "tenant_id": tenant_id,
                "created_at": "2024-01-01T00:00:00Z"
            }
            for i in range(1, 6)
        ]
        
        # Filter by status if specified
        if status:
            mock_grants = [g for g in mock_grants if g["status"] == status]
        
        # Apply pagination
        total = len(mock_grants)
        paginated = mock_grants[offset:offset + limit]
        
        grant_list = [
            GrantResponse(
                id=grant["id"],
                title=grant["title"],
                funder=grant["funder"],
                amount=grant["amount"],
                deadline=datetime.fromisoformat(grant["deadline"]),
                description=grant["description"],
                status=grant["status"],
                created_at=datetime.fromisoformat(grant["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(grant["created_at"].replace("Z", "+00:00")),
                tenant_id=grant["tenant_id"]
            )
            for grant in paginated
        ]
        
        return {
            "grants": grant_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Error listing grants: {e}")
        return {
            "grants": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }

@router.post("/", response_model=GrantResponse)
async def create_grant(
    grant_data: GrantCreate,
    request: Request,
    current_user=Depends(require_role("user"))
):
    """Create a new grant"""
    try:
        tenant_id = get_current_user_tenant(current_user)
        
        # Mock implementation for development
        new_grant = GrantResponse(
            id=f"grant-new",
            title=grant_data.title,
            funder=grant_data.funder,
            amount=grant_data.amount,
            deadline=grant_data.deadline,
            description=grant_data.description,
            status=grant_data.status or "draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tenant_id=tenant_id
        )
        
        return new_grant
    
    except Exception as e:
        logger.error(f"Error creating grant: {e}")
        raise HTTPException(status_code=500, detail="Failed to create grant")

@router.get("/{grant_id}")
async def get_grant(
    grant_id: str,
    request: Request,
    current_user=Depends(require_auth)
):
    """Get a specific grant by ID"""
    try:
        tenant_id = get_current_user_tenant(current_user)
        
        # Mock grant data
        grant = GrantResponse(
            id=grant_id,
            title=f"Mock Grant {grant_id}",
            funder="Mock Foundation",
            amount=100000.0,
            deadline=datetime.utcnow() + timedelta(days=90),
            description="Mock grant description",
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tenant_id=tenant_id
        )
        
        return grant
    
    except Exception as e:
        logger.error(f"Error getting grant: {e}")
        raise HTTPException(status_code=404, detail="Grant not found")

@router.get("/{grant_id}/timeline")
async def get_grant_timeline(
    grant_id: str,
    request: Request,
    current_user=Depends(require_auth)
):
    """Get grant timeline with backwards planning milestones"""
    try:
        tenant_id = get_current_user_tenant(current_user)
        
        # Mock timeline with 90/60/30-day milestones
        base_date = datetime.utcnow()
        
        milestones = [
            GrantMilestone(
                id=f"milestone-{i}",
                grant_id=grant_id,
                title=f"Milestone {i}",
                description=f"Description for milestone {i}",
                due_date=base_date + timedelta(days=30 * i),
                status="pending" if i > 1 else "completed",
                milestone_type="preparation",
                created_at=base_date
            )
            for i in range(1, 4)
        ]
        
        completed = len([m for m in milestones if m.status == "completed"])
        total = len(milestones)
        
        timeline = GrantTimeline(
            grant_id=grant_id,
            milestones=milestones,
            total_milestones=total,
            completed_milestones=completed,
            completion_percentage=(completed / total) * 100,
            next_milestone=milestones[1] if len(milestones) > 1 else None
        )
        
        return timeline
    
    except Exception as e:
        logger.error(f"Error getting grant timeline: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve grant timeline")

@router.get("/analytics/overview")
async def get_grants_analytics(
    request: Request,
    current_user=Depends(require_auth)
):
    """Get grants analytics overview"""
    try:
        tenant_id = get_current_user_tenant(current_user)
        
        # Mock analytics data
        analytics = {
            "total_grants": 25,
            "active_grants": 15,
            "completed_grants": 8,
            "draft_grants": 2,
            "total_funding_requested": 2500000.0,
            "total_funding_awarded": 1800000.0,
            "success_rate": 0.72,
            "average_grant_size": 100000.0
        }
        
        return analytics
    
    except Exception as e:
        logger.error(f"Error getting grants analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve grants analytics")