"""
Relationships router for Zero Gate ESO Platform
Handles relationship mapping and seven-degree path discovery with PostgreSQL integration
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import json
import uuid
from server.auth.jwt_auth import require_auth, require_role, get_current_user_tenant
from shared.schema import relationships

logger = logging.getLogger("zero-gate.relationships")

router = APIRouter(prefix="/api/v2/relationships", tags=["relationships"])

class RelationshipCreate(BaseModel):
    source_person: str = Field(..., description="Source person identifier")
    target_person: str = Field(..., description="Target person identifier")
    relationship_type: str = Field(..., description="Type of relationship")
    strength: float = Field(0.5, description="Relationship strength (0-1)", ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    status: Optional[str] = Field("active", description="Relationship status")

class RelationshipResponse(BaseModel):
    id: str
    source_person: str
    target_person: str
    relationship_type: str
    strength: float
    metadata: Optional[Dict[str, Any]]
    status: str
    created_at: datetime
    updated_at: datetime
    tenant_id: str

class PathDiscoveryRequest(BaseModel):
    source_id: str = Field(..., description="Starting person ID")
    target_id: str = Field(..., description="Target person ID")
    max_depth: int = Field(7, description="Maximum path length", ge=1, le=7)
    algorithm: Optional[str] = Field("bfs", description="Path finding algorithm (bfs, dfs, dijkstra)")

class PathResponse(BaseModel):
    source_id: str
    target_id: str
    path: List[str]
    path_length: int
    path_quality: str
    confidence_score: float
    relationship_analysis: Dict[str, Any]
    algorithm_used: str
    computation_time_ms: float

class NetworkStatsResponse(BaseModel):
    total_relationships: int
    unique_people: int
    relationships_by_type: Dict[str, int]
    average_relationship_strength: float
    network_density: float
    most_connected_person: Optional[str]
    strongest_connections: List[Dict[str, Any]]

@router.get("/", response_model=List[RelationshipResponse])
async def list_relationships(
    request: Request,
    current_user=Depends(require_auth),
    relationship_type: Optional[str] = None,
    min_strength: Optional[float] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """List all relationships for the tenant with filtering"""
    try:
        from server.db import db
        from drizzle_orm import eq, and_, desc, gte, limit as drizzle_limit, offset as drizzle_offset
        
        tenant_id = get_current_user_tenant(current_user)
        
        # Build query with filters
        conditions = [eq(relationships.tenant_id, tenant_id)]
        
        if relationship_type:
            conditions.append(eq(relationships.relationship_type, relationship_type))
        if min_strength is not None:
            conditions.append(gte(relationships.strength, min_strength))
        if status:
            conditions.append(eq(relationships.status, status))
        
        query = (
            db.select()
            .from(relationships)
            .where(and_(*conditions))
            .order_by(desc(relationships.strength), desc(relationships.created_at))
            .limit(drizzle_limit(limit))
            .offset(drizzle_offset(offset))
        )
        
        results = await db.execute(query)
        relationship_list = []
        
        for row in results:
            relationship_list.append(RelationshipResponse(
                id=row.id,
                source_person=row.source_person,
                target_person=row.target_person,
                relationship_type=row.relationship_type,
                strength=row.strength,
                metadata=json.loads(row.metadata) if row.metadata else None,
                status=row.status,
                created_at=row.created_at,
                updated_at=row.updated_at,
                tenant_id=row.tenant_id
            ))
        
        return relationship_list
        
    except Exception as e:
        logger.error(f"Error listing relationships for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve relationships")

@router.post("/", response_model=RelationshipResponse)
async def create_relationship(
    relationship_data: RelationshipCreate,
    request: Request,
    current_user=Depends(require_role("user"))
):
    """Create a new relationship"""
    try:
        from server.db import db
        from drizzle_orm import eq, and_
        
        tenant_id = get_current_user_tenant(current_user)
        relationship_id = str(uuid.uuid4())
        
        # Check for duplicate relationships
        existing = await db.select().from(relationships).where(
            and_(
                eq(relationships.tenant_id, tenant_id),
                eq(relationships.source_person, relationship_data.source_person),
                eq(relationships.target_person, relationship_data.target_person),
                eq(relationships.relationship_type, relationship_data.relationship_type)
            )
        )
        
        if existing:
            raise HTTPException(status_code=400, detail="Relationship already exists")
        
        # Insert relationship
        insert_data = {
            "id": relationship_id,
            "tenant_id": tenant_id,
            "source_person": relationship_data.source_person,
            "target_person": relationship_data.target_person,
            "relationship_type": relationship_data.relationship_type,
            "strength": relationship_data.strength,
            "metadata": json.dumps(relationship_data.metadata) if relationship_data.metadata else None,
            "status": relationship_data.status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.insert(relationships).values(insert_data).returning()
        created_relationship = result[0]
        
        return RelationshipResponse(
            id=created_relationship.id,
            source_person=created_relationship.source_person,
            target_person=created_relationship.target_person,
            relationship_type=created_relationship.relationship_type,
            strength=created_relationship.strength,
            metadata=json.loads(created_relationship.metadata) if created_relationship.metadata else None,
            status=created_relationship.status,
            created_at=created_relationship.created_at,
            updated_at=created_relationship.updated_at,
            tenant_id=created_relationship.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating relationship for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create relationship")

@router.post("/discover-path", response_model=PathResponse)
async def discover_relationship_path(
    path_request: PathDiscoveryRequest,
    request: Request,
    current_user=Depends(require_auth)
):
    """Discover relationship path between two people using seven-degree path discovery"""
    try:
        import time
        start_time = time.time()
        
        tenant_id = get_current_user_tenant(current_user)
        
        # Use processing agent for advanced path discovery
        try:
            import subprocess
            
            # Call processing agent for path discovery
            cmd = [
                "python3", "server/agents/processing.py",
                "find_relationship_path",
                json.dumps({
                    "source": path_request.source_id,
                    "target": path_request.target_id,
                    "tenant_id": tenant_id,
                    "max_depth": path_request.max_depth,
                    "algorithm": path_request.algorithm
                })
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                path_data = json.loads(result.stdout)
                path = path_data.get("path", [])
                analysis = path_data.get("analysis", {})
            else:
                # Fallback to simple BFS
                path, analysis = await _simple_path_discovery(
                    path_request.source_id, 
                    path_request.target_id, 
                    tenant_id, 
                    path_request.max_depth
                )
        
        except Exception as e:
            logger.warning(f"Processing agent failed, using fallback: {str(e)}")
            # Fallback to simple BFS
            path, analysis = await _simple_path_discovery(
                path_request.source_id, 
                path_request.target_id, 
                tenant_id, 
                path_request.max_depth
            )
        
        if not path or len(path) < 2:
            raise HTTPException(status_code=404, detail="No relationship path found")
        
        computation_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Calculate path quality and confidence
        path_length = len(path) - 1
        confidence_score = max(0.1, 1.0 - (path_length / 7.0))  # Higher confidence for shorter paths
        
        if path_length <= 2:
            path_quality = "excellent"
        elif path_length <= 4:
            path_quality = "good"
        elif path_length <= 6:
            path_quality = "fair"
        else:
            path_quality = "weak"
        
        return PathResponse(
            source_id=path_request.source_id,
            target_id=path_request.target_id,
            path=path,
            path_length=path_length,
            path_quality=path_quality,
            confidence_score=round(confidence_score, 3),
            relationship_analysis=analysis,
            algorithm_used=path_request.algorithm,
            computation_time_ms=round(computation_time, 2)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error discovering path for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to discover relationship path")

@router.get("/network/stats", response_model=NetworkStatsResponse)
async def get_network_statistics(
    request: Request,
    current_user=Depends(require_auth)
):
    """Get comprehensive network statistics for the tenant"""
    try:
        from server.db import db
        from drizzle_orm import eq, func, desc
        
        tenant_id = get_current_user_tenant(current_user)
        
        # Total relationships
        total_query = db.select([func.count()]).from(relationships).where(eq(relationships.tenant_id, tenant_id))
        total_result = await db.execute(total_query)
        total_relationships = total_result[0][0]
        
        # Relationships by type
        type_query = (
            db.select([relationships.relationship_type, func.count().label("count")])
            .from(relationships)
            .where(eq(relationships.tenant_id, tenant_id))
            .group_by(relationships.relationship_type)
        )
        
        type_results = await db.execute(type_query)
        relationships_by_type = {row[0]: row[1] for row in type_results}
        
        # Calculate network density
        unique_people = await _count_unique_people(tenant_id)
        max_possible_relationships = unique_people * (unique_people - 1) / 2 if unique_people > 1 else 1
        network_density = total_relationships / max_possible_relationships if max_possible_relationships > 0 else 0.0
        
        # Average relationship strength
        strength_query = db.select([func.avg(relationships.strength)]).from(relationships).where(eq(relationships.tenant_id, tenant_id))
        strength_result = await db.execute(strength_query)
        avg_strength = strength_result[0][0] or 0.0
        
        # Find strongest connections
        strongest_query = (
            db.select([
                relationships.source_person,
                relationships.target_person, 
                relationships.relationship_type,
                relationships.strength
            ])
            .from(relationships)
            .where(eq(relationships.tenant_id, tenant_id))
            .order_by(desc(relationships.strength))
            .limit(5)
        )
        
        strongest_results = await db.execute(strongest_query)
        strongest_connections = [
            {
                "source": row[0],
                "target": row[1], 
                "type": row[2],
                "strength": row[3]
            }
            for row in strongest_results
        ]
        
        return NetworkStatsResponse(
            total_relationships=total_relationships,
            unique_people=unique_people,
            relationships_by_type=relationships_by_type,
            average_relationship_strength=round(avg_strength, 3),
            network_density=round(network_density, 4),
            most_connected_person=await _find_most_connected_person(tenant_id),
            strongest_connections=strongest_connections
        )
        
    except Exception as e:
        logger.error(f"Error getting network statistics for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve network statistics")

async def _simple_path_discovery(source: str, target: str, tenant_id: str, max_depth: int):
    """Simple BFS path discovery fallback"""
    try:
        from server.db import db
        from drizzle_orm import eq
        from collections import deque
        
        # Get all relationships for tenant
        query = db.select([
            relationships.source_person,
            relationships.target_person,
            relationships.strength
        ]).from(relationships).where(eq(relationships.tenant_id, tenant_id))
        
        results = await db.execute(query)
        
        # Build adjacency list
        graph = {}
        for row in results:
            src, tgt, strength = row
            if src not in graph:
                graph[src] = []
            if tgt not in graph:
                graph[tgt] = []
            graph[src].append((tgt, strength))
            graph[tgt].append((src, strength))  # Bidirectional
        
        # BFS to find shortest path
        if source not in graph or target not in graph:
            return [], {"error": "Source or target not found in network"}
        
        queue = deque([(source, [source])])
        visited = set([source])
        
        while queue:
            current, path = queue.popleft()
            
            if len(path) > max_depth:
                continue
                
            if current == target:
                # Calculate path analysis
                total_strength = 0
                min_strength = 1.0
                for i in range(len(path) - 1):
                    for neighbor, strength in graph.get(path[i], []):
                        if neighbor == path[i + 1]:
                            total_strength += strength
                            min_strength = min(min_strength, strength)
                            break
                
                avg_strength = total_strength / (len(path) - 1) if len(path) > 1 else 0
                
                analysis = {
                    "path_strength": round(avg_strength, 3),
                    "weakest_link": round(min_strength, 3),
                    "total_strength": round(total_strength, 3)
                }
                
                return path, analysis
            
            for neighbor, strength in graph.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        
        return [], {"error": "No path found"}
        
    except Exception as e:
        logger.error(f"Error in simple path discovery: {str(e)}")
        return [], {"error": str(e)}

async def _count_unique_people(tenant_id: str) -> int:
    """Count unique people in the relationship network"""
    try:
        from server.db import db
        from drizzle_orm import eq, func
        
        # Use raw SQL for complex union query
        result = await db.execute(f"""
            SELECT COUNT(DISTINCT person) as count FROM (
                SELECT source_person as person FROM relationships WHERE tenant_id = '{tenant_id}'
                UNION
                SELECT target_person as person FROM relationships WHERE tenant_id = '{tenant_id}'
            ) combined
        """)
        
        return result[0][0] if result else 0
        
    except Exception as e:
        logger.error(f"Error counting unique people: {str(e)}")
        return 0

async def _find_most_connected_person(tenant_id: str) -> Optional[str]:
    """Find the person with the most connections"""
    try:
        from server.db import db
        
        # Use raw SQL for complex aggregation
        result = await db.execute(f"""
            SELECT person, COUNT(*) as connections FROM (
                SELECT source_person as person FROM relationships WHERE tenant_id = '{tenant_id}'
                UNION ALL
                SELECT target_person as person FROM relationships WHERE tenant_id = '{tenant_id}'
            ) combined
            GROUP BY person
            ORDER BY connections DESC
            LIMIT 1
        """)
        
        return result[0][0] if result else None
        
    except Exception as e:
        logger.error(f"Error finding most connected person: {str(e)}")
        return None