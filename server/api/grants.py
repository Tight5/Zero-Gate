"""
FastAPI routes for grant management with timeline analysis and milestone tracking
Provides CRUD operations, timeline analysis, and grant metrics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
import asyncpg
import os
from datetime import datetime, date, timedelta

from ..auth.jwt_auth import get_current_active_user, TokenData
from .models import (
    GrantCreate, GrantUpdate, GrantResponse, GrantMetrics,
    GrantMilestoneCreate, GrantMilestoneUpdate, GrantMilestoneResponse,
    GrantTimeline, PaginatedResponse, SuccessResponse
)

DATABASE_URL = os.getenv("DATABASE_URL")
router = APIRouter(prefix="/api/v2/grants", tags=["grants"])

async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

async def validate_grant_access(grant_id: str, tenant_id: str) -> bool:
    """Validate grant belongs to tenant"""
    conn = await get_db_connection()
    try:
        result = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM grants WHERE id = $1 AND tenant_id = $2)",
            grant_id, tenant_id
        )
        return result
    finally:
        await conn.close()

def convert_db_record(record) -> Dict[str, Any]:
    """Convert database record to dictionary"""
    if not record:
        return {}
    
    result = dict(record)
    if 'tags' in result and result['tags']:
        result['tags'] = list(result['tags']) if result['tags'] else []
    return result

@router.get("/", response_model=PaginatedResponse)
async def list_grants(
    current_user: TokenData = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    sponsor_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """List grants with pagination and filtering"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        where_conditions = ["g.tenant_id = $1"]
        params = [current_user.tenant_id]
        param_count = 1
        
        if status:
            param_count += 1
            where_conditions.append(f"g.status = ${param_count}")
            params.append(status)
        
        if sponsor_id:
            param_count += 1
            where_conditions.append(f"g.sponsor_id = ${param_count}")
            params.append(sponsor_id)
        
        if search:
            param_count += 1
            where_conditions.append(f"(g.title ILIKE ${param_count} OR g.description ILIKE ${param_count})")
            params.append(f"%{search}%")
        
        where_clause = " AND ".join(where_conditions)
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM grants g WHERE {where_clause}"
        total = await conn.fetchval(count_query, *params)
        
        # Get paginated results with sponsor info
        offset = (page - 1) * size
        query = f"""
            SELECT g.*, s.name as sponsor_name, s.organization as sponsor_organization
            FROM grants g
            LEFT JOIN sponsors s ON g.sponsor_id = s.id
            WHERE {where_clause}
            ORDER BY g.created_at DESC
            LIMIT $-1 OFFSET $-2
        """
        
        records = await conn.fetch(query, *params, size, offset)
        grants = []
        
        for record in records:
            grant_dict = convert_db_record(record)
            if grant_dict.get('sponsor_name'):
                grant_dict['sponsor'] = {
                    'id': grant_dict.get('sponsor_id'),
                    'name': grant_dict.get('sponsor_name'),
                    'organization': grant_dict.get('sponsor_organization')
                }
            grants.append(GrantResponse(**grant_dict))
        
        return PaginatedResponse(
            items=grants,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    finally:
        await conn.close()

@router.post("/", response_model=GrantResponse, status_code=status.HTTP_201_CREATED)
async def create_grant(
    grant_data: GrantCreate,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create new grant with automatic milestone generation"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Validate sponsor exists if provided
        if grant_data.sponsor_id:
            sponsor_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM sponsors WHERE id = $1 AND tenant_id = $2)",
                grant_data.sponsor_id, current_user.tenant_id
            )
            if not sponsor_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid sponsor ID"
                )
        
        # Generate grant ID
        import uuid
        grant_id = str(uuid.uuid4())
        
        # Insert grant
        query = """
            INSERT INTO grants (
                id, tenant_id, title, description, amount, currency, status,
                submission_deadline, start_date, end_date, sponsor_id, 
                requirements, tags, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            RETURNING *
        """
        
        record = await conn.fetchrow(
            query,
            grant_id,
            current_user.tenant_id,
            grant_data.title,
            grant_data.description,
            grant_data.amount,
            grant_data.currency,
            grant_data.status.value,
            grant_data.submission_deadline,
            grant_data.start_date,
            grant_data.end_date,
            grant_data.sponsor_id,
            grant_data.requirements,
            grant_data.tags or []
        )
        
        # Auto-generate milestones if submission deadline is provided
        if grant_data.submission_deadline:
            await generate_grant_milestones(conn, grant_id, grant_data.submission_deadline, current_user.tenant_id)
        
        return GrantResponse(**convert_db_record(record))
        
    finally:
        await conn.close()

