"""
Processing Agent for Zero Gate ESO Platform
NetworkX-based relationship graph processing with seven-degree path discovery
"""
import logging
import networkx as nx
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from utils.resource_monitor import ResourceMonitor

logger = logging.getLogger("zero-gate.processing")

class ProcessingAgent:
    def __init__(self, resource_monitor: ResourceMonitor):
        self.resource_monitor = resource_monitor
        self.relationship_graph = nx.Graph()
        self.landmarks = set()
        self.landmark_distances = {}
        logger.info("Processing Agent initialized with NetworkX")
        
    def add_relationship(self, source: str, target: str, 
                        relationship_type: str, strength: float,
                        tenant_id: str, metadata: Optional[Dict[str, Any]] = None):
        """Add a relationship to the graph"""
        if metadata is None:
            metadata = {}
            
        self.relationship_graph.add_edge(
            source, target,
            type=relationship_type,
            strength=strength,
            tenant_id=tenant_id,
            created_at=datetime.now(),
            **metadata
        )
        
        # Update landmarks if needed
        if len(self.relationship_graph.nodes) % 100 == 0:
            self._update_landmarks()
    
    def _update_landmarks(self):
        """Update landmark nodes for efficient pathfinding"""
        if not self.resource_monitor.is_feature_enabled("relationship_mapping"):
            return
        
        # Select high-degree nodes as landmarks
        degrees = dict(self.relationship_graph.degree())
        sorted_nodes = sorted(degrees.items(), key=lambda x: x[1], reverse=True)
        
        # Select top 10% as landmarks, minimum 10, maximum 100
        num_landmarks = max(10, min(100, len(sorted_nodes) // 10))
        self.landmarks = set([node for node, _ in sorted_nodes[:num_landmarks]])
        
        # Precompute distances to landmarks
        self._precompute_landmark_distances()
    
    def _precompute_landmark_distances(self):
        """Precompute distances from each node to landmarks"""
        self.landmark_distances = {}
        
        for node in self.relationship_graph.nodes():
            self.landmark_distances[node] = {}
            for landmark in self.landmarks:
                try:
                    path = nx.shortest_path(self.relationship_graph, node, landmark)
                    self.landmark_distances[node][landmark] = len(path) - 1
                except nx.NetworkXNoPath:
                    self.landmark_distances[node][landmark] = float('inf')
    
    async def discover_relationship_path(self, source: str, target: str, tenant_id: str, max_depth: int = 7) -> Optional[List[str]]:
        """Find relationship path between two individuals using seven-degree separation"""
        if not self.resource_monitor.is_feature_enabled("relationship_mapping"):
            logger.warning("Relationship mapping disabled due to resource constraints")
            return None
        
        try:
            # Use landmark-based estimation for efficiency
            if self.landmarks and source in self.landmark_distances and target in self.landmark_distances:
                estimated_distance = self._estimate_distance(source, target)
                if estimated_distance > max_depth:
                    return None
            
            # Find actual shortest path
            path = nx.shortest_path(self.relationship_graph, source, target)
            
            if len(path) - 1 <= max_depth:
                return path
            else:
                return None
                
        except nx.NetworkXNoPath:
            return None
        except Exception as e:
            logger.error(f"Error finding relationship path: {str(e)}")
            return None
    
    def _estimate_distance(self, source: str, target: str) -> float:
        """Estimate distance between two nodes using landmarks"""
        min_distance = float('inf')
        
        for landmark in self.landmarks:
            source_dist = self.landmark_distances.get(source, {}).get(landmark, float('inf'))
            target_dist = self.landmark_distances.get(target, {}).get(landmark, float('inf'))
            
            if source_dist != float('inf') and target_dist != float('inf'):
                estimated = abs(source_dist - target_dist)
                min_distance = min(min_distance, estimated)
        
        return min_distance
    
    def analyze_relationship_strength(self, path: List[str]) -> Dict[str, Any]:
        """Analyze the strength of relationships in a path"""
        if len(path) < 2:
            return {"strength": 0, "quality": "none"}
        
        strengths = []
        relationship_types = []
        
        for i in range(len(path) - 1):
            edge_data = self.relationship_graph.get_edge_data(path[i], path[i + 1])
            if edge_data:
                strengths.append(edge_data.get('strength', 0))
                relationship_types.append(edge_data.get('type', 'unknown'))
        
        avg_strength = sum(strengths) / len(strengths) if strengths else 0
        min_strength = min(strengths) if strengths else 0
        
        return {
            "average_strength": avg_strength,
            "minimum_strength": min_strength,
            "path_length": len(path) - 1,
            "relationship_types": relationship_types,
            "quality": self._assess_path_quality(avg_strength, min_strength)
        }
    
    def _assess_path_quality(self, avg_strength: float, min_strength: float) -> str:
        """Assess the quality of a relationship path"""
        if min_strength >= 0.8 and avg_strength >= 0.8:
            return "excellent"
        elif min_strength >= 0.6 and avg_strength >= 0.7:
            return "good"
        elif min_strength >= 0.4 and avg_strength >= 0.5:
            return "fair"
        else:
            return "weak"
    
    async def generate_grant_timeline(self, grant_deadline: datetime, grant_type: str) -> Dict[str, Any]:
        """Generate backwards-planned timeline for grant preparation"""
        milestones = {}
        
        # 90-day milestone
        milestone_90 = grant_deadline - timedelta(days=90)
        milestones['90_days'] = {
            "date": milestone_90.isoformat(),
            "title": "Content Strategy Development",
            "tasks": [
                "Content audit and gap analysis",
                "Stakeholder mapping and engagement plan",
                "Initial collateral development",
                "Communication strategy framework"
            ]
        }
        
        # 60-day milestone
        milestone_60 = grant_deadline - timedelta(days=60)
        milestones['60_days'] = {
            "date": milestone_60.isoformat(),
            "title": "Content Development and Review",
            "tasks": [
                "Draft content review and feedback",
                "Channel preparation and testing",
                "Internal stakeholder briefing",
                "Content calendar finalization"
            ]
        }
        
        # 30-day milestone
        milestone_30 = grant_deadline - timedelta(days=30)
        milestones['30_days'] = {
            "date": milestone_30.isoformat(),
            "title": "Execution and Engagement",
            "tasks": [
                "Content publication across channels",
                "Engagement monitoring and adjustment",
                "Final grant preparation",
                "Stakeholder follow-up implementation"
            ]
        }
        
        return {
            "grant_deadline": grant_deadline.isoformat(),
            "grant_type": grant_type,
            "milestones": milestones,
            "total_preparation_days": 90
        }
    
    async def analyze_sponsor_metrics(self, sponsor_id: str, tenant_id: str, sponsor_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Calculate ESO-specific metrics for sponsor relationships"""
        if not self.resource_monitor.is_feature_enabled("advanced_analytics"):
            return {"status": "disabled", "message": "Analytics disabled due to resource constraints"}
        
        if sponsor_data is None:
            sponsor_data = {}
        
        try:
            # Relationship strength indicators
            communication_frequency = sponsor_data.get("communication_frequency", 50)
            response_time = sponsor_data.get("avg_response_time", 24)
            engagement_quality = sponsor_data.get("engagement_quality", 75)
            
            # Calculate composite relationship score
            relationship_score = (
                (communication_frequency * 0.3) +
                (max(0, 100 - response_time) * 0.3) +  # Lower response time is better
                (engagement_quality * 0.4)
            ) / 100
            
            # Sponsorship fulfillment metrics
            deliverables_completed = sponsor_data.get("deliverables_completed", 8)
            total_deliverables = sponsor_data.get("total_deliverables", 10)
            fulfillment_rate = deliverables_completed / total_deliverables if total_deliverables > 0 else 0
            
            # Network centrality calculation
            network_centrality = 0.0
            if sponsor_id in self.relationship_graph.nodes():
                centrality = nx.degree_centrality(self.relationship_graph)
                network_centrality = centrality.get(sponsor_id, 0.0)
            
            return {
                "sponsor_id": sponsor_id,
                "relationship_score": round(relationship_score, 2),
                "fulfillment_rate": round(fulfillment_rate, 2),
                "network_centrality": round(network_centrality, 2),
                "communication_effectiveness": communication_frequency,
                "response_efficiency": max(0, 100 - response_time),
                "overall_health": round((relationship_score + fulfillment_rate) / 2, 2),
                "recommended_approach": self._get_recommended_approach(relationship_score, fulfillment_rate)
            }
            
        except Exception as e:
            logger.error(f"Error calculating sponsor metrics: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def _get_recommended_approach(self, relationship_score: float, fulfillment_rate: float) -> str:
        """Get recommended approach based on metrics"""
        if relationship_score >= 0.8 and fulfillment_rate >= 0.8:
            return "strategic_partnership"
        elif relationship_score >= 0.6 and fulfillment_rate >= 0.6:
            return "direct_engagement"
        elif relationship_score >= 0.4:
            return "relationship_building"
        else:
            return "introductory_contact"
    
    def get_network_statistics(self, tenant_id: str) -> Dict[str, Any]:
        """Get network statistics for tenant"""
        try:
            total_nodes = self.relationship_graph.number_of_nodes()
            total_edges = self.relationship_graph.number_of_edges()
            
            if total_nodes == 0:
                return {
                    "total_nodes": 0,
                    "total_edges": 0,
                    "density": 0.0,
                    "connected_components": 0,
                    "average_clustering": 0.0
                }
            
            density = nx.density(self.relationship_graph)
            components = nx.number_connected_components(self.relationship_graph)
            clustering = nx.average_clustering(self.relationship_graph) if total_nodes > 2 else 0.0
            
            return {
                "total_nodes": total_nodes,
                "total_edges": total_edges,
                "density": round(density, 3),
                "connected_components": components,
                "average_clustering": round(clustering, 3),
                "landmarks_count": len(self.landmarks)
            }
            
        except Exception as e:
            logger.error(f"Error calculating network statistics: {str(e)}")
            return {"status": "error", "message": str(e)}