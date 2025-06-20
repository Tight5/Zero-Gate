"""
Relationships Router for Zero Gate ESO Platform
Network analysis API with seven-degree path discovery and relationship mapping
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from utils.tenant_context import get_current_tenant, get_current_user
from agents.processing import ProcessingAgent
from utils.resource_monitor import ResourceMonitor

logger = logging.getLogger("zero-gate.relationships")

router = APIRouter()

# Initialize processing agent for relationship analysis
resource_monitor = ResourceMonitor()
processing_agent = ProcessingAgent(resource_monitor)

@router.get("/")
async def get_relationships(request: Request):
    """Get all relationships for the current tenant"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Retrieve relationships from database
        relationships_data = await _get_tenant_relationships(tenant_id)
        
        # Get network statistics
        network_stats = processing_agent.get_network_statistics(tenant_id)
        
        return {
            "relationships": relationships_data,
            "total": len(relationships_data),
            "network_statistics": network_stats,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving relationships for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/path/{source_id}/{target_id}")
async def discover_path(source_id: str, target_id: str, request: Request, max_degrees: int = 7):
    """Discover relationship path using seven-degree separation"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Use NetworkX-based path discovery
        path = await processing_agent.discover_relationship_path(source_id, target_id, tenant_id, max_degrees)
        
        if not path:
            return {
                "source_id": source_id,
                "target_id": target_id,
                "path": None,
                "degrees": -1,
                "message": f"No path found within {max_degrees} degrees",
                "tenant_id": tenant_id,
                "timestamp": datetime.now().isoformat()
            }
        
        # Analyze path strength and quality
        path_analysis = processing_agent.analyze_relationship_strength(path)
        
        # Generate introduction strategy
        introduction_strategy = _generate_introduction_strategy(path, path_analysis)
        
        return {
            "source_id": source_id,
            "target_id": target_id,
            "path": path,
            "degrees": len(path) - 1,
            "path_analysis": path_analysis,
            "introduction_strategy": introduction_strategy,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error discovering path from {source_id} to {target_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/")
async def create_relationship(relationship_data: dict, request: Request):
    """Create new relationship and add to network graph"""
    tenant_id = get_current_tenant(request)
    user_id = get_current_user(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Validate required fields
        required_fields = ["source_id", "target_id", "relationship_type"]
        for field in required_fields:
            if field not in relationship_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate relationship strength
        strength = relationship_data.get("strength", 0.5)
        if not 0 <= strength <= 1:
            raise HTTPException(status_code=400, detail="Strength must be between 0 and 1")
        
        # Create relationship record
        relationship_id = await _create_relationship_record(relationship_data, tenant_id, user_id or "system")
        
        # Add to NetworkX graph
        processing_agent.add_relationship(
            source=relationship_data["source_id"],
            target=relationship_data["target_id"],
            relationship_type=relationship_data["relationship_type"],
            strength=strength,
            tenant_id=tenant_id,
            metadata=relationship_data.get("metadata", {})
        )
        
        return {
            "relationship_id": relationship_id,
            "message": "Relationship created and added to network graph",
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating relationship: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/network/{person_id}")
async def get_network(person_id: str, request: Request, depth: int = 2):
    """Get network analysis for a specific person"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Get direct connections
        direct_connections = await _get_person_connections(person_id, tenant_id)
        
        # Calculate network metrics
        network_stats = processing_agent.get_network_statistics(tenant_id)
        
        # Find key connectors within specified depth
        key_connectors = await _find_key_connectors(person_id, depth, tenant_id)
        
        return {
            "person_id": person_id,
            "direct_connections": direct_connections,
            "key_connectors": key_connectors,
            "network_statistics": network_stats,
            "analysis_depth": depth,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing network for person {person_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/shortest-paths/{source_id}")
async def get_shortest_paths(source_id: str, request: Request, max_targets: int = 10):
    """Get shortest paths from source to multiple targets"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Get potential targets (sponsors, key stakeholders)
        potential_targets = await _get_potential_targets(tenant_id, max_targets)
        
        paths_found = []
        for target in potential_targets:
            if target["id"] != source_id:
                path = await processing_agent.discover_relationship_path(
                    source_id, target["id"], tenant_id, 7
                )
                if path:
                    path_analysis = processing_agent.analyze_relationship_strength(path)
                    paths_found.append({
                        "target": target,
                        "path": path,
                        "degrees": len(path) - 1,
                        "analysis": path_analysis
                    })
        
        # Sort by path quality and length
        paths_found.sort(key=lambda x: (x["analysis"]["average_strength"], -x["degrees"]), reverse=True)
        
        return {
            "source_id": source_id,
            "paths": paths_found[:max_targets],
            "total_paths_found": len(paths_found),
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error finding shortest paths for {source_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/influence-analysis/{person_id}")
async def get_influence_analysis(person_id: str, request: Request):
    """Analyze person's influence within the network"""
    tenant_id = get_current_tenant(request)
    
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant context required")
    
    try:
        # Calculate influence metrics
        influence_metrics = await _calculate_influence_metrics(person_id, tenant_id)
        
        # Get network position analysis
        network_position = await _analyze_network_position(person_id, tenant_id)
        
        return {
            "person_id": person_id,
            "influence_metrics": influence_metrics,
            "network_position": network_position,
            "tenant_id": tenant_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing influence for person {person_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Helper functions for data operations
async def _get_tenant_relationships(tenant_id: str) -> List[Dict[str, Any]]:
    """Retrieve relationships for a specific tenant"""
    # Connect to database through existing storage layer
    return []

async def _create_relationship_record(relationship_data: dict, tenant_id: str, user_id: str) -> str:
    """Create new relationship record in database"""
    # Insert into database through existing storage layer
    return f"relationship_{datetime.now().timestamp()}"

async def _get_person_connections(person_id: str, tenant_id: str) -> List[Dict[str, Any]]:
    """Get direct connections for a person"""
    # Query database for direct relationships
    return []

async def _find_key_connectors(person_id: str, depth: int, tenant_id: str) -> List[Dict[str, Any]]:
    """Find key connectors within specified network depth"""
    # Use NetworkX to find high-centrality nodes within depth
    return []

async def _get_potential_targets(tenant_id: str, max_targets: int) -> List[Dict[str, Any]]:
    """Get potential connection targets (sponsors, stakeholders)"""
    # Query database for sponsors and key stakeholders
    return []

async def _calculate_influence_metrics(person_id: str, tenant_id: str) -> Dict[str, Any]:
    """Calculate influence metrics for a person"""
    return {
        "degree_centrality": 0.0,
        "betweenness_centrality": 0.0,
        "closeness_centrality": 0.0,
        "eigenvector_centrality": 0.0,
        "influence_score": 0.0
    }

async def _analyze_network_position(person_id: str, tenant_id: str) -> Dict[str, Any]:
    """Analyze person's position within the network"""
    return {
        "position_type": "connector",
        "bridge_potential": 0.0,
        "cluster_membership": [],
        "strategic_value": "medium"
    }

def _generate_introduction_strategy(path: List[str], path_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate strategy for making introductions along the path"""
    if not path or len(path) < 2:
        return {"strategy": "direct_contact", "steps": []}
    
    strategy_type = "warm_introduction" if path_analysis.get("quality") in ["excellent", "good"] else "cautious_approach"
    
    steps = []
    for i in range(len(path) - 1):
        steps.append({
            "step": i + 1,
            "from": path[i],
            "to": path[i + 1],
            "approach": "formal_introduction" if strategy_type == "warm_introduction" else "informal_inquiry"
        })
    
    return {
        "strategy": strategy_type,
        "path_quality": path_analysis.get("quality", "unknown"),
        "confidence_level": path_analysis.get("average_strength", 0),
        "steps": steps,
        "estimated_timeline": f"{len(steps) * 3}-{len(steps) * 7} days"
    }