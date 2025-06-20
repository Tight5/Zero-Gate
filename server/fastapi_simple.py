"""
Simplified FastAPI server for Zero Gate ESO Platform
Provides immediate API functionality without authentication dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
from typing import Dict, List, Optional
from pydantic import BaseModel

# Create FastAPI app
app = FastAPI(
    title="Zero Gate ESO Platform API",
    description="Enterprise Service Organization management system",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "fastapi-api",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

# Test API endpoints with sample data
@app.get("/api/v2/test/health")
async def test_health():
    """Test API health check"""
    return {
        "status": "operational",
        "message": "Zero Gate ESO Platform API is running",
        "timestamp": datetime.now().isoformat(),
        "features": [
            "sponsors_management",
            "grants_tracking", 
            "relationship_mapping",
            "content_calendar",
            "analytics"
        ]
    }

@app.get("/api/v2/test/sponsors")
async def get_test_sponsors():
    """Get test sponsor data"""
    return {
        "sponsors": [
            {
                "id": "sponsor-1",
                "name": "NASDAQ Educational Foundation",
                "organization": "NASDAQ",
                "tier": "Platinum",
                "status": "Active",
                "contact_person": "John Smith",
                "email": "john.smith@nasdaq.org",
                "phone": "+1-555-0123",
                "last_contact": "2025-06-15",
                "relationship_strength": 85,
                "total_grants": 5,
                "success_rate": 80
            },
            {
                "id": "sponsor-2", 
                "name": "Innovation Hub Partners",
                "organization": "Tech Innovators LLC",
                "tier": "Gold",
                "status": "Active",
                "contact_person": "Alice Johnson",
                "email": "alice@techinnovators.com",
                "phone": "+1-555-0456",
                "last_contact": "2025-06-10",
                "relationship_strength": 72,
                "total_grants": 3,
                "success_rate": 100
            },
            {
                "id": "sponsor-3",
                "name": "Community Development Corp",
                "organization": "CDC Foundation",
                "tier": "Silver",
                "status": "Pending",
                "contact_person": "Robert Wilson",
                "email": "rwilson@cdc.org",
                "phone": "+1-555-0789",
                "last_contact": "2025-06-05",
                "relationship_strength": 45,
                "total_grants": 1,
                "success_rate": 0
            }
        ],
        "total": 3,
        "tier_distribution": {
            "Platinum": 1,
            "Gold": 1,
            "Silver": 1,
            "Bronze": 0
        }
    }

@app.get("/api/v2/test/grants")
async def get_test_grants():
    """Get test grant data"""
    return {
        "grants": [
            {
                "id": "grant-1",
                "title": "Digital Innovation Program 2025",
                "sponsor": "NASDAQ Educational Foundation",
                "amount": 250000,
                "status": "Active",
                "submission_deadline": "2025-07-30",
                "timeline": {
                    "90_day_milestone": "Application Development",
                    "60_day_milestone": "Stakeholder Alignment", 
                    "30_day_milestone": "Final Review",
                    "submission": "Grant Submission"
                },
                "completion_percentage": 65,
                "risk_level": "Low"
            },
            {
                "id": "grant-2",
                "title": "Community Tech Access Initiative",
                "sponsor": "Innovation Hub Partners",
                "amount": 150000,
                "status": "Planning",
                "submission_deadline": "2025-08-15",
                "timeline": {
                    "90_day_milestone": "Research & Planning",
                    "60_day_milestone": "Partner Identification",
                    "30_day_milestone": "Proposal Writing",
                    "submission": "Grant Submission"
                },
                "completion_percentage": 25,
                "risk_level": "Medium"
            },
            {
                "id": "grant-3",
                "title": "Youth Development Program",
                "sponsor": "Community Development Corp",
                "amount": 75000,
                "status": "Submitted",
                "submission_deadline": "2025-06-01",
                "timeline": {
                    "90_day_milestone": "Complete",
                    "60_day_milestone": "Complete",
                    "30_day_milestone": "Complete",
                    "submission": "Complete"
                },
                "completion_percentage": 100,
                "risk_level": "Low"
            }
        ],
        "total": 3,
        "total_funding": 475000,
        "status_distribution": {
            "Active": 1,
            "Planning": 1,
            "Submitted": 1,
            "Approved": 0
        }
    }

@app.get("/api/v2/test/relationships")
async def get_test_relationships():
    """Get test relationship data"""
    return {
        "relationships": [
            {
                "id": "rel-1",
                "person_a": "John Smith",
                "person_b": "Alice Johnson", 
                "relationship_type": "Professional",
                "strength": 8,
                "last_interaction": "2025-06-10",
                "context": "Joint grant application collaboration"
            },
            {
                "id": "rel-2",
                "person_a": "Alice Johnson",
                "person_b": "Robert Wilson",
                "relationship_type": "Industry",
                "strength": 6,
                "last_interaction": "2025-05-28",
                "context": "Conference networking"
            },
            {
                "id": "rel-3",
                "person_a": "John Smith",
                "person_b": "Sarah Chen",
                "relationship_type": "Mentorship",
                "strength": 9,
                "last_interaction": "2025-06-12",
                "context": "Advisory board participation"
            }
        ],
        "network_stats": {
            "total_people": 4,
            "total_relationships": 3,
            "average_strength": 7.7,
            "network_density": 0.5,
            "strongest_connection": {
                "people": ["John Smith", "Sarah Chen"],
                "strength": 9
            }
        }
    }

@app.post("/api/v2/test/discover-path")
async def discover_relationship_path(
    source_id: str,
    target_id: str,
    max_depth: int = 7
):
    """Test seven-degree path discovery"""
    return {
        "path_discovery": {
            "source": source_id,
            "target": target_id,
            "algorithm": "BFS",
            "max_depth": max_depth,
            "path_found": True,
            "path": [
                {"person": source_id, "connection_strength": 9},
                {"person": "Sarah Chen", "connection_strength": 7},
                {"person": target_id, "connection_strength": 6}
            ],
            "path_length": 3,
            "confidence_score": 0.73,
            "quality": "Good",
            "computation_time_ms": 45,
            "alternative_paths": 2
        }
    }

@app.get("/api/v2/test/network/stats")
async def get_network_statistics():
    """Get comprehensive network statistics"""
    return {
        "network_analysis": {
            "total_people": 12,
            "total_relationships": 28,
            "network_density": 0.42,
            "average_path_length": 2.3,
            "clustering_coefficient": 0.65,
            "most_connected_person": {
                "name": "John Smith",
                "connections": 8,
                "centrality_score": 0.85
            },
            "relationship_types": {
                "Professional": 15,
                "Industry": 8,
                "Mentorship": 3,
                "Personal": 2
            },
            "strength_distribution": {
                "Very Strong (8-10)": 8,
                "Strong (6-7)": 12,
                "Moderate (4-5)": 6,
                "Weak (1-3)": 2
            }
        }
    }

# Routes documentation
@app.get("/api/v2/routes")
async def list_routes():
    """List all available API routes"""
    return {
        "available_routes": {
            "health": [
                "GET /health",
                "GET /api/v2/test/health"
            ],
            "sponsors": [
                "GET /api/v2/test/sponsors"
            ],
            "grants": [
                "GET /api/v2/test/grants"
            ],
            "relationships": [
                "GET /api/v2/test/relationships",
                "POST /api/v2/test/discover-path",
                "GET /api/v2/test/network/stats"
            ],
            "documentation": [
                "GET /api/v2/routes",
                "GET /docs (Swagger UI)",
                "GET /redoc (ReDoc)"
            ]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)