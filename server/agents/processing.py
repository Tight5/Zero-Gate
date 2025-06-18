"""
ProcessingAgent: Advanced relationship graph processing using NetworkX
Handles sponsor metrics, grant timeline generation, and path discovery algorithms
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import networkx as nx
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Sponsor:
    id: str
    name: str
    tier: str  # 'platinum', 'gold', 'silver', 'bronze'
    contact_strength: float  # 0.0 to 1.0
    funding_capacity: int
    response_rate: float
    last_contact: datetime
    industries: List[str]
    location: str
    tenant_id: str

@dataclass
class Grant:
    id: str
    title: str
    sponsor_id: str
    amount: int
    submission_deadline: datetime
    status: str  # 'active', 'submitted', 'awarded', 'rejected'
    requirements: List[str]
    tenant_id: str

@dataclass
class Relationship:
    source_id: str
    target_id: str
    strength: float  # 0.0 to 1.0
    relationship_type: str  # 'professional', 'personal', 'organizational'
    context: str
    last_interaction: datetime
    tenant_id: str

@dataclass
class PathResult:
    source: str
    target: str
    path: List[str]
    total_strength: float
    path_length: int
    estimated_time_hours: float
    confidence_score: float

@dataclass
class SponsorMetrics:
    sponsor_id: str
    network_centrality: float
    influence_score: float
    funding_probability: float
    response_likelihood: float
    optimal_contact_window: str
    key_connections: List[str]
    grant_success_rate: float

@dataclass
class GrantTimeline:
    grant_id: str
    submission_deadline: datetime
    milestones: List[Dict[str, Any]]
    critical_path: List[str]
    buffer_days: int
    risk_assessment: str

class ProcessingAgent:
    """
    Advanced relationship graph processor using NetworkX for ESO platform
    Provides intelligent path discovery, sponsor analytics, and grant planning
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.graph = nx.DiGraph()  # Directed graph for asymmetric relationships
        self.landmarks = set()  # Key nodes for distance estimation
        self.sponsor_cache = {}
        self.grant_cache = {}
        self.metrics_cache = {}
        self.last_analysis = None
        
        # Performance thresholds
        self.max_path_length = 7
        self.landmark_ratio = 0.1  # 10% of nodes as landmarks
        self.cache_ttl = 3600  # 1 hour cache TTL
        
        logger.info(f"ProcessingAgent initialized for tenant {tenant_id}")
    
    async def add_sponsor(self, sponsor: Sponsor) -> None:
        """Add sponsor node to the relationship graph"""
        try:
            # Add node with sponsor attributes
            self.graph.add_node(
                sponsor.id,
                name=sponsor.name,
                type='sponsor',
                tier=sponsor.tier,
                contact_strength=sponsor.contact_strength,
                funding_capacity=sponsor.funding_capacity,
                response_rate=sponsor.response_rate,
                industries=sponsor.industries,
                location=sponsor.location,
                last_contact=sponsor.last_contact.isoformat(),
                tenant_id=sponsor.tenant_id
            )
            
            self.sponsor_cache[sponsor.id] = sponsor
            
            # Update landmarks if graph size changed significantly
            if len(self.graph.nodes) % 50 == 0:  # Every 50 nodes
                await self._update_landmarks()
            
            logger.info(f"Added sponsor {sponsor.name} to graph")
            
        except Exception as e:
            logger.error(f"Error adding sponsor {sponsor.id}: {e}")
            raise
    
    async def add_relationship(self, relationship: Relationship) -> None:
        """Add relationship edge to the graph"""
        try:
            # Ensure both nodes exist
            if not self.graph.has_node(relationship.source_id):
                self.graph.add_node(relationship.source_id, type='entity', tenant_id=relationship.tenant_id)
            
            if not self.graph.has_node(relationship.target_id):
                self.graph.add_node(relationship.target_id, type='entity', tenant_id=relationship.tenant_id)
            
            # Add weighted edge
            self.graph.add_edge(
                relationship.source_id,
                relationship.target_id,
                weight=relationship.strength,
                relationship_type=relationship.relationship_type,
                context=relationship.context,
                last_interaction=relationship.last_interaction.isoformat(),
                tenant_id=relationship.tenant_id
            )
            
            # Add reverse edge with slightly reduced weight for bidirectionality
            self.graph.add_edge(
                relationship.target_id,
                relationship.source_id,
                weight=relationship.strength * 0.8,  # Asymmetric weighting
                relationship_type=relationship.relationship_type,
                context=f"reverse_{relationship.context}",
                last_interaction=relationship.last_interaction.isoformat(),
                tenant_id=relationship.tenant_id
            )
            
            logger.info(f"Added relationship {relationship.source_id} -> {relationship.target_id}")
            
        except Exception as e:
            logger.error(f"Error adding relationship: {e}")
            raise
    
    async def _update_landmarks(self) -> None:
        """Update landmark nodes for distance estimation"""
        try:
            if len(self.graph.nodes) < 10:
                return
            
            # Calculate centrality measures
            betweenness = nx.betweenness_centrality(self.graph)
            degree_centrality = nx.degree_centrality(self.graph)
            
            # Combine centrality scores
            combined_scores = {}
            for node in self.graph.nodes:
                combined_scores[node] = (
                    betweenness.get(node, 0) * 0.6 +
                    degree_centrality.get(node, 0) * 0.4
                )
            
            # Select top nodes as landmarks
            landmark_count = max(3, int(len(self.graph.nodes) * self.landmark_ratio))
            self.landmarks = set(
                sorted(combined_scores.keys(), key=combined_scores.get, reverse=True)[:landmark_count]
            )
            
            logger.info(f"Updated landmarks: {len(self.landmarks)} nodes selected")
            
        except Exception as e:
            logger.error(f"Error updating landmarks: {e}")
    
    async def estimate_distance(self, source: str, target: str) -> float:
        """Estimate distance between nodes using landmark-based approximation"""
        try:
            if not self.landmarks:
                await self._update_landmarks()
            
            if source == target:
                return 0.0
            
            # Direct path check
            if self.graph.has_edge(source, target):
                return 1.0 / self.graph[source][target]['weight']
            
            # Landmark-based estimation
            min_distance = float('inf')
            
            for landmark in self.landmarks:
                try:
                    # Distance from source to landmark
                    dist_source_landmark = nx.shortest_path_length(
                        self.graph, source, landmark, weight='weight'
                    )
                    
                    # Distance from landmark to target
                    dist_landmark_target = nx.shortest_path_length(
                        self.graph, landmark, target, weight='weight'
                    )
                    
                    total_distance = dist_source_landmark + dist_landmark_target
                    min_distance = min(min_distance, total_distance)
                    
                except nx.NetworkXNoPath:
                    continue
            
            return min_distance if min_distance != float('inf') else -1
            
        except Exception as e:
            logger.error(f"Error estimating distance {source} -> {target}: {e}")
            return -1
    
    async def find_shortest_path(self, source: str, target: str, max_length: int = 7) -> Optional[PathResult]:
        """Find shortest path between nodes up to seven degrees"""
        try:
            if source == target:
                return PathResult(
                    source=source,
                    target=target,
                    path=[source],
                    total_strength=1.0,
                    path_length=0,
                    estimated_time_hours=0.0,
                    confidence_score=1.0
                )
            
            # Use Dijkstra with weight inversion (higher strength = lower cost)
            try:
                path = nx.shortest_path(
                    self.graph,
                    source,
                    target,
                    weight=lambda u, v, d: 1.0 / max(d['weight'], 0.1)  # Avoid division by zero
                )
                
                if len(path) > max_length + 1:  # +1 because path includes both endpoints
                    return None
                
                # Calculate path metrics
                total_strength = 1.0
                estimated_time = 0.0
                
                for i in range(len(path) - 1):
                    edge_data = self.graph[path[i]][path[i + 1]]
                    strength = edge_data['weight']
                    total_strength *= strength
                    
                    # Estimate time based on relationship strength and type
                    base_time = 24  # 24 hours base contact time
                    relationship_type = edge_data.get('relationship_type', 'professional')
                    
                    if relationship_type == 'personal':
                        base_time *= 0.5  # Faster personal connections
                    elif relationship_type == 'organizational':
                        base_time *= 1.5  # Slower organizational connections
                    
                    estimated_time += base_time / strength
                
                # Calculate confidence score based on path length and strength
                confidence = total_strength * (0.9 ** (len(path) - 1))
                
                return PathResult(
                    source=source,
                    target=target,
                    path=path,
                    total_strength=total_strength,
                    path_length=len(path) - 1,
                    estimated_time_hours=estimated_time,
                    confidence_score=confidence
                )
                
            except nx.NetworkXNoPath:
                return None
            
        except Exception as e:
            logger.error(f"Error finding path {source} -> {target}: {e}")
            return None
    
    async def find_multiple_paths(self, source: str, target: str, k: int = 3) -> List[PathResult]:
        """Find k shortest paths between nodes"""
        try:
            paths = []
            
            # Use k-shortest paths algorithm
            try:
                for path in nx.shortest_simple_paths(
                    self.graph,
                    source,
                    target,
                    weight=lambda u, v, d: 1.0 / max(d['weight'], 0.1)
                ):
                    if len(path) > self.max_path_length + 1:
                        break
                    
                    # Calculate path metrics
                    total_strength = 1.0
                    estimated_time = 0.0
                    
                    for i in range(len(path) - 1):
                        edge_data = self.graph[path[i]][path[i + 1]]
                        strength = edge_data['weight']
                        total_strength *= strength
                        estimated_time += 24 / strength  # Base estimation
                    
                    confidence = total_strength * (0.9 ** (len(path) - 1))
                    
                    paths.append(PathResult(
                        source=source,
                        target=target,
                        path=path,
                        total_strength=total_strength,
                        path_length=len(path) - 1,
                        estimated_time_hours=estimated_time,
                        confidence_score=confidence
                    ))
                    
                    if len(paths) >= k:
                        break
                        
            except nx.NetworkXNoPath:
                pass
            
            return sorted(paths, key=lambda p: p.confidence_score, reverse=True)
            
        except Exception as e:
            logger.error(f"Error finding multiple paths: {e}")
            return []
    
    async def calculate_sponsor_metrics(self, sponsor_id: str) -> SponsorMetrics:
        """Calculate comprehensive metrics for a sponsor"""
        try:
            if sponsor_id not in self.graph.nodes:
                raise ValueError(f"Sponsor {sponsor_id} not found in graph")
            
            # Network centrality measures
            betweenness = nx.betweenness_centrality(self.graph).get(sponsor_id, 0)
            degree_centrality = nx.degree_centrality(self.graph).get(sponsor_id, 0)
            closeness = nx.closeness_centrality(self.graph).get(sponsor_id, 0)
            
            # Calculate influence score
            influence_score = (betweenness * 0.4 + degree_centrality * 0.3 + closeness * 0.3)
            
            # Get sponsor data
            sponsor_data = self.graph.nodes[sponsor_id]
            contact_strength = sponsor_data.get('contact_strength', 0.5)
            response_rate = sponsor_data.get('response_rate', 0.5)
            tier = sponsor_data.get('tier', 'bronze')
            
            # Calculate funding probability based on tier and network position
            tier_multipliers = {'platinum': 0.9, 'gold': 0.7, 'silver': 0.5, 'bronze': 0.3}
            funding_probability = tier_multipliers.get(tier, 0.3) * influence_score * contact_strength
            
            # Response likelihood
            response_likelihood = response_rate * (1 + influence_score * 0.5)
            
            # Find key connections (highest strength neighbors)
            neighbors = list(self.graph.neighbors(sponsor_id))
            key_connections = sorted(
                neighbors,
                key=lambda n: self.graph[sponsor_id][n]['weight'],
                reverse=True
            )[:5]  # Top 5 connections
            
            # Optimal contact window based on historical data
            last_contact = sponsor_data.get('last_contact')
            if last_contact:
                days_since = (datetime.now() - datetime.fromisoformat(last_contact)).days
                if days_since < 30:
                    contact_window = "recent_contact"
                elif days_since < 90:
                    contact_window = "optimal"
                else:
                    contact_window = "overdue"
            else:
                contact_window = "initial_contact"
            
            # Grant success rate (simplified calculation)
            grant_success_rate = funding_probability * response_likelihood * 0.8
            
            return SponsorMetrics(
                sponsor_id=sponsor_id,
                network_centrality=influence_score,
                influence_score=influence_score,
                funding_probability=min(funding_probability, 1.0),
                response_likelihood=min(response_likelihood, 1.0),
                optimal_contact_window=contact_window,
                key_connections=key_connections,
                grant_success_rate=min(grant_success_rate, 1.0)
            )
            
        except Exception as e:
            logger.error(f"Error calculating sponsor metrics for {sponsor_id}: {e}")
            raise
    
    async def generate_grant_timeline(self, grant: Grant) -> GrantTimeline:
        """Generate backwards planning timeline for grant submission"""
        try:
            current_date = datetime.now()
            submission_deadline = grant.submission_deadline
            
            if submission_deadline <= current_date:
                raise ValueError("Grant deadline has already passed")
            
            total_days = (submission_deadline - current_date).days
            
            # Define standard milestones with backwards planning
            milestones = [
                {
                    "name": "Final Review and Submission",
                    "days_before_deadline": 1,
                    "duration_days": 2,
                    "priority": "critical",
                    "description": "Final document review, formatting, and submission"
                },
                {
                    "name": "Internal Review and Approval",
                    "days_before_deadline": 7,
                    "duration_days": 5,
                    "priority": "critical",
                    "description": "Internal stakeholder review and approval process"
                },
                {
                    "name": "Budget Finalization",
                    "days_before_deadline": 14,
                    "duration_days": 3,
                    "priority": "high",
                    "description": "Complete budget documentation and justification"
                },
                {
                    "name": "Document Preparation",
                    "days_before_deadline": 21,
                    "duration_days": 7,
                    "priority": "high",
                    "description": "Prepare all required documents and attachments"
                },
                {
                    "name": "Stakeholder Coordination",
                    "days_before_deadline": 30,
                    "duration_days": 9,
                    "priority": "medium",
                    "description": "Coordinate with partners and gather letters of support"
                },
                {
                    "name": "Initial Draft Completion",
                    "days_before_deadline": 45,
                    "duration_days": 15,
                    "priority": "medium",
                    "description": "Complete first draft of grant application"
                },
                {
                    "name": "Research and Planning",
                    "days_before_deadline": 60,
                    "duration_days": 15,
                    "priority": "medium",
                    "description": "Research requirements and develop project plan"
                },
                {
                    "name": "Team Assembly",
                    "days_before_deadline": 75,
                    "duration_days": 10,
                    "priority": "low",
                    "description": "Assemble project team and define roles"
                },
                {
                    "name": "Opportunity Assessment",
                    "days_before_deadline": 90,
                    "duration_days": 5,
                    "priority": "low",
                    "description": "Assess grant opportunity and alignment"
                }
            ]
            
            # Filter milestones based on available time
            valid_milestones = []
            critical_path = []
            
            for milestone in milestones:
                if milestone["days_before_deadline"] <= total_days:
                    milestone_date = submission_deadline - timedelta(days=milestone["days_before_deadline"])
                    milestone["date"] = milestone_date.isoformat()
                    milestone["start_date"] = (milestone_date - timedelta(days=milestone["duration_days"])).isoformat()
                    valid_milestones.append(milestone)
                    
                    if milestone["priority"] == "critical":
                        critical_path.append(milestone["name"])
            
            # Calculate buffer days
            if valid_milestones:
                earliest_start = min(
                    datetime.fromisoformat(m["start_date"]) for m in valid_milestones
                )
                buffer_days = (earliest_start - current_date).days
            else:
                buffer_days = 0
            
            # Risk assessment
            if total_days < 30:
                risk_assessment = "high"
            elif total_days < 60:
                risk_assessment = "medium"
            else:
                risk_assessment = "low"
            
            if buffer_days < 0:
                risk_assessment = "critical"
            
            return GrantTimeline(
                grant_id=grant.id,
                submission_deadline=submission_deadline,
                milestones=valid_milestones,
                critical_path=critical_path,
                buffer_days=buffer_days,
                risk_assessment=risk_assessment
            )
            
        except Exception as e:
            logger.error(f"Error generating grant timeline for {grant.id}: {e}")
            raise
    
    async def get_network_statistics(self) -> Dict[str, Any]:
        """Get comprehensive network statistics"""
        try:
            stats = {
                "node_count": self.graph.number_of_nodes(),
                "edge_count": self.graph.number_of_edges(),
                "density": nx.density(self.graph),
                "is_connected": nx.is_weakly_connected(self.graph),
                "landmark_count": len(self.landmarks),
                "tenant_id": self.tenant_id,
                "last_updated": datetime.now().isoformat()
            }
            
            if self.graph.number_of_nodes() > 0:
                # Calculate additional metrics
                try:
                    stats["average_clustering"] = nx.average_clustering(self.graph.to_undirected())
                    stats["diameter"] = nx.diameter(self.graph.to_undirected()) if nx.is_connected(self.graph.to_undirected()) else -1
                except:
                    stats["average_clustering"] = 0
                    stats["diameter"] = -1
                
                # Node type distribution
                node_types = defaultdict(int)
                for node, data in self.graph.nodes(data=True):
                    node_types[data.get('type', 'unknown')] += 1
                stats["node_types"] = dict(node_types)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting network statistics: {e}")
            return {"error": str(e)}
    
    async def cleanup_cache(self) -> None:
        """Clean up expired cache entries"""
        try:
            current_time = datetime.now()
            if self.last_analysis and (current_time - self.last_analysis).seconds > self.cache_ttl:
                self.metrics_cache.clear()
                self.last_analysis = current_time
                logger.info("Cache cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning cache: {e}")

# Export main class and data structures
__all__ = [
    'ProcessingAgent',
    'Sponsor',
    'Grant', 
    'Relationship',
    'PathResult',
    'SponsorMetrics',
    'GrantTimeline'
]