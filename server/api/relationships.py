"""
FastAPI routes for relationship management with seven-degree path discovery
Provides CRUD operations, network analysis, and advanced pathfinding algorithms
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any, Set, Tuple
import asyncpg
import os
from datetime import datetime, date
from collections import deque, defaultdict
import heapq

from ..auth.jwt_auth import get_current_active_user, TokenData
from .models import (
    RelationshipCreate, RelationshipUpdate, RelationshipResponse, RelationshipMetrics,
    SevenDegreePathResponse, RelationshipPath, PathNode,
    PaginatedResponse, SuccessResponse
)

DATABASE_URL = os.getenv("DATABASE_URL")
router = APIRouter(prefix="/api/v2/relationships", tags=["relationships"])

async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

async def validate_relationship_access(relationship_id: str, tenant_id: str) -> bool:
    """Validate relationship belongs to tenant"""
    conn = await get_db_connection()
    try:
        result = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM relationships WHERE id = $1 AND tenant_id = $2)",
            relationship_id, tenant_id
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

def calculate_strength_score(strength: str) -> float:
    """Convert relationship strength to numeric score"""
    strength_scores = {
        "Weak": 1.0,
        "Moderate": 2.0,
        "Strong": 3.0
    }
    return strength_scores.get(strength, 1.0)

def calculate_type_weight(relationship_type: str) -> float:
    """Calculate weight based on relationship type"""
    type_weights = {
        "Board Member": 3.0,
        "Partner": 2.5,
        "Advisor": 2.0,
        "Professional": 1.5,
        "Vendor": 1.2,
        "Personal": 1.0
    }
    return type_weights.get(relationship_type, 1.0)

@router.get("/", response_model=PaginatedResponse)
async def list_relationships(
    current_user: TokenData = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    relationship_type: Optional[str] = Query(None),
    strength: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    target_id: Optional[str] = Query(None)
):
    """List relationships with pagination and filtering"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        where_conditions = ["r.tenant_id = $1"]
        params = [current_user.tenant_id]
        param_count = 1
        
        if relationship_type:
            param_count += 1
            where_conditions.append(f"r.relationship_type = ${param_count}")
            params.append(relationship_type)
        
        if strength:
            param_count += 1
            where_conditions.append(f"r.strength = ${param_count}")
            params.append(strength)
        
        if source_id:
            param_count += 1
            where_conditions.append(f"r.source_id = ${param_count}")
            params.append(source_id)
        
        if target_id:
            param_count += 1
            where_conditions.append(f"r.target_id = ${param_count}")
            params.append(target_id)
        
        where_clause = " AND ".join(where_conditions)
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM relationships r WHERE {where_clause}"
        total = await conn.fetchval(count_query, *params)
        
        # Get paginated results with entity information
        offset = (page - 1) * size
        query = f"""
            SELECT r.*, 
                   s1.name as source_name, s1.organization as source_organization,
                   s2.name as target_name, s2.organization as target_organization
            FROM relationships r
            LEFT JOIN sponsors s1 ON r.source_id = s1.id
            LEFT JOIN sponsors s2 ON r.target_id = s2.id
            WHERE {where_clause}
            ORDER BY r.created_at DESC
            LIMIT $-1 OFFSET $-2
        """
        
        records = await conn.fetch(query, *params, size, offset)
        relationships = []
        
        for record in records:
            rel_dict = convert_db_record(record)
            
            # Add source entity info
            if rel_dict.get('source_name'):
                rel_dict['source_entity'] = {
                    'id': rel_dict.get('source_id'),
                    'name': rel_dict.get('source_name'),
                    'organization': rel_dict.get('source_organization'),
                    'type': 'sponsor'
                }
            
            # Add target entity info
            if rel_dict.get('target_name'):
                rel_dict['target_entity'] = {
                    'id': rel_dict.get('target_id'),
                    'name': rel_dict.get('target_name'),
                    'organization': rel_dict.get('target_organization'),
                    'type': 'sponsor'
                }
            
            relationships.append(RelationshipResponse(**rel_dict))
        
        return PaginatedResponse(
            items=relationships,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    finally:
        await conn.close()

@router.post("/", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_relationship(
    relationship_data: RelationshipCreate,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create new relationship"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Validate that source and target entities exist
        for entity_id in [relationship_data.source_id, relationship_data.target_id]:
            entity_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM sponsors WHERE id = $1 AND tenant_id = $2)",
                entity_id, current_user.tenant_id
            )
            if not entity_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Entity {entity_id} not found"
                )
        
        # Check for duplicate relationship
        duplicate_exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM relationships 
                WHERE tenant_id = $1 
                AND ((source_id = $2 AND target_id = $3) OR (source_id = $3 AND target_id = $2))
            )
        """, current_user.tenant_id, relationship_data.source_id, relationship_data.target_id)
        
        if duplicate_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Relationship already exists between these entities"
            )
        
        # Generate relationship ID
        import uuid
        relationship_id = str(uuid.uuid4())
        
        # Insert relationship
        query = """
            INSERT INTO relationships (
                id, tenant_id, source_id, target_id, relationship_type, strength,
                description, established_date, tags, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *
        """
        
        record = await conn.fetchrow(
            query,
            relationship_id,
            current_user.tenant_id,
            relationship_data.source_id,
            relationship_data.target_id,
            relationship_data.relationship_type.value,
            relationship_data.strength.value,
            relationship_data.description,
            relationship_data.established_date,
            relationship_data.tags or []
        )
        
        return RelationshipResponse(**convert_db_record(record))
        
    finally:
        await conn.close()

@router.get("/path-discovery/{source_id}/{target_id}", response_model=SevenDegreePathResponse)
async def discover_relationship_path(
    source_id: str,
    target_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    max_degrees: int = Query(7, ge=1, le=7),
    max_paths: int = Query(5, ge=1, le=10)
):
    """Discover relationship paths between two entities using advanced pathfinding"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Validate entities exist
        for entity_id in [source_id, target_id]:
            entity_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM sponsors WHERE id = $1 AND tenant_id = $2)",
                entity_id, current_user.tenant_id
            )
            if not entity_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Entity {entity_id} not found"
                )
        
        # Get entity details
        source_entity = await conn.fetchrow(
            "SELECT id, name, organization, tier FROM sponsors WHERE id = $1 AND tenant_id = $2",
            source_id, current_user.tenant_id
        )
        
        target_entity = await conn.fetchrow(
            "SELECT id, name, organization, tier FROM sponsors WHERE id = $1 AND tenant_id = $2",
            target_id, current_user.tenant_id
        )
        
        # Build relationship graph
        relationships = await conn.fetch("""
            SELECT source_id, target_id, relationship_type, strength
            FROM relationships
            WHERE tenant_id = $1
        """, current_user.tenant_id)
        
        # Create bidirectional graph
        graph = defaultdict(list)
        for rel in relationships:
            # Add both directions for undirected graph
            graph[rel['source_id']].append({
                'target': rel['target_id'],
                'type': rel['relationship_type'],
                'strength': rel['strength'],
                'weight': calculate_strength_score(rel['strength']) * calculate_type_weight(rel['relationship_type'])
            })
            graph[rel['target_id']].append({
                'target': rel['source_id'],
                'type': rel['relationship_type'],
                'strength': rel['strength'],
                'weight': calculate_strength_score(rel['strength']) * calculate_type_weight(rel['relationship_type'])
            })
        
        # Find paths using multiple algorithms
        paths_found = []
        
        # 1. Shortest path (BFS)
        shortest_path = find_shortest_path(graph, source_id, target_id, max_degrees)
        if shortest_path:
            paths_found.append(shortest_path)
        
        # 2. Strongest path (weighted Dijkstra)
        strongest_path = find_strongest_path(graph, source_id, target_id, max_degrees)
        if strongest_path and strongest_path not in paths_found:
            paths_found.append(strongest_path)
        
        # 3. Alternative paths (DFS with pruning)
        alternative_paths = find_alternative_paths(graph, source_id, target_id, max_degrees, max_paths - len(paths_found))
        for path in alternative_paths:
            if path not in paths_found:
                paths_found.append(path)
        
        # Get entity names for path nodes
        all_entity_ids = set()
        for path in paths_found:
            all_entity_ids.update(path['nodes'])
        
        if all_entity_ids:
            entity_records = await conn.fetch("""
                SELECT id, name, organization FROM sponsors 
                WHERE id = ANY($1) AND tenant_id = $2
            """, list(all_entity_ids), current_user.tenant_id)
            
            entity_map = {rec['id']: {'name': rec['name'], 'organization': rec['organization']} for rec in entity_records}
        else:
            entity_map = {}
        
        # Convert to response format
        formatted_paths = []
        for path in paths_found:
            path_nodes = []
            for i, node_id in enumerate(path['nodes']):
                entity_info = entity_map.get(node_id, {'name': 'Unknown', 'organization': None})
                path_node = PathNode(
                    entity_id=node_id,
                    entity_type='sponsor',
                    entity_name=entity_info['name'],
                    relationship_type=path['types'][i] if i < len(path['types']) else None,
                    strength=path['strengths'][i] if i < len(path['strengths']) else None
                )
                path_nodes.append(path_node)
            
            formatted_path = RelationshipPath(
                source_id=source_id,
                target_id=target_id,
                path_length=len(path['nodes']) - 1,
                nodes=path_nodes,
                total_strength_score=path['total_weight'],
                confidence_score=calculate_confidence_score(path)
            )
            formatted_paths.append(formatted_path)
        
        # Determine best paths
        shortest_path_result = min(formatted_paths, key=lambda p: p.path_length) if formatted_paths else None
        strongest_path_result = max(formatted_paths, key=lambda p: p.total_strength_score) if formatted_paths else None
        
        # Analysis
        analysis = {
            "total_paths_found": len(formatted_paths),
            "shortest_path_length": shortest_path_result.path_length if shortest_path_result else None,
            "strongest_connection_score": strongest_path_result.total_strength_score if strongest_path_result else 0,
            "network_density": len(relationships) / max(len(graph) * (len(graph) - 1) / 2, 1),
            "search_depth_reached": max([p.path_length for p in formatted_paths]) if formatted_paths else 0,
            "connection_exists": len(formatted_paths) > 0
        }
        
        return SevenDegreePathResponse(
            source_entity=convert_db_record(source_entity),
            target_entity=convert_db_record(target_entity),
            paths_found=formatted_paths,
            shortest_path=shortest_path_result,
            strongest_path=strongest_path_result,
            analysis=analysis
        )
        
    finally:
        await conn.close()

