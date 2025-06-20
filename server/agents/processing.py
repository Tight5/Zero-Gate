"""
Processing Agent for Zero Gate ESO Platform
Handles NetworkX-based relationship graph management, sponsor metrics, and grant timeline generation
"""
import logging
import networkx as nx
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("zero-gate.processing")

class ProcessingAgent:
    def __init__(self, resource_monitor=None):
        self.resource_monitor = resource_monitor
        self.relationship_graph = nx.Graph()
        self.landmarks = set()
        self.landmark_distances = {}
        self.sponsor_cache = {}
        self.grant_cache = {}
        
    def add_relationship(self, source: str, target: str, 
                        relationship_type: str, strength: float,
                        tenant_id: str, metadata: Dict[str, Any] = None):
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
        if self.resource_monitor and not self.resource_monitor.is_feature_enabled("relationship_mapping"):
            return
        
        # Select high-degree nodes as landmarks
        degrees = dict(self.relationship_graph.degree())
        if not degrees:
            return
            
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
    
    def find_relationship_path(self, source: str, target: str, 
                             tenant_id: str, max_depth: int = 7) -> Optional[List[str]]:
        """Find relationship path between two individuals up to seven degrees"""
        if self.resource_monitor and not self.resource_monitor.is_feature_enabled("relationship_mapping"):
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
    
    def find_all_paths_within_degrees(self, source: str, target: str, 
                                    tenant_id: str, max_depth: int = 7) -> List[List[str]]:
        """Find all paths between two nodes within specified degrees"""
        try:
            paths = []
            for path in nx.all_simple_paths(self.relationship_graph, source, target, cutoff=max_depth):
                if len(path) - 1 <= max_depth:
                    paths.append(path)
            
            # Sort by path length and relationship strength
            paths.sort(key=lambda p: (len(p), -self._calculate_path_strength(p)))
            return paths[:10]  # Return top 10 paths
            
        except nx.NetworkXNoPath:
            return []
        except Exception as e:
            logger.error(f"Error finding all paths: {str(e)}")
            return []
    
    def _calculate_path_strength(self, path: List[str]) -> float:
        """Calculate overall strength of a path"""
        if len(path) < 2:
            return 0
        
        strengths = []
        for i in range(len(path) - 1):
            edge_data = self.relationship_graph.get_edge_data(path[i], path[i + 1])
            if edge_data:
                strengths.append(edge_data.get('strength', 0))
        
        return sum(strengths) / len(strengths) if strengths else 0
    
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
    
    def analyze_relationship_strength(self, path: List[str], tenant_id: str) -> Dict[str, Any]:
        """Analyze the strength of relationships in a path"""
        if len(path) < 2:
            return {"strength": 0, "quality": "none"}
        
        strengths = []
        relationship_types = []
        edge_details = []
        
        for i in range(len(path) - 1):
            edge_data = self.relationship_graph.get_edge_data(path[i], path[i + 1])
            if edge_data:
                strength = edge_data.get('strength', 0)
                rel_type = edge_data.get('type', 'unknown')
                strengths.append(strength)
                relationship_types.append(rel_type)
                edge_details.append({
                    "from": path[i],
                    "to": path[i + 1],
                    "type": rel_type,
                    "strength": strength,
                    "created_at": edge_data.get('created_at', '').isoformat() if edge_data.get('created_at') else ''
                })
        
        avg_strength = sum(strengths) / len(strengths) if strengths else 0
        min_strength = min(strengths) if strengths else 0
        
        return {
            "average_strength": avg_strength,
            "minimum_strength": min_strength,
            "path_length": len(path) - 1,
            "relationship_types": relationship_types,
            "edge_details": edge_details,
            "quality": self._assess_path_quality(avg_strength, min_strength),
            "confidence_score": self._calculate_confidence_score(strengths, len(path))
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
    
    def _calculate_confidence_score(self, strengths: List[float], path_length: int) -> float:
        """Calculate confidence score for path reliability"""
        if not strengths:
            return 0
        
        # Base score from average strength
        avg_strength = sum(strengths) / len(strengths)
        
        # Penalty for path length (longer paths are less reliable)
        length_penalty = max(0, 1 - (path_length - 1) * 0.1)
        
        # Penalty for weak links
        min_strength = min(strengths)
        weak_link_penalty = min_strength
        
        return avg_strength * length_penalty * weak_link_penalty
    
    def generate_grant_timeline(self, grant_deadline: datetime, 
                              grant_type: str, tenant_id: str) -> Dict[str, Any]:
        """Generate backwards-planned timeline for grant preparation"""
        milestones = {}
        
        # 90-day milestone
        milestone_90 = grant_deadline - timedelta(days=90)
        milestones['90_days'] = {
            "date": milestone_90.isoformat(),
            "title": "Strategic Foundation & Content Strategy",
            "description": "Establish strategic foundation and comprehensive content strategy",
            "tasks": [
                "Complete comprehensive content audit and gap analysis",
                "Develop stakeholder mapping and engagement strategy",
                "Create initial grant proposal framework",
                "Establish communication strategy and timeline",
                "Identify key relationship pathways and influencers",
                "Begin preliminary sponsor outreach and relationship building"
            ],
            "deliverables": [
                "Content audit report",
                "Stakeholder engagement plan",
                "Grant proposal outline",
                "Communication timeline"
            ],
            "risk_factors": ["Resource allocation", "Stakeholder availability"],
            "days_from_deadline": 90
        }
        
        # 60-day milestone
        milestone_60 = grant_deadline - timedelta(days=60)
        milestones['60_days'] = {
            "date": milestone_60.isoformat(),
            "title": "Content Development & Review Cycle",
            "description": "Intensive content development and stakeholder review process",
            "tasks": [
                "Complete draft content development and review",
                "Conduct internal stakeholder briefings and feedback sessions",
                "Finalize channel preparation and testing protocols",
                "Implement content calendar and scheduling system",
                "Execute relationship pathway activation",
                "Conduct mid-cycle sponsor relationship assessment"
            ],
            "deliverables": [
                "Draft grant proposal",
                "Stakeholder feedback report",
                "Content calendar",
                "Channel testing results"
            ],
            "risk_factors": ["Content quality", "Stakeholder feedback integration"],
            "days_from_deadline": 60
        }
        
        # 30-day milestone
        milestone_30 = grant_deadline - timedelta(days=30)
        milestones['30_days'] = {
            "date": milestone_30.isoformat(),
            "title": "Execution & Final Grant Preparation",
            "description": "Final execution phase and grant submission preparation",
            "tasks": [
                "Execute content publication across all channels",
                "Implement real-time engagement monitoring and adjustments",
                "Complete final grant proposal preparation and review",
                "Conduct comprehensive stakeholder follow-up implementation",
                "Activate all relationship pathways for maximum impact",
                "Perform final quality assurance and submission readiness check"
            ],
            "deliverables": [
                "Published content across channels",
                "Final grant proposal",
                "Engagement metrics report",
                "Submission package"
            ],
            "risk_factors": ["Timing coordination", "Final review quality"],
            "days_from_deadline": 30
        }
        
        # Calculate critical path and risk assessment
        total_tasks = sum(len(milestone["tasks"]) for milestone in milestones.values())
        
        return {
            "grant_deadline": grant_deadline.isoformat(),
            "grant_type": grant_type,
            "tenant_id": tenant_id,
            "milestones": milestones,
            "total_preparation_days": 90,
            "total_tasks": total_tasks,
            "critical_path_analysis": self._analyze_critical_path(milestones),
            "risk_assessment": self._assess_timeline_risks(milestones),
            "success_probability": self._calculate_success_probability(grant_type, 90)
        }
    
    def _analyze_critical_path(self, milestones: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze critical path for grant timeline"""
        return {
            "critical_milestones": ["90_days", "60_days", "30_days"],
            "buffer_days": 7,  # Built-in buffer
            "parallel_tasks": ["Content development", "Stakeholder engagement"],
            "sequential_dependencies": [
                "Strategic foundation → Content development → Final preparation"
            ]
        }
    
    def _assess_timeline_risks(self, milestones: Dict[str, Any]) -> Dict[str, Any]:
        """Assess risks in the grant timeline"""
        risk_factors = []
        for milestone in milestones.values():
            risk_factors.extend(milestone.get("risk_factors", []))
        
        return {
            "high_risk_factors": ["Resource allocation", "Final review quality"],
            "medium_risk_factors": ["Stakeholder availability", "Content quality"],
            "low_risk_factors": ["Timing coordination"],
            "mitigation_strategies": [
                "Early stakeholder engagement",
                "Buffer time allocation",
                "Quality checkpoints at each milestone"
            ]
        }
    
    def _calculate_success_probability(self, grant_type: str, preparation_days: int) -> float:
        """Calculate success probability based on grant type and preparation time"""
        base_probability = 0.7  # 70% base success rate
        
        # Adjust for preparation time
        if preparation_days >= 90:
            time_factor = 1.0
        elif preparation_days >= 60:
            time_factor = 0.85
        elif preparation_days >= 30:
            time_factor = 0.7
        else:
            time_factor = 0.5
        
        # Adjust for grant type complexity
        grant_complexity = {
            "federal": 0.8,
            "state": 0.9,
            "foundation": 0.95,
            "corporate": 1.0,
            "research": 0.75
        }
        
        complexity_factor = grant_complexity.get(grant_type.lower(), 0.9)
        
        return min(0.95, base_probability * time_factor * complexity_factor)
    
    def calculate_sponsor_metrics(self, sponsor_data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        """Calculate ESO-specific metrics for sponsor relationships"""
        if self.resource_monitor and not self.resource_monitor.is_feature_enabled("advanced_analytics"):
            return {"status": "disabled", "message": "Analytics disabled due to resource constraints"}
        
        try:
            # Extract sponsor data
            sponsor_id = sponsor_data.get("id", "unknown")
            
            # Relationship strength indicators
            communication_frequency = sponsor_data.get("communication_frequency", 0)
            response_time = sponsor_data.get("avg_response_time", 24)  # hours
            engagement_quality = sponsor_data.get("engagement_quality", 50)  # 0-100 scale
            
            # Calculate composite relationship score
            # Normalize communication frequency (assume max 10 contacts per month)
            comm_score = min(1.0, communication_frequency / 10.0)
            
            # Normalize response time (assume 24 hours is baseline, lower is better)
            response_score = max(0, min(1.0, (48 - response_time) / 48))
            
            # Normalize engagement quality (0-100 scale)
            engagement_score = engagement_quality / 100.0
            
            relationship_score = (
                (comm_score * 0.3) +
                (response_score * 0.3) +
                (engagement_score * 0.4)
            )
            
            # Sponsorship fulfillment metrics
            deliverables_completed = sponsor_data.get("deliverables_completed", 0)
            total_deliverables = sponsor_data.get("total_deliverables", 1)
            fulfillment_rate = deliverables_completed / total_deliverables if total_deliverables > 0 else 0
            
            # Network centrality if sponsor is in relationship graph
            centrality_score = 0
            if sponsor_id in self.relationship_graph.nodes:
                centrality_score = nx.degree_centrality(self.relationship_graph).get(sponsor_id, 0)
            
            # Calculate tier classification
            tier = self._calculate_sponsor_tier(relationship_score, fulfillment_rate, centrality_score)
            
            # Risk assessment
            risk_score = self._calculate_sponsor_risk(sponsor_data, relationship_score, fulfillment_rate)
            
            metrics = {
                "sponsor_id": sponsor_id,
                "tenant_id": tenant_id,
                "relationship_score": round(relationship_score, 3),
                "fulfillment_rate": round(fulfillment_rate, 3),
                "communication_effectiveness": round(comm_score, 3),
                "response_efficiency": round(response_score, 3),
                "engagement_quality_score": round(engagement_score, 3),
                "network_centrality": round(centrality_score, 3),
                "overall_health": round((relationship_score + fulfillment_rate) / 2, 3),
                "tier_classification": tier,
                "risk_assessment": risk_score,
                "recommendation": self._generate_sponsor_recommendation(relationship_score, fulfillment_rate, risk_score),
                "calculated_at": datetime.now().isoformat()
            }
            
            # Cache the results
            self.sponsor_cache[f"{tenant_id}_{sponsor_id}"] = metrics
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating sponsor metrics: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def _calculate_sponsor_tier(self, relationship_score: float, fulfillment_rate: float, centrality_score: float) -> str:
        """Calculate sponsor tier classification"""
        composite_score = (relationship_score * 0.4) + (fulfillment_rate * 0.4) + (centrality_score * 0.2)
        
        if composite_score >= 0.8:
            return "platinum"
        elif composite_score >= 0.6:
            return "gold"
        elif composite_score >= 0.4:
            return "silver"
        else:
            return "bronze"
    
    def _calculate_sponsor_risk(self, sponsor_data: Dict[str, Any], relationship_score: float, fulfillment_rate: float) -> Dict[str, Any]:
        """Calculate risk assessment for sponsor relationship"""
        risk_factors = []
        risk_level = "low"
        
        if relationship_score < 0.3:
            risk_factors.append("Low relationship strength")
            risk_level = "high"
        elif relationship_score < 0.5:
            risk_factors.append("Moderate relationship concerns")
            risk_level = "medium" if risk_level == "low" else risk_level
        
        if fulfillment_rate < 0.7:
            risk_factors.append("Below-target fulfillment rate")
            risk_level = "high"
        elif fulfillment_rate < 0.8:
            risk_factors.append("Fulfillment rate needs improvement")
            risk_level = "medium" if risk_level == "low" else risk_level
        
        last_contact = sponsor_data.get("last_contact_date")
        if last_contact:
            try:
                last_contact_date = datetime.fromisoformat(last_contact.replace('Z', '+00:00'))
                days_since_contact = (datetime.now() - last_contact_date.replace(tzinfo=None)).days
                if days_since_contact > 60:
                    risk_factors.append("Extended period without contact")
                    risk_level = "high"
                elif days_since_contact > 30:
                    risk_factors.append("Infrequent recent contact")
                    risk_level = "medium" if risk_level == "low" else risk_level
            except:
                pass
        
        return {
            "level": risk_level,
            "factors": risk_factors,
            "score": len(risk_factors) / 5.0  # Normalize to 0-1 scale
        }
    
    def _generate_sponsor_recommendation(self, relationship_score: float, fulfillment_rate: float, risk_score: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations for sponsor management"""
        recommendations = []
        
        if risk_score["level"] == "high":
            recommendations.append("Schedule immediate relationship review meeting")
            recommendations.append("Develop targeted engagement strategy")
        
        if relationship_score < 0.5:
            recommendations.append("Increase communication frequency")
            recommendations.append("Implement relationship-building activities")
        
        if fulfillment_rate < 0.8:
            recommendations.append("Review and clarify deliverable expectations")
            recommendations.append("Implement progress tracking system")
        
        if not recommendations:
            recommendations.append("Maintain current engagement level")
            recommendations.append("Continue monitoring relationship health")
        
        return recommendations
    
    def get_network_statistics(self, tenant_id: str) -> Dict[str, Any]:
        """Get comprehensive network statistics for tenant"""
        try:
            # Filter nodes by tenant
            tenant_nodes = [n for n in self.relationship_graph.nodes() 
                          if any(self.relationship_graph.get_edge_data(n, neighbor, {}).get('tenant_id') == tenant_id 
                                for neighbor in self.relationship_graph.neighbors(n))]
            
            if not tenant_nodes:
                return {"nodes": 0, "edges": 0, "density": 0, "components": 0}
            
            # Create subgraph for tenant
            tenant_subgraph = self.relationship_graph.subgraph(tenant_nodes)
            
            stats = {
                "nodes": len(tenant_subgraph.nodes()),
                "edges": len(tenant_subgraph.edges()),
                "density": nx.density(tenant_subgraph),
                "components": nx.number_connected_components(tenant_subgraph),
                "average_clustering": nx.average_clustering(tenant_subgraph),
                "diameter": self._safe_diameter(tenant_subgraph),
                "centrality_leaders": self._get_centrality_leaders(tenant_subgraph),
                "tenant_id": tenant_id
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating network statistics: {str(e)}")
            return {"error": str(e)}
    
    def _safe_diameter(self, graph):
        """Safely calculate graph diameter"""
        try:
            if nx.is_connected(graph):
                return nx.diameter(graph)
            else:
                # For disconnected graphs, return the maximum diameter of components
                components = nx.connected_components(graph)
                max_diameter = 0
                for component in components:
                    subgraph = graph.subgraph(component)
                    if len(subgraph) > 1:
                        max_diameter = max(max_diameter, nx.diameter(subgraph))
                return max_diameter
        except:
            return 0
    
    def _get_centrality_leaders(self, graph, limit: int = 5):
        """Get top nodes by centrality measures"""
        try:
            if len(graph.nodes()) == 0:
                return {}
            
            degree_centrality = nx.degree_centrality(graph)
            betweenness_centrality = nx.betweenness_centrality(graph)
            closeness_centrality = nx.closeness_centrality(graph)
            
            return {
                "degree": sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:limit],
                "betweenness": sorted(betweenness_centrality.items(), key=lambda x: x[1], reverse=True)[:limit],
                "closeness": sorted(closeness_centrality.items(), key=lambda x: x[1], reverse=True)[:limit]
            }
        except Exception as e:
            logger.error(f"Error calculating centrality leaders: {str(e)}")
            return {}

# Global processing agent instance
processing_agent = ProcessingAgent()

def get_processing_agent():
    """Get the global processing agent instance"""
    return processing_agent