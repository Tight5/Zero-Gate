"""
Test API endpoints to verify router functionality
Simplified implementation without database dependencies
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import json
import uuid

logger = logging.getLogger("zero-gate.test-api")

router = APIRouter(prefix="/api/v2/test", tags=["test"])

# Simple test models
class TestSponsorResponse(BaseModel):
    id: str
    name: str
    tier: str
    status: str
    tenant_id: str

class TestGrantResponse(BaseModel):
    id: str
    name: str
    amount: float
    submission_deadline: date
    status: str
    tenant_id: str

class TestRelationshipResponse(BaseModel):
    id: str
    source_person: str
    target_person: str
    relationship_type: str
    strength: float
    tenant_id: str

# Mock authentication for testing
def get_test_tenant() -> str:
    return "nasdaq-center"

@router.get("/sponsors", response_model=List[TestSponsorResponse])
async def test_list_sponsors():
    """Test endpoint for sponsors list"""
    tenant_id = get_test_tenant()
    
    return [
        TestSponsorResponse(
            id="sponsor-1",
            name="Microsoft Corporation",
            tier="tier_1",
            status="active",
            tenant_id=tenant_id
        ),
        TestSponsorResponse(
            id="sponsor-2",
            name="Google LLC", 
            tier="tier_1",
            status="active",
            tenant_id=tenant_id
        ),
        TestSponsorResponse(
            id="sponsor-3",
            name="Amazon Web Services",
            tier="tier_2",
            status="active",
            tenant_id=tenant_id
        )
    ]

@router.get("/grants", response_model=List[TestGrantResponse])
async def test_list_grants():
    """Test endpoint for grants list"""
    tenant_id = get_test_tenant()
    
    return [
        TestGrantResponse(
            id="grant-1",
            name="Digital Innovation Grant",
            amount=250000.0,
            submission_deadline=date(2025, 9, 15),
            status="planning",
            tenant_id=tenant_id
        ),
        TestGrantResponse(
            id="grant-2",
            name="Workforce Development Grant",
            amount=150000.0,
            submission_deadline=date(2025, 8, 30),
            status="in_progress",
            tenant_id=tenant_id
        ),
        TestGrantResponse(
            id="grant-3",
            name="Technology Infrastructure Grant",
            amount=500000.0,
            submission_deadline=date(2025, 12, 1),
            status="planning",
            tenant_id=tenant_id
        )
    ]

@router.get("/relationships", response_model=List[TestRelationshipResponse])
async def test_list_relationships():
    """Test endpoint for relationships list"""
    tenant_id = get_test_tenant()
    
    return [
        TestRelationshipResponse(
            id="rel-1",
            source_person="John Smith",
            target_person="Jane Doe",
            relationship_type="colleague",
            strength=0.8,
            tenant_id=tenant_id
        ),
        TestRelationshipResponse(
            id="rel-2",
            source_person="Jane Doe",
            target_person="Bob Wilson",
            relationship_type="manager",
            strength=0.9,
            tenant_id=tenant_id
        ),
        TestRelationshipResponse(
            id="rel-3",
            source_person="Bob Wilson",
            target_person="Alice Johnson",
            relationship_type="mentor",
            strength=0.7,
            tenant_id=tenant_id
        )
    ]

@router.get("/sponsor-metrics/{sponsor_id}")
async def test_sponsor_metrics(sponsor_id: str):
    """Test endpoint for sponsor metrics"""
    return {
        "sponsor_id": sponsor_id,
        "sponsor_name": "Microsoft Corporation",
        "communication_frequency": 85.5,
        "avg_response_time": 12.5,
        "engagement_quality": 92.3,
        "relationship_strength": 88.7,
        "network_centrality": 0.75,
        "influence_score": 89.2,
        "calculated_at": datetime.utcnow().isoformat()
    }

@router.get("/grant-timeline/{grant_id}")
async def test_grant_timeline(grant_id: str):
    """Test endpoint for grant timeline"""
    return {
        "grant_id": grant_id,
        "grant_name": "Digital Innovation Grant",
        "submission_deadline": "2025-09-15",
        "status": "planning",
        "days_remaining": 267,
        "milestones": [
            {
                "id": "milestone-1",
                "grant_id": grant_id,
                "milestone_date": "2025-06-17",
                "title": "Initial Planning Phase (90 days)",
                "description": "Complete initial research and planning",
                "tasks": [
                    "Conduct stakeholder analysis",
                    "Complete initial research",
                    "Develop project framework"
                ],
                "status": "pending"
            },
            {
                "id": "milestone-2",
                "grant_id": grant_id,
                "milestone_date": "2025-07-17",
                "title": "Development Phase (60 days)",
                "description": "Develop core proposal content",
                "tasks": [
                    "Draft project narrative",
                    "Complete budget details",
                    "Gather supporting documents"
                ],
                "status": "pending"
            }
        ],
        "completion_percentage": 15.0,
        "risk_level": "low"
    }

@router.post("/discover-path")
async def test_discover_path(source_id: str, target_id: str, max_depth: int = 7):
    """Test endpoint for relationship path discovery"""
    return {
        "source_id": source_id,
        "target_id": target_id,
        "path": [source_id, "intermediary_person", target_id],
        "path_length": 2,
        "path_quality": "good",
        "confidence_score": 0.85,
        "relationship_analysis": {
            "path_strength": 0.75,
            "weakest_link": 0.7,
            "total_strength": 1.5
        },
        "algorithm_used": "bfs",
        "computation_time_ms": 15.2
    }

@router.get("/network/stats")
async def test_network_stats():
    """Test endpoint for network statistics"""
    return {
        "total_relationships": 156,
        "unique_people": 45,
        "relationships_by_type": {
            "colleague": 45,
            "manager": 12,
            "mentor": 18,
            "sponsor": 8,
            "collaborator": 25,
            "investor": 6,
            "partner": 15,
            "advisor": 10,
            "client": 12,
            "supplier": 5
        },
        "average_relationship_strength": 0.732,
        "network_density": 0.156,
        "most_connected_person": "Jane Doe",
        "strongest_connections": [
            {
                "source": "John Smith",
                "target": "Jane Doe",
                "type": "colleague",
                "strength": 0.95
            },
            {
                "source": "Bob Wilson", 
                "target": "Alice Johnson",
                "type": "mentor",
                "strength": 0.92
            }
        ]
    }

@router.get("/health")
async def test_health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "fastapi-routers",
        "version": "2.0.0"
    }