async def generate_grant_milestones(conn, grant_id: str, submission_deadline: date, tenant_id: str):
    """Generate automatic milestones for grant backwards planning"""
    milestones = [
        {
            "title": "Grant Application Submission",
            "description": "Submit complete grant application",
            "days_before": 0,
            "completion_percentage": 0
        },
        {
            "title": "Final Review and Quality Check",
            "description": "Conduct final review of all application materials",
            "days_before": 3,
            "completion_percentage": 0
        },
        {
            "title": "Complete Supporting Documents",
            "description": "Finalize all supporting documents and attachments",
            "days_before": 7,
            "completion_percentage": 0
        },
        {
            "title": "Draft Application Completion",
            "description": "Complete first draft of grant application",
            "days_before": 14,
            "completion_percentage": 0
        },
        {
            "title": "Gather Required Documentation",
            "description": "Collect all required supporting documents",
            "days_before": 21,
            "completion_percentage": 0
        },
        {
            "title": "Research and Planning Phase",
            "description": "Complete grant research and develop application strategy",
            "days_before": 30,
            "completion_percentage": 0
        }
    ]
    
    for milestone in milestones:
        milestone_id = str(__import__('uuid').uuid4())
        due_date = submission_deadline - timedelta(days=milestone["days_before"])
        
        await conn.execute("""
            INSERT INTO grant_milestones (
                id, grant_id, tenant_id, title, description, due_date, 
                status, completion_percentage, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        """, 
        milestone_id, grant_id, tenant_id, milestone["title"], 
        milestone["description"], due_date, "Pending", 
        milestone["completion_percentage"])