def find_shortest_path(graph: Dict, source: str, target: str, max_depth: int) -> Optional[Dict]:
    """Find shortest path using BFS"""
    if source == target:
        return {"nodes": [source], "types": [], "strengths": [], "total_weight": 0}
    
    queue = deque([(source, [source], [], [], 0)])
    visited = {source}
    
    while queue:
        current, path, types, strengths, weight = queue.popleft()
        
        if len(path) > max_depth:
            continue
        
        for neighbor_info in graph.get(current, []):
            neighbor = neighbor_info['target']
            
            if neighbor == target:
                return {
                    "nodes": path + [neighbor],
                    "types": types + [neighbor_info['type']],
                    "strengths": strengths + [neighbor_info['strength']],
                    "total_weight": weight + neighbor_info['weight']
                }
            
            if neighbor not in visited and len(path) < max_depth:
                visited.add(neighbor)
                queue.append((
                    neighbor,
                    path + [neighbor],
                    types + [neighbor_info['type']],
                    strengths + [neighbor_info['strength']],
                    weight + neighbor_info['weight']
                ))
    
    return None

def find_strongest_path(graph: Dict, source: str, target: str, max_depth: int) -> Optional[Dict]:
    """Find strongest path using weighted Dijkstra"""
    if source == target:
        return {"nodes": [source], "types": [], "strengths": [], "total_weight": 0}
    
    # Priority queue: (-total_weight, current_node, path, types, strengths, total_weight)
    pq = [(-0, source, [source], [], [], 0)]
    visited = set()
    
    while pq:
        neg_weight, current, path, types, strengths, total_weight = heapq.heappop(pq)
        
        if current in visited or len(path) > max_depth:
            continue
        
        visited.add(current)
        
        if current == target:
            return {
                "nodes": path,
                "types": types,
                "strengths": strengths,
                "total_weight": total_weight
            }
        
        for neighbor_info in graph.get(current, []):
            neighbor = neighbor_info['target']
            
            if neighbor not in visited and len(path) < max_depth:
                new_weight = total_weight + neighbor_info['weight']
                heapq.heappush(pq, (
                    -new_weight,
                    neighbor,
                    path + [neighbor],
                    types + [neighbor_info['type']],
                    strengths + [neighbor_info['strength']],
                    new_weight
                ))
    
    return None

