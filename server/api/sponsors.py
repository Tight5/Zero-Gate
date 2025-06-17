"""
FastAPI routes for sponsor management with tenant context validation
Provides CRUD operations, metrics, and advanced sponsor analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
import asyncpg
import os
from datetime import datetime, timedelta

from ..auth.jwt_auth import get_current_active_user, TokenData
from .models import (
    SponsorCreate, SponsorUpdate, SponsorResponse, SponsorMetrics,
    SponsorFilters, PaginatedResponse, SuccessResponse
)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")

router = APIRouter(prefix="/api/v2/sponsors", tags=["sponsors"])

async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

async def validate_tenant_access(sponsor_id: str, tenant_id: str) -> bool:
    """Validate sponsor belongs to tenant"""
    conn = await get_db_connection()
    try:
        result = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM sponsors WHERE id = $1 AND tenant_id = $2)",
            sponsor_id, tenant_id
        )
        return result
    finally:
        await conn.close()

def convert_db_record(record) -> Dict[str, Any]:
    """Convert database record to dictionary"""
    if not record:
        return {}
    
    result = dict(record)
    # Convert arrays and handle special types
    if 'tags' in result and result['tags']:
        result['tags'] = list(result['tags']) if result['tags'] else []
    return result

@router.get("/", response_model=PaginatedResponse)
async def list_sponsors(
    current_user: TokenData = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    tier: Optional[str] = Query(None),
    organization: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """List sponsors with pagination and filtering"""
    conn = await get_db_connection()
    try:
        # Set tenant context
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Build query
        where_conditions = ["tenant_id = $1"]
        params = [current_user.tenant_id]
        param_count = 1
        
        if tier:
            param_count += 1
            where_conditions.append(f"tier = ${param_count}")
            params.append(tier)
        
        if organization:
            param_count += 1
            where_conditions.append(f"organization ILIKE ${param_count}")
            params.append(f"%{organization}%")
        
        if search:
            param_count += 1
            where_conditions.append(f"(name ILIKE ${param_count} OR email ILIKE ${param_count} OR organization ILIKE ${param_count})")
            params.append(f"%{search}%")
        
        where_clause = " AND ".join(where_conditions)
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM sponsors WHERE {where_clause}"
        total = await conn.fetchval(count_query, *params)
        
        # Get paginated results
        offset = (page - 1) * size
        query = f"""
            SELECT * FROM sponsors 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT $-1 OFFSET $-2
        """
        
        records = await conn.fetch(query, *params, size, offset)
        sponsors = [SponsorResponse(**convert_db_record(record)) for record in records]
        
        return PaginatedResponse(
            items=sponsors,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    finally:
        await conn.close()

@router.post("/", response_model=SponsorResponse, status_code=status.HTTP_201_CREATED)
async def create_sponsor(
    sponsor_data: SponsorCreate,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create new sponsor"""
    conn = await get_db_connection()
    try:
        # Set tenant context
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Generate sponsor ID
        import uuid
        sponsor_id = str(uuid.uuid4())
        
        # Insert sponsor
        query = """
            INSERT INTO sponsors (
                id, tenant_id, name, email, phone, tier, organization, 
                website, notes, tags, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
        """
        
        record = await conn.fetchrow(
            query,
            sponsor_id,
            current_user.tenant_id,
            sponsor_data.name,
            sponsor_data.email,
            sponsor_data.phone,
            sponsor_data.tier.value,
            sponsor_data.organization,
            sponsor_data.website,
            sponsor_data.notes,
            sponsor_data.tags or []
        )
        
        return SponsorResponse(**convert_db_record(record))
        
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sponsor with this email already exists in tenant"
        )
    finally:
        await conn.close()

@router.get("/{sponsor_id}", response_model=SponsorResponse)
async def get_sponsor(
    sponsor_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get sponsor by ID"""
    if not await validate_tenant_access(sponsor_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        record = await conn.fetchrow(
            "SELECT * FROM sponsors WHERE id = $1 AND tenant_id = $2",
            sponsor_id, current_user.tenant_id
        )
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sponsor not found"
            )
        
        return SponsorResponse(**convert_db_record(record))
        
    finally:
        await conn.close()

@router.put("/{sponsor_id}", response_model=SponsorResponse)
async def update_sponsor(
    sponsor_id: str,
    sponsor_data: SponsorUpdate,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Update sponsor"""
    if not await validate_tenant_access(sponsor_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Build update query dynamically
        update_fields = []
        params = []
        param_count = 0
        
        for field, value in sponsor_data.dict(exclude_unset=True).items():
            if value is not None:
                param_count += 1
                if field == 'tier':
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
        params.extend([sponsor_id, current_user.tenant_id])
        
        query = f"""
            UPDATE sponsors 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count + 1} AND tenant_id = ${param_count + 2}
            RETURNING *
        """
        
        record = await conn.fetchrow(query, *params)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sponsor not found"
            )
        
        return SponsorResponse(**convert_db_record(record))
        
    finally:
        await conn.close()

@router.delete("/{sponsor_id}", response_model=SuccessResponse)
async def delete_sponsor(
    sponsor_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Delete sponsor"""
    if not await validate_tenant_access(sponsor_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Check for dependent grants
        grant_count = await conn.fetchval(
            "SELECT COUNT(*) FROM grants WHERE sponsor_id = $1 AND tenant_id = $2",
            sponsor_id, current_user.tenant_id
        )
        
        if grant_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete sponsor with {grant_count} associated grants"
            )
        
        # Delete sponsor
        result = await conn.execute(
            "DELETE FROM sponsors WHERE id = $1 AND tenant_id = $2",
            sponsor_id, current_user.tenant_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sponsor not found"
            )
        
        return SuccessResponse(message="Sponsor deleted successfully")
        
    finally:
        await conn.close()

@router.get("/metrics/overview", response_model=SponsorMetrics)
async def get_sponsor_metrics(
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get sponsor metrics and analytics"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Total sponsors
        total_sponsors = await conn.fetchval(
            "SELECT COUNT(*) FROM sponsors WHERE tenant_id = $1",
            current_user.tenant_id
        )
        
        # Sponsors by tier
        tier_stats = await conn.fetch("""
            SELECT tier, COUNT(*) as count
            FROM sponsors 
            WHERE tenant_id = $1
            GROUP BY tier
        """, current_user.tenant_id)
        
        sponsors_by_tier = {row['tier']: row['count'] for row in tier_stats}
        
        # Recent additions (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_additions = await conn.fetchval("""
            SELECT COUNT(*) FROM sponsors 
            WHERE tenant_id = $1 AND created_at >= $2
        """, current_user.tenant_id, thirty_days_ago)
        
        # Top organizations
        top_orgs = await conn.fetch("""
            SELECT organization, COUNT(*) as sponsor_count
            FROM sponsors 
            WHERE tenant_id = $1 AND organization IS NOT NULL
            GROUP BY organization
            ORDER BY sponsor_count DESC
            LIMIT 10
        """, current_user.tenant_id)
        
        top_organizations = [
            {"organization": row['organization'], "sponsor_count": row['sponsor_count']}
            for row in top_orgs
        ]
        
        # Calculate engagement score (simplified)
        engagement_score = min(100.0, (recent_additions / max(total_sponsors, 1)) * 100)
        
        return SponsorMetrics(
            total_sponsors=total_sponsors,
            sponsors_by_tier=sponsors_by_tier,
            recent_additions=recent_additions,
            top_organizations=top_organizations,
            engagement_score=round(engagement_score, 2)
        )
        
    finally:
        await conn.close()

@router.get("/{sponsor_id}/grants")
async def get_sponsor_grants(
    sponsor_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get all grants associated with a sponsor"""
    if not await validate_tenant_access(sponsor_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        grants = await conn.fetch("""
            SELECT g.*, s.name as sponsor_name
            FROM grants g
            JOIN sponsors s ON g.sponsor_id = s.id
            WHERE g.sponsor_id = $1 AND g.tenant_id = $2
            ORDER BY g.created_at DESC
        """, sponsor_id, current_user.tenant_id)
        
        return [convert_db_record(grant) for grant in grants]
        
    finally:
        await conn.close()

@router.get("/{sponsor_id}/relationships")
async def get_sponsor_relationships(
    sponsor_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get all relationships for a sponsor"""
    if not await validate_tenant_access(sponsor_id, current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        relationships = await conn.fetch("""
            SELECT r.*, 
                   s1.name as source_name,
                   s2.name as target_name
            FROM relationships r
            LEFT JOIN sponsors s1 ON r.source_id = s1.id
            LEFT JOIN sponsors s2 ON r.target_id = s2.id
            WHERE (r.source_id = $1 OR r.target_id = $1) 
            AND r.tenant_id = $2
            ORDER BY r.created_at DESC
        """, sponsor_id, current_user.tenant_id)
        
        return [convert_db_record(rel) for rel in relationships]
        
    finally:
        await conn.close()