@router.get("/{grant_id}", response_model=GrantResponse)
async def get_grant(
    grant_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get grant by ID with sponsor information"""
    if not await validate_grant_access(grant_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        record = await conn.fetchrow("""
            SELECT g.*, s.name as sponsor_name, s.organization as sponsor_organization,
                   s.email as sponsor_email, s.tier as sponsor_tier
            FROM grants g
            LEFT JOIN sponsors s ON g.sponsor_id = s.id
            WHERE g.id = $1 AND g.tenant_id = $2
        """, grant_id, current_user.tenant_id)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grant not found"
            )
        
        grant_dict = convert_db_record(record)
        if grant_dict.get('sponsor_name'):
            grant_dict['sponsor'] = {
                'id': grant_dict.get('sponsor_id'),
                'name': grant_dict.get('sponsor_name'),
                'organization': grant_dict.get('sponsor_organization'),
                'email': grant_dict.get('sponsor_email'),
                'tier': grant_dict.get('sponsor_tier')
            }
        
        return GrantResponse(**grant_dict)
        
    finally:
        await conn.close()

@router.get("/{grant_id}/timeline", response_model=GrantTimeline)
async def get_grant_timeline(
    grant_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get comprehensive grant timeline with milestone analysis"""
    if not await validate_grant_access(grant_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Get grant details
        grant_record = await conn.fetchrow("""
            SELECT g.*, s.name as sponsor_name
            FROM grants g
            LEFT JOIN sponsors s ON g.sponsor_id = s.id
            WHERE g.id = $1 AND g.tenant_id = $2
        """, grant_id, current_user.tenant_id)
        
        if not grant_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grant not found"
            )
        
        # Get milestones
        milestone_records = await conn.fetch("""
            SELECT * FROM grant_milestones
            WHERE grant_id = $1 AND tenant_id = $2
            ORDER BY due_date ASC
        """, grant_id, current_user.tenant_id)
        
        grant = GrantResponse(**convert_db_record(grant_record))
        milestones = [GrantMilestoneResponse(**convert_db_record(m)) for m in milestone_records]
        
        # Analyze timeline
        today = date.today()
        overdue_milestones = []
        upcoming_milestones = []
        completed_milestones = []
        
        for milestone in milestones:
            if milestone.status == "Completed":
                completed_milestones.append(milestone.id)
            elif milestone.due_date < today and milestone.status != "Completed":
                overdue_milestones.append(milestone.id)
            elif milestone.due_date <= today + timedelta(days=7):
                upcoming_milestones.append(milestone.id)
        
        # Calculate progress
        total_milestones = len(milestones)
        completed_count = len(completed_milestones)
        progress_percentage = (completed_count / total_milestones * 100) if total_milestones > 0 else 0
        
        # Critical path analysis (simplified)
        critical_path = [m.id for m in milestones if m.status != "Completed"][:3]
        
        timeline_analysis = {
            "total_milestones": total_milestones,
            "completed_milestones": completed_count,
            "overdue_milestones": len(overdue_milestones),
            "upcoming_milestones": len(upcoming_milestones),
            "progress_percentage": round(progress_percentage, 2),
            "days_until_deadline": (grant.submission_deadline - today).days if grant.submission_deadline else None,
            "on_track": len(overdue_milestones) == 0,
            "risk_level": "High" if len(overdue_milestones) > 0 else "Medium" if len(upcoming_milestones) > 2 else "Low"
        }
        
        return GrantTimeline(
            grant=grant,
            milestones=milestones,
            timeline_analysis=timeline_analysis,
            critical_path=critical_path
        )
        
    finally:
        await conn.close()

@router.post("/{grant_id}/milestones", response_model=GrantMilestoneResponse, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    grant_id: str,
    milestone_data: GrantMilestoneCreate,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create new milestone for grant"""
    if not await validate_grant_access(grant_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        milestone_id = str(__import__('uuid').uuid4())
        
        record = await conn.fetchrow("""
            INSERT INTO grant_milestones (
                id, grant_id, tenant_id, title, description, due_date,
                status, completion_percentage, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING *
        """, 
        milestone_id, grant_id, current_user.tenant_id,
        milestone_data.title, milestone_data.description, milestone_data.due_date,
        milestone_data.status.value, milestone_data.completion_percentage)
        
        return GrantMilestoneResponse(**convert_db_record(record))
        
    finally:
        await conn.close()

@router.put("/{grant_id}/milestones/{milestone_id}", response_model=GrantMilestoneResponse)
async def update_milestone(
    grant_id: str,
    milestone_id: str,
    milestone_data: GrantMilestoneUpdate,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Update grant milestone"""
    if not await validate_grant_access(grant_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grant not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Build update query
        update_fields = []
        params = []
        param_count = 0
        
        for field, value in milestone_data.dict(exclude_unset=True).items():
            if value is not None:
                param_count += 1
                if field == 'status':
                    update_fields.append(f"{field} = ${param_count}")
                    params.append(value.value if hasattr(value, 'value') else value)
                else:
                    update_fields.append(f"{field} = ${param_count}")
                    params.append(value)
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append("updated_at = NOW()")
        params.extend([milestone_id, grant_id, current_user.tenant_id])
        
        query = f"""
            UPDATE grant_milestones 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count + 1} AND grant_id = ${param_count + 2} AND tenant_id = ${param_count + 3}
            RETURNING *
        """
        
        record = await conn.fetchrow(query, *params)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found"
            )
        
        return GrantMilestoneResponse(**convert_db_record(record))
        
    finally:
        await conn.close()

@router.get("/metrics/overview", response_model=GrantMetrics)
async def get_grant_metrics(
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get comprehensive grant metrics and analytics"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Total grants
        total_grants = await conn.fetchval(
            "SELECT COUNT(*) FROM grants WHERE tenant_id = $1",
            current_user.tenant_id
        )
        
        # Grants by status
        status_stats = await conn.fetch("""
            SELECT status, COUNT(*) as count
            FROM grants 
            WHERE tenant_id = $1
            GROUP BY status
        """, current_user.tenant_id)
        
        grants_by_status = {row['status']: row['count'] for row in status_stats}
        
        # Funding metrics
        funding_stats = await conn.fetchrow("""
            SELECT 
                COALESCE(SUM(amount), 0) as total_funding,
                COALESCE(AVG(amount), 0) as average_grant_size
            FROM grants 
            WHERE tenant_id = $1 AND amount IS NOT NULL
        """, current_user.tenant_id)
        
        # Success rate (approved / submitted)
        success_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
                COUNT(*) FILTER (WHERE status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')) as total_submitted
            FROM grants 
            WHERE tenant_id = $1
        """, current_user.tenant_id)
        
        success_rate = (success_stats['approved_count'] / max(success_stats['total_submitted'], 1)) * 100
        
        # Upcoming deadlines (next 30 days)
        upcoming_deadlines = await conn.fetch("""
            SELECT id, title, submission_deadline, status
            FROM grants
            WHERE tenant_id = $1 
            AND submission_deadline IS NOT NULL
            AND submission_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
            ORDER BY submission_deadline ASC
        """, current_user.tenant_id)
        
        upcoming_list = [
            {
                "grant_id": row['id'],
                "title": row['title'],
                "deadline": row['submission_deadline'].isoformat(),
                "status": row['status'],
                "days_remaining": (row['submission_deadline'] - date.today()).days
            }
            for row in upcoming_deadlines
        ]
        
        return GrantMetrics(
            total_grants=total_grants,
            grants_by_status=grants_by_status,
            total_funding=float(funding_stats['total_funding']),
            average_grant_size=float(funding_stats['average_grant_size']),
            success_rate=round(success_rate, 2),
            upcoming_deadlines=upcoming_list
        )
        
    finally:
        await conn.close()