def find_alternative_paths(graph: Dict, source: str, target: str, max_depth: int, max_paths: int) -> List[Dict]:
    """Find alternative paths using DFS with path diversity"""
    if max_paths <= 0:
        return []
    
    paths = []
    
    def dfs(current: str, path: List[str], types: List[str], strengths: List[str], weight: float, visited: Set[str]):
        if len(paths) >= max_paths or len(path) > max_depth:
            return
        
        if current == target and len(path) > 1:
            paths.append({
                "nodes": path[:],
                "types": types[:],
                "strengths": strengths[:],
                "total_weight": weight
            })
            return
        
        for neighbor_info in graph.get(current, []):
            neighbor = neighbor_info['target']
            
            if neighbor not in visited:
                visited.add(neighbor)
                path.append(neighbor)
                types.append(neighbor_info['type'])
                strengths.append(neighbor_info['strength'])
                
                dfs(neighbor, path, types, strengths, weight + neighbor_info['weight'], visited)
                
                path.pop()
                types.pop()
                strengths.pop()
                visited.remove(neighbor)
    
    dfs(source, [source], [], [], 0, {source})
    return paths

def calculate_confidence_score(path: Dict) -> float:
    """Calculate confidence score based on path characteristics"""
    base_score = 100.0
    path_length = len(path['nodes']) - 1
    
    # Penalize longer paths
    length_penalty = min(path_length * 10, 50)
    
    # Boost for strong relationships
    avg_strength = path['total_weight'] / max(path_length, 1)
    strength_bonus = min(avg_strength * 10, 30)
    
    confidence = max(0, base_score - length_penalty + strength_bonus)
    return round(confidence, 2)

