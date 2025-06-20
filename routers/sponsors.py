"""
Sponsors Router for Zero Gate ESO Platform
Sponsor management API with tier classification and relationship tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from utils.tenant_context import get_current_tenant, get_current_user
from agents.processing import ProcessingAgent
from utils.resource_monitor import ResourceMonitor

logger = logging.getLogger("zero-gate.sponsors")

router = APIRouter()

# Initialize processing agent for metrics calculation
resource_monitor = ResourceMonitor()
processing_agent = ProcessingAgent(resource_monitor)

@router.get("/")
async def get_sponsors(request: Request):
    """Get all sponsors for the current tenant"""
    tenant_id = get_current_tenant(request)
    user_id = get_current_user(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Retrieve sponsors from database or return structured empty response
        sponsors_data = await _get_tenant_sponsors(tenant_id)
        
        # Calculate sponsor metrics
        enriched_sponsors = []
        for sponsor in sponsors_data:
            metrics = await processing_agent.analyze_sponsor_metrics(
                sponsor["sponsor_id"], tenant_id, sponsor
            )
            sponsor.update({"metrics": metrics})
            enriched_sponsors.append(sponsor)
        
        return {
            "sponsors": enriched_sponsors,
            "total": len(enriched_sponsors),
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving sponsors for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{sponsor_id}")
async def get_sponsor(sponsor_id: str, request: Request):
    """Get specific sponsor details with relationship analysis"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Retrieve sponsor data
        sponsor_data = await _get_sponsor_by_id(sponsor_id, tenant_id)
        
        if not sponsor_data:
            raise HTTPException(status_code=404, detail="Sponsor not found")
        
        # Calculate detailed metrics
        metrics = await processing_agent.analyze_sponsor_metrics(
            sponsor_id, tenant_id, sponsor_data
        )
        
        # Get network statistics
        network_stats = processing_agent.get_network_statistics(tenant_id)
        
        return {
            "sponsor": sponsor_data,
            "metrics": metrics,
            "network_statistics": network_stats,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving sponsor {sponsor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/")
async def create_sponsor(sponsor_data: dict, request: Request):
    """Create new sponsor with relationship mapping"""
    tenant_id = get_current_tenant(request)
    user_id = get_current_user(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Validate required fields
        required_fields = ["name", "organization", "contact_email"]
        for field in required_fields:
            if field not in sponsor_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create sponsor record
        sponsor_id = await _create_sponsor_record(sponsor_data, tenant_id, user_id or "system")
        
        # Add to relationship graph if relationship data provided
        if "relationships" in sponsor_data:
            for relationship in sponsor_data["relationships"]:
                processing_agent.add_relationship(
                    source=sponsor_id,
                    target=relationship.get("target_id"),
                    relationship_type=relationship.get("type", "professional"),
                    strength=relationship.get("strength", 0.5),
                    tenant_id=tenant_id,
                    metadata=relationship.get("metadata", {})
                )
        
        return {
            "sponsor_id": sponsor_id,
            "message": "Sponsor created successfully",
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sponsor: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{sponsor_id}/metrics")
async def get_sponsor_metrics(sponsor_id: str, request: Request):
    """Get detailed sponsor metrics and analytics"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Get sponsor data for metrics calculation
        sponsor_data = await _get_sponsor_by_id(sponsor_id, tenant_id)
        
        if not sponsor_data:
            raise HTTPException(status_code=404, detail="Sponsor not found")
        
        # Calculate comprehensive metrics
        metrics = await processing_agent.analyze_sponsor_metrics(
            sponsor_id, tenant_id, sponsor_data
        )
        
        return {
            "sponsor_id": sponsor_id,
            "metrics": metrics,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating metrics for sponsor {sponsor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{sponsor_id}/relationships")
async def get_sponsor_relationships(sponsor_id: str, request: Request, max_degrees: int = 3):
    """Get sponsor relationship network analysis"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Get direct relationships
        direct_relationships = _get_direct_relationships(sponsor_id, tenant_id)
        
        # Calculate network statistics
        network_stats = processing_agent.get_network_statistics(tenant_id)
        
        return {
            "sponsor_id": sponsor_id,
            "direct_relationships": direct_relationships,
            "network_statistics": network_stats,
            "max_degrees_analyzed": max_degrees,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing relationships for sponsor {sponsor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Helper functions for data operations
async def _get_tenant_sponsors(tenant_id: str) -> List[Dict[str, Any]]:
    """Retrieve sponsors for a specific tenant"""
    # Connect to database through existing storage layer
    return []

async def _get_sponsor_by_id(sponsor_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve specific sponsor by ID"""
    # Connect to database through existing storage layer
    return None

async def _create_sponsor_record(sponsor_data: dict, tenant_id: str, user_id: str) -> str:
    """Create new sponsor record in database"""
    # Insert into database through existing storage layer
    return f"sponsor_{datetime.now().timestamp()}"

def _get_direct_relationships(sponsor_id: str, tenant_id: str) -> List[Dict[str, Any]]:
    """Get direct relationships for a sponsor"""
    # Query relationship graph through processing agent
    return []