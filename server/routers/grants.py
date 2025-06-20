"""
Grants router for Zero Gate ESO Platform
Handles grant data, timelines, and backwards planning milestones with PostgreSQL integration
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field
import json
import uuid
from server.auth.jwt_auth import require_auth, require_role, get_current_user_tenant
from shared.schema import grants, grant_milestones, sponsors

logger = logging.getLogger("zero-gate.grants")

router = APIRouter(prefix="/api/v2/grants", tags=["grants"])

class GrantCreate(BaseModel):
    sponsor_id: str = Field(..., description="ID of the sponsoring organization")
    name: str = Field(..., description="Grant name or title")
    amount: Optional[float] = Field(None, description="Grant amount")
    submission_deadline: date = Field(..., description="Grant submission deadline")
    description: Optional[str] = Field(None, description="Grant description")
    priority: Optional[str] = Field("medium", description="Grant priority (low, medium, high)")

class GrantUpdate(BaseModel):
    sponsor_id: Optional[str] = None
    name: Optional[str] = None
    amount: Optional[float] = None
    submission_deadline: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class GrantResponse(BaseModel):
    id: str
    sponsor_id: str
    sponsor_name: Optional[str]
    name: str
    amount: Optional[float]
    submission_deadline: date
    description: Optional[str]
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    tenant_id: str
    days_remaining: Optional[int]

class MilestoneResponse(BaseModel):
    id: str
    grant_id: str
    milestone_date: date
    title: str
    description: Optional[str]
    tasks: List[str]
    status: str
    created_at: datetime

class GrantTimelineResponse(BaseModel):
    grant_id: str
    grant_name: str
    submission_deadline: date
    status: str
    days_remaining: int
    milestones: List[MilestoneResponse]
    completion_percentage: float
    risk_level: str

@router.get("/", response_model=List[GrantResponse])
async def list_grants(
    request: Request,
    current_user=Depends(require_auth),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sponsor_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List all grants for the current tenant with filtering"""
    try:
        from server.db import db
        from drizzle_orm import eq, and_, desc, limit as drizzle_limit, offset as drizzle_offset, join
        
        tenant_id = get_current_user_tenant(current_user)
        
        # Build query with filters and sponsor join
        conditions = [eq(grants.tenant_id, tenant_id)]
        
        if status:
            conditions.append(eq(grants.status, status))
        if priority:
            conditions.append(eq(grants.priority, priority))
        if sponsor_id:
            conditions.append(eq(grants.sponsor_id, sponsor_id))
        
        query = (
            db.select([
                grants.id,
                grants.sponsor_id,
                sponsors.name.label("sponsor_name"),
                grants.name,
                grants.amount,
                grants.submission_deadline,
                grants.description,
                grants.status,
                grants.priority,
                grants.created_at,
                grants.updated_at,
                grants.tenant_id
            ])
            .select_from(grants.join(sponsors, grants.sponsor_id == sponsors.id))
            .where(and_(*conditions))
            .order_by(grants.submission_deadline.asc())
            .limit(drizzle_limit(limit))
            .offset(drizzle_offset(offset))
        )
        
        results = await db.execute(query)
        grant_list = []
        
        for row in results:
            days_remaining = (row.submission_deadline - date.today()).days
            
            grant_list.append(GrantResponse(
                id=row.id,
                sponsor_id=row.sponsor_id,
                sponsor_name=row.sponsor_name,
                name=row.name,
                amount=row.amount,
                submission_deadline=row.submission_deadline,
                description=row.description,
                status=row.status,
                priority=row.priority,
                created_at=row.created_at,
                updated_at=row.updated_at,
                tenant_id=row.tenant_id,
                days_remaining=days_remaining
            ))
        
        return grant_list
        
    except Exception as e:
        logger.error(f"Error listing grants for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve grants")

@router.post("/", response_model=GrantResponse)
async def create_grant(
    grant_data: GrantCreate,
    request: Request,
    current_user=Depends(require_role("user"))
):
    """Create a new grant with automatic backwards planning milestones"""
    try:
        from server.db import db
        from drizzle_orm import eq, and_
        
        tenant_id = get_current_user_tenant(current_user)
        grant_id = str(uuid.uuid4())
        
        # Verify sponsor exists and belongs to tenant
        sponsor_result = await db.select().from(sponsors).where(
            and_(eq(sponsors.id, grant_data.sponsor_id), eq(sponsors.tenant_id, tenant_id))
        )
        
        if not sponsor_result:
            raise HTTPException(status_code=400, detail="Sponsor not found")
        
        sponsor = sponsor_result[0]
        
        # Create grant
        insert_data = {
            "id": grant_id,
            "tenant_id": tenant_id,
            "sponsor_id": grant_data.sponsor_id,
            "name": grant_data.name,
            "amount": grant_data.amount,
            "submission_deadline": grant_data.submission_deadline,
            "description": grant_data.description,
            "status": "planning",
            "priority": grant_data.priority,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.insert(grants).values(insert_data).returning()
        created_grant = result[0]
        
        # Generate backwards planning milestones
        await _generate_grant_milestones(grant_id, grant_data.submission_deadline, tenant_id)
        
        return GrantResponse(
            id=created_grant.id,
            sponsor_id=created_grant.sponsor_id,
            sponsor_name=sponsor.name,
            name=created_grant.name,
            amount=created_grant.amount,
            submission_deadline=created_grant.submission_deadline,
            description=created_grant.description,
            status=created_grant.status,
            priority=created_grant.priority,
            created_at=created_grant.created_at,
            updated_at=created_grant.updated_at,
            tenant_id=created_grant.tenant_id,
            days_remaining=(created_grant.submission_deadline - date.today()).days
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grant for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create grant")

@router.get("/{grant_id}/timeline", response_model=GrantTimelineResponse)
async def get_grant_timeline(
    grant_id: str,
    request: Request,
    current_user=Depends(require_auth)
):
    """Get complete timeline for a grant with completion analysis"""
    try:
        from server.db import db
        from drizzle_orm import eq, and_
        
        tenant_id = get_current_user_tenant(current_user)
        
        # Get grant details
        grant_result = await db.select().from(grants).where(
            and_(eq(grants.id, grant_id), eq(grants.tenant_id, tenant_id))
        )
        
        if not grant_result:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        grant = grant_result[0]
        days_remaining = (grant.submission_deadline - date.today()).days
        
        # Get milestones
        milestones_result = await db.select().from(grant_milestones).where(
            eq(grant_milestones.grant_id, grant_id)
        ).order_by(grant_milestones.milestone_date.asc())
        
        milestones = []
        completed_milestones = 0
        total_milestones = len(milestones_result)
        
        for milestone in milestones_result:
            tasks = json.loads(milestone.tasks) if milestone.tasks else []
            
            if milestone.status == "completed":
                completed_milestones += 1
            
            milestones.append(MilestoneResponse(
                id=milestone.id,
                grant_id=milestone.grant_id,
                milestone_date=milestone.milestone_date,
                title=milestone.title,
                description=milestone.description,
                tasks=tasks,
                status=milestone.status,
                created_at=milestone.created_at
            ))
        
        # Calculate completion percentage and risk level
        completion_percentage = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        
        # Determine risk level based on days remaining and completion
        if days_remaining < 30 and completion_percentage < 70:
            risk_level = "high"
        elif days_remaining < 60 and completion_percentage < 50:
            risk_level = "medium"
        elif days_remaining < 0:
            risk_level = "critical"
        else:
            risk_level = "low"
        
        return GrantTimelineResponse(
            grant_id=grant_id,
            grant_name=grant.name,
            submission_deadline=grant.submission_deadline,
            status=grant.status,
            days_remaining=days_remaining,
            milestones=milestones,
            completion_percentage=round(completion_percentage, 1),
            risk_level=risk_level
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving timeline for grant {grant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve grant timeline")

@router.put("/{grant_id}/milestones/{milestone_id}/status")
async def update_milestone_status(
    grant_id: str,
    milestone_id: str,
    status: str,
    request: Request,
    current_user=Depends(require_role("user"))
):
    """Update milestone status"""
    try:
        from server.db import db
        from drizzle_orm import eq, and_
        
        tenant_id = get_current_user_tenant(current_user)
        
        # Validate status
        valid_statuses = ["pending", "in_progress", "completed", "overdue", "blocked"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        # Verify grant belongs to tenant
        grant_result = await db.select().from(grants).where(
            and_(eq(grants.id, grant_id), eq(grants.tenant_id, tenant_id))
        )
        
        if not grant_result:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        # Update milestone status
        result = await db.update(grant_milestones).set({
            "status": status,
            "updated_at": datetime.utcnow()
        }).where(
            and_(eq(grant_milestones.id, milestone_id), eq(grant_milestones.grant_id, grant_id))
        ).returning()
        
        if not result:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        return {"message": "Milestone status updated successfully", "status": status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating milestone {milestone_id} status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update milestone status")

async def _generate_grant_milestones(grant_id: str, submission_deadline: date, tenant_id: str):
    """Generate backwards planning milestones for a grant"""
    try:
        from server.db import db
        
        # 90-day milestone
        milestone_90 = submission_deadline - timedelta(days=90)
        milestone_90_id = str(uuid.uuid4())
        
        # 60-day milestone  
        milestone_60 = submission_deadline - timedelta(days=60)
        milestone_60_id = str(uuid.uuid4())
        
        # 30-day milestone
        milestone_30 = submission_deadline - timedelta(days=30)
        milestone_30_id = str(uuid.uuid4())
        
        # 7-day milestone
        milestone_7 = submission_deadline - timedelta(days=7)
        milestone_7_id = str(uuid.uuid4())
        
        milestones_data = [
            {
                "id": milestone_90_id,
                "grant_id": grant_id,
                "milestone_date": milestone_90,
                "title": "Initial Planning Phase (90 days)",
                "description": "Complete initial research and planning",
                "tasks": json.dumps([
                    "Conduct stakeholder analysis",
                    "Complete initial research",
                    "Develop project framework",
                    "Identify key personnel",
                    "Create preliminary budget"
                ]),
                "status": "pending",
                "created_at": datetime.utcnow()
            },
            {
                "id": milestone_60_id,
                "grant_id": grant_id,
                "milestone_date": milestone_60,
                "title": "Development Phase (60 days)",
                "description": "Develop core proposal content",
                "tasks": json.dumps([
                    "Draft project narrative",
                    "Complete budget details",
                    "Gather supporting documents",
                    "Conduct peer reviews",
                    "Refine methodology"
                ]),
                "status": "pending",
                "created_at": datetime.utcnow()
            },
            {
                "id": milestone_30_id,
                "grant_id": grant_id,
                "milestone_date": milestone_30,
                "title": "Review and Refinement (30 days)",
                "description": "Final review and refinement phase",
                "tasks": json.dumps([
                    "Complete internal review",
                    "Incorporate feedback",
                    "Finalize all sections",
                    "Prepare submission materials",
                    "Quality assurance check"
                ]),
                "status": "pending",
                "created_at": datetime.utcnow()
            },
            {
                "id": milestone_7_id,
                "grant_id": grant_id,
                "milestone_date": milestone_7,
                "title": "Final Submission Preparation (7 days)",
                "description": "Final submission preparation",
                "tasks": json.dumps([
                    "Final proofreading",
                    "Format verification",
                    "Submission system testing",
                    "Backup preparations",
                    "Submit proposal"
                ]),
                "status": "pending",
                "created_at": datetime.utcnow()
            }
        ]
        
        # Insert all milestones
        await db.insert(grant_milestones).values(milestones_data)
        
    except Exception as e:
        logger.error(f"Error generating milestones for grant {grant_id}: {str(e)}")
        raise