@router.get("/metrics/network", response_model=RelationshipMetrics)
async def get_relationship_metrics(
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get comprehensive relationship network metrics"""
    conn = await get_db_connection()
    try:
        await conn.execute("SET app.current_tenant_id = $1", current_user.tenant_id)
        
        # Total relationships
        total_relationships = await conn.fetchval(
            "SELECT COUNT(*) FROM relationships WHERE tenant_id = $1",
            current_user.tenant_id
        )
        
        # Relationships by type
        type_stats = await conn.fetch("""
            SELECT relationship_type, COUNT(*) as count
            FROM relationships 
            WHERE tenant_id = $1
            GROUP BY relationship_type
        """, current_user.tenant_id)
        
        relationships_by_type = {row['relationship_type']: row['count'] for row in type_stats}
        
        # Relationships by strength
        strength_stats = await conn.fetch("""
            SELECT strength, COUNT(*) as count
            FROM relationships 
            WHERE tenant_id = $1
            GROUP BY strength
        """, current_user.tenant_id)
        
        relationships_by_strength = {row['strength']: row['count'] for row in strength_stats}
        
        # Network density calculation
        total_entities = await conn.fetchval(
            "SELECT COUNT(*) FROM sponsors WHERE tenant_id = $1",
            current_user.tenant_id
        )
        
        max_possible_relationships = max(total_entities * (total_entities - 1) / 2, 1)
        network_density = round(total_relationships / max_possible_relationships, 4)
        
        # Key connectors (entities with most connections)
        key_connectors = await conn.fetch("""
            SELECT entity_id, entity_name, connection_count
            FROM (
                SELECT source_id as entity_id, COUNT(*) as connection_count
                FROM relationships WHERE tenant_id = $1
                GROUP BY source_id
                UNION ALL
                SELECT target_id as entity_id, COUNT(*) as connection_count
                FROM relationships WHERE tenant_id = $1
                GROUP BY target_id
            ) combined
            GROUP BY entity_id
            ORDER BY SUM(connection_count) DESC
            LIMIT 10
        """, current_user.tenant_id)
        
        # Get names for key connectors
        if key_connectors:
            connector_ids = [row['entity_id'] for row in key_connectors]
            connector_names = await conn.fetch("""
                SELECT id, name, organization FROM sponsors 
                WHERE id = ANY($1) AND tenant_id = $2
            """, connector_ids, current_user.tenant_id)
            
            name_map = {row['id']: {'name': row['name'], 'organization': row['organization']} for row in connector_names}
            
            key_connectors_list = [
                {
                    "entity_id": row['entity_id'],
                    "entity_name": name_map.get(row['entity_id'], {}).get('name', 'Unknown'),
                    "organization": name_map.get(row['entity_id'], {}).get('organization'),
                    "connection_count": row['connection_count']
                }
                for row in key_connectors
            ]
        else:
            key_connectors_list = []
        
        # Isolated entities (entities with no relationships)
        isolated_entities = await conn.fetch("""
            SELECT s.id, s.name, s.organization
            FROM sponsors s
            LEFT JOIN relationships r ON (s.id = r.source_id OR s.id = r.target_id)
            WHERE s.tenant_id = $1 AND r.id IS NULL
            ORDER BY s.name
            LIMIT 20
        """, current_user.tenant_id)
        
        isolated_list = [
            {
                "entity_id": row['id'],
                "entity_name": row['name'],
                "organization": row['organization']
            }
            for row in isolated_entities
        ]
        
        return RelationshipMetrics(
            total_relationships=total_relationships,
            relationships_by_type=relationships_by_type,
            relationships_by_strength=relationships_by_strength,
            network_density=network_density,
            key_connectors=key_connectors_list,
            isolated_entities=isolated_list
        )
        
    finally:
        await conn.close()