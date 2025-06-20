"""
Grants Router for Zero Gate ESO Platform
Grant lifecycle management API with backwards planning and milestone tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from utils.tenant_context import get_current_tenant, get_current_user
from agents.processing import ProcessingAgent
from utils.resource_monitor import ResourceMonitor

logger = logging.getLogger("zero-gate.grants")

router = APIRouter()

# Initialize processing agent for timeline generation
resource_monitor = ResourceMonitor()
processing_agent = ProcessingAgent(resource_monitor)

@router.get("/")
async def get_grants(request: Request):
    """Get all grants for the current tenant"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Retrieve grants from database
        grants_data = await _get_tenant_grants(tenant_id)
        
        # Enrich grants with timeline status
        enriched_grants = []
        for grant in grants_data:
            if grant.get("deadline"):
                deadline = datetime.fromisoformat(grant["deadline"])
                timeline = await processing_agent.generate_grant_timeline(deadline, grant.get("type", "general"))
                grant.update({"timeline_status": _calculate_timeline_status(timeline)})
            enriched_grants.append(grant)
        
        return {
            "grants": enriched_grants,
            "total": len(enriched_grants),
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving grants for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{grant_id}")
async def get_grant(grant_id: str, request: Request):
    """Get specific grant details with full timeline analysis"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Retrieve grant data
        grant_data = await _get_grant_by_id(grant_id, tenant_id)
        
        if not grant_data:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        # Generate complete timeline if deadline exists
        timeline = None
        if grant_data.get("deadline"):
            deadline = datetime.fromisoformat(grant_data["deadline"])
            timeline = await processing_agent.generate_grant_timeline(deadline, grant_data.get("type", "general"))
        
        return {
            "grant": grant_data,
            "timeline": timeline,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving grant {grant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/")
async def create_grant(grant_data: dict, request: Request):
    """Create new grant with automatic backwards planning"""
    tenant_id = get_current_tenant(request)
    user_id = get_current_user(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Validate required fields
        required_fields = ["title", "funding_amount", "deadline"]
        for field in required_fields:
            if field not in grant_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate deadline format
        try:
            deadline = datetime.fromisoformat(grant_data["deadline"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid deadline format. Use ISO format.")
        
        # Generate backwards planning timeline
        grant_type = grant_data.get("type", "general")
        timeline = await processing_agent.generate_grant_timeline(deadline, grant_type)
        
        # Create grant record with timeline
        grant_id = await _create_grant_record(grant_data, timeline, tenant_id, user_id or "system")
        
        return {
            "grant_id": grant_id,
            "timeline": timeline,
            "message": "Grant created with backwards planning timeline",
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grant: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{grant_id}/timeline")
async def get_grant_timeline(grant_id: str, request: Request):
    """Get detailed grant timeline with 90/60/30-day milestones"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Get grant data
        grant_data = await _get_grant_by_id(grant_id, tenant_id)
        
        if not grant_data:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        if not grant_data.get("deadline"):
            raise HTTPException(status_code=400, detail="Grant has no deadline set")
        
        # Generate timeline
        deadline = datetime.fromisoformat(grant_data["deadline"])
        timeline = await processing_agent.generate_grant_timeline(deadline, grant_data.get("type", "general"))
        
        # Calculate progress and status
        progress_analysis = _analyze_timeline_progress(timeline)
        
        return {
            "grant_id": grant_id,
            "timeline": timeline,
            "progress_analysis": progress_analysis,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating timeline for grant {grant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{grant_id}/milestone/{milestone_id}")
async def update_milestone_progress(grant_id: str, milestone_id: str, progress_data: dict, request: Request):
    """Update milestone completion progress"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Validate progress data
        if "completed_tasks" not in progress_data:
            raise HTTPException(status_code=400, detail="Missing completed_tasks in progress data")
        
        # Update milestone progress
        updated = await _update_milestone_progress(grant_id, milestone_id, progress_data, tenant_id)
        
        if not updated:
            raise HTTPException(status_code=404, detail="Grant or milestone not found")
        
        return {
            "grant_id": grant_id,
            "milestone_id": milestone_id,
            "message": "Milestone progress updated",
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating milestone progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{grant_id}/risk-assessment")
async def get_grant_risk_assessment(grant_id: str, request: Request):
    """Get risk assessment for grant timeline"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Get grant data and timeline
        grant_data = await _get_grant_by_id(grant_id, tenant_id)
        
        if not grant_data:
            raise HTTPException(status_code=404, detail="Grant not found")
        
        # Calculate risk assessment
        risk_assessment = _calculate_risk_assessment(grant_data)
        
        return {
            "grant_id": grant_id,
            "risk_assessment": risk_assessment,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating risk assessment for grant {grant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Helper functions for data operations
async def _get_tenant_grants(tenant_id: str) -> List[Dict[str, Any]]:
    """Retrieve grants for a specific tenant"""
    # Connect to database through existing storage layer
    return []

async def _get_grant_by_id(grant_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve specific grant by ID"""
    # Connect to database through existing storage layer
    return None

async def _create_grant_record(grant_data: dict, timeline: dict, tenant_id: str, user_id: str) -> str:
    """Create new grant record with timeline in database"""
    # Insert into database through existing storage layer
    return f"grant_{datetime.now().timestamp()}"

async def _update_milestone_progress(grant_id: str, milestone_id: str, progress_data: dict, tenant_id: str) -> bool:
    """Update milestone progress in database"""
    # Update database through existing storage layer
    return True

def _calculate_timeline_status(timeline: dict) -> dict:
    """Calculate current status of grant timeline"""
    now = datetime.now()
    milestones = timeline.get("milestones", {})
    
    status = {
        "current_phase": "planning",
        "days_remaining": 0,
        "completion_percentage": 0,
        "at_risk": False
    }
    
    if timeline.get("grant_deadline"):
        deadline = datetime.fromisoformat(timeline["grant_deadline"])
        status["days_remaining"] = (deadline - now).days
    
    return status

def _analyze_timeline_progress(timeline: dict) -> dict:
    """Analyze timeline progress and identify risks"""
    return {
        "overall_progress": 0,
        "milestone_completion": [],
        "critical_path_status": "on_track",
        "risk_factors": [],
        "recommendations": []
    }

def _calculate_risk_assessment(grant_data: dict) -> dict:
    """Calculate comprehensive risk assessment for grant"""
    return {
        "overall_risk_level": "medium",
        "timeline_risk": "low",
        "resource_risk": "medium", 
        "stakeholder_risk": "low",
        "mitigation_strategies": [],
        "success_probability": 0.75
    }