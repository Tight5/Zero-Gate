#!/usr/bin/env python3
"""
Comprehensive test suite for ProcessingAgent
Tests NetworkX-based relationship graph management, seven-degree path discovery,
sponsor metrics calculation, and grant timeline generation
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Add server directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server', 'agents'))

from processing import ProcessingAgent

class TestProcessingAgent:
    """Test suite for ProcessingAgent functionality"""
    
    def setup_method(self):
        """Set up test environment for each test"""
        self.mock_resource_monitor = Mock()
        self.mock_resource_monitor.is_feature_enabled.return_value = True
        self.agent = ProcessingAgent(resource_monitor=self.mock_resource_monitor)
        self.tenant_id = "test-tenant-123"
    
    def test_add_relationship_basic(self):
        """Test basic relationship addition to the graph"""
        source = "john_doe"
        target = "jane_smith"
        relationship_type = "professional"
        strength = 0.8
        
        self.agent.add_relationship(
            source=source,
            target=target,
            relationship_type=relationship_type,
            strength=strength,
            tenant_id=self.tenant_id
        )
        
        # Verify relationship was added
        assert self.agent.relationship_graph.has_edge(source, target)
        edge_data = self.agent.relationship_graph.get_edge_data(source, target)
        assert edge_data['type'] == relationship_type
        assert edge_data['strength'] == strength
        assert edge_data['tenant_id'] == self.tenant_id
        assert 'created_at' in edge_data
    
    def test_add_relationship_with_metadata(self):
        """Test relationship addition with custom metadata"""
        source = "alice_johnson"
        target = "bob_wilson"
        metadata = {
            "meeting_frequency": 5,
            "collaboration_type": "grant_writing",
            "last_interaction": "2024-01-15"
        }
        
        self.agent.add_relationship(
            source=source,
            target=target,
            relationship_type="collaboration",
            strength=0.9,
            tenant_id=self.tenant_id,
            metadata=metadata
        )
        
        edge_data = self.agent.relationship_graph.get_edge_data(source, target)
        assert edge_data['meeting_frequency'] == 5
        assert edge_data['collaboration_type'] == "grant_writing"
        assert edge_data['last_interaction'] == "2024-01-15"
    
    def test_find_relationship_path_direct(self):
        """Test finding direct relationship path between two nodes"""
        # Create a simple path: A -> B -> C
        self.agent.add_relationship("A", "B", "professional", 0.8, self.tenant_id)
        self.agent.add_relationship("B", "C", "collaboration", 0.7, self.tenant_id)
        
        path = self.agent.find_relationship_path("A", "C", self.tenant_id, max_depth=7)
        
        assert path is not None
        assert path == ["A", "B", "C"]
        assert len(path) - 1 == 2  # 2 degrees of separation
    
    def test_find_relationship_path_no_connection(self):
        """Test path finding when no connection exists"""
        self.agent.add_relationship("A", "B", "professional", 0.8, self.tenant_id)
        # No connection between C and D
        
        path = self.agent.find_relationship_path("A", "D", self.tenant_id)
        assert path is None
    
    def test_find_relationship_path_max_depth_exceeded(self):
        """Test path finding with depth limit"""
        # Create a long chain: A -> B -> C -> D -> E
        nodes = ["A", "B", "C", "D", "E"]
        for i in range(len(nodes) - 1):
            self.agent.add_relationship(nodes[i], nodes[i+1], "professional", 0.7, self.tenant_id)
        
        # Should find path within limit
        path = self.agent.find_relationship_path("A", "E", self.tenant_id, max_depth=4)
        assert path == ["A", "B", "C", "D", "E"]
        
        # Should not find path beyond limit
        path = self.agent.find_relationship_path("A", "E", self.tenant_id, max_depth=3)
        assert path is None
    
    def test_find_all_paths_within_degrees(self):
        """Test finding multiple paths between nodes"""
        # Create diamond pattern: A -> B -> D, A -> C -> D
        self.agent.add_relationship("A", "B", "professional", 0.8, self.tenant_id)
        self.agent.add_relationship("A", "C", "personal", 0.6, self.tenant_id)
        self.agent.add_relationship("B", "D", "collaboration", 0.7, self.tenant_id)
        self.agent.add_relationship("C", "D", "mentorship", 0.9, self.tenant_id)
        
        paths = self.agent.find_all_paths_within_degrees("A", "D", self.tenant_id, max_depth=3)
        
        assert len(paths) == 2
        assert ["A", "B", "D"] in paths
        assert ["A", "C", "D"] in paths
    
    def test_analyze_relationship_strength(self):
        """Test relationship strength analysis for a path"""
        # Create path with varying strengths
        self.agent.add_relationship("A", "B", "professional", 0.9, self.tenant_id)
        self.agent.add_relationship("B", "C", "collaboration", 0.6, self.tenant_id)
        self.agent.add_relationship("C", "D", "mentorship", 0.8, self.tenant_id)
        
        path = ["A", "B", "C", "D"]
        analysis = self.agent.analyze_relationship_strength(path, self.tenant_id)
        
        assert analysis['path_length'] == 3
        assert analysis['average_strength'] == pytest.approx(0.7667, rel=1e-3)
        assert analysis['minimum_strength'] == 0.6
        assert 'edge_details' in analysis
        assert len(analysis['edge_details']) == 3
        assert analysis['quality'] in ['excellent', 'good', 'fair', 'weak']
        assert 'confidence_score' in analysis
    
    def test_calculate_sponsor_metrics_basic(self):
        """Test basic sponsor metrics calculation"""
        sponsor_data = {
            "id": "sponsor_001",
            "communication_frequency": 8,  # 8 contacts per month
            "avg_response_time": 12,  # 12 hours
            "engagement_quality": 85,  # 85/100
            "deliverables_completed": 18,
            "total_deliverables": 20
        }
        
        metrics = self.agent.calculate_sponsor_metrics(sponsor_data, self.tenant_id)
        
        assert metrics['sponsor_id'] == "sponsor_001"
        assert metrics['tenant_id'] == self.tenant_id
        assert 'relationship_score' in metrics
        assert 'fulfillment_rate' in metrics
        assert metrics['fulfillment_rate'] == 0.9  # 18/20
        assert 'tier_classification' in metrics
        assert metrics['tier_classification'] in ['platinum', 'gold', 'silver', 'bronze']
        assert 'risk_assessment' in metrics
        assert 'recommendation' in metrics
    
    def test_calculate_sponsor_metrics_with_network_centrality(self):
        """Test sponsor metrics with network centrality calculation"""
        sponsor_id = "central_sponsor"
        
        # Add sponsor to relationship graph with high centrality
        self.agent.add_relationship(sponsor_id, "partner_1", "funding", 0.9, self.tenant_id)
        self.agent.add_relationship(sponsor_id, "partner_2", "mentorship", 0.8, self.tenant_id)
        self.agent.add_relationship(sponsor_id, "partner_3", "collaboration", 0.7, self.tenant_id)
        
        sponsor_data = {
            "id": sponsor_id,
            "communication_frequency": 10,
            "avg_response_time": 6,
            "engagement_quality": 90,
            "deliverables_completed": 15,
            "total_deliverables": 15
        }
        
        metrics = self.agent.calculate_sponsor_metrics(sponsor_data, self.tenant_id)
        
        assert metrics['network_centrality'] > 0
        assert metrics['tier_classification'] == 'platinum'  # Should be high tier due to centrality
    
    def test_generate_grant_timeline_basic(self):
        """Test basic grant timeline generation with backwards planning"""
        grant_deadline = datetime.now() + timedelta(days=120)
        grant_type = "federal"
        
        timeline = self.agent.generate_grant_timeline(grant_deadline, grant_type, self.tenant_id)
        
        assert timeline['grant_type'] == grant_type
        assert timeline['tenant_id'] == self.tenant_id
        assert timeline['total_preparation_days'] == 90
        assert 'milestones' in timeline
        
        milestones = timeline['milestones']
        assert '90_days' in milestones
        assert '60_days' in milestones
        assert '30_days' in milestones
        
        # Verify milestone structure
        for milestone_key, milestone in milestones.items():
            assert 'title' in milestone
            assert 'description' in milestone
            assert 'tasks' in milestone
            assert 'deliverables' in milestone
            assert 'risk_factors' in milestone
            assert 'days_from_deadline' in milestone
            assert isinstance(milestone['tasks'], list)
            assert len(milestone['tasks']) > 0
    
    def test_generate_grant_timeline_risk_assessment(self):
        """Test grant timeline risk assessment and success probability"""
        grant_deadline = datetime.now() + timedelta(days=90)
        grant_type = "foundation"
        
        timeline = self.agent.generate_grant_timeline(grant_deadline, grant_type, self.tenant_id)
        
        assert 'risk_assessment' in timeline
        assert 'success_probability' in timeline
        assert 'critical_path_analysis' in timeline
        
        risk_assessment = timeline['risk_assessment']
        assert 'high_risk_factors' in risk_assessment
        assert 'medium_risk_factors' in risk_assessment
        assert 'low_risk_factors' in risk_assessment
        assert 'mitigation_strategies' in risk_assessment
        
        # Success probability should be reasonable for foundation grants
        assert 0.5 <= timeline['success_probability'] <= 1.0
    
    def test_get_network_statistics_empty_network(self):
        """Test network statistics for empty network"""
        stats = self.agent.get_network_statistics(self.tenant_id)
        
        assert stats['nodes'] == 0
        assert stats['edges'] == 0
        assert stats['density'] == 0
        assert stats['components'] == 0
    
    def test_get_network_statistics_populated_network(self):
        """Test network statistics for populated network"""
        # Create a small network
        relationships = [
            ("A", "B", "professional", 0.8),
            ("B", "C", "collaboration", 0.7),
            ("C", "D", "mentorship", 0.9),
            ("A", "C", "personal", 0.6),
            ("E", "F", "professional", 0.5)  # Separate component
        ]
        
        for source, target, rel_type, strength in relationships:
            self.agent.add_relationship(source, target, rel_type, strength, self.tenant_id)
        
        stats = self.agent.get_network_statistics(self.tenant_id)
        
        assert stats['nodes'] > 0
        assert stats['edges'] > 0
        assert stats['density'] > 0
        assert stats['components'] >= 1
        assert 'centrality_leaders' in stats
    
    def test_landmark_update_mechanism(self):
        """Test landmark node selection and updating"""
        # Create a network with varying node degrees
        nodes = [f"node_{i}" for i in range(15)]
        
        # Create hub node with many connections
        hub_node = "hub_central"
        for node in nodes[:10]:
            self.agent.add_relationship(hub_node, node, "professional", 0.7, self.tenant_id)
        
        # Create additional connections to reach landmark update threshold
        for i in range(0, len(nodes) - 1, 2):
            self.agent.add_relationship(nodes[i], nodes[i+1], "collaboration", 0.6, self.tenant_id)
        
        # Force landmark update by adding nodes to reach threshold
        for i in range(85):  # Add enough to trigger landmark update
            self.agent.add_relationship(f"extra_{i}", f"extra_{i+1}", "test", 0.5, self.tenant_id)
        
        # Verify landmarks were selected
        assert len(self.agent.landmarks) > 0
        assert hub_node in self.agent.landmarks  # Hub should be selected as landmark
    
    def test_distance_estimation_with_landmarks(self):
        """Test landmark-based distance estimation"""
        # Create a path through landmarks
        nodes = ["start", "landmark1", "landmark2", "end"]
        for i in range(len(nodes) - 1):
            self.agent.add_relationship(nodes[i], nodes[i+1], "professional", 0.8, self.tenant_id)
        
        # Manually set landmarks
        self.agent.landmarks = {"landmark1", "landmark2"}
        self.agent._precompute_landmark_distances()
        
        # Test distance estimation
        estimated_distance = self.agent._estimate_distance("start", "end")
        assert isinstance(estimated_distance, (int, float))
        assert estimated_distance >= 0
    
    def test_resource_monitor_integration(self):
        """Test integration with resource monitor for feature toggling"""
        # Test when relationship mapping is disabled
        self.mock_resource_monitor.is_feature_enabled.return_value = False
        
        # Should return None when feature is disabled
        path = self.agent.find_relationship_path("A", "B", self.tenant_id)
        assert path is None
        
        # Should return disabled status for metrics when analytics disabled
        sponsor_data = {"id": "test", "communication_frequency": 5}
        metrics = self.agent.calculate_sponsor_metrics(sponsor_data, self.tenant_id)
        assert metrics['status'] == 'disabled'
    
    def test_confidence_score_calculation(self):
        """Test confidence score calculation for paths"""
        # Test with high-strength path
        strengths_high = [0.9, 0.8, 0.9]
        confidence_high = self.agent._calculate_confidence_score(strengths_high, 4)
        
        # Test with low-strength path
        strengths_low = [0.3, 0.2, 0.4]
        confidence_low = self.agent._calculate_confidence_score(strengths_low, 4)
        
        assert confidence_high > confidence_low
        assert 0 <= confidence_high <= 1
        assert 0 <= confidence_low <= 1
    
    def test_sponsor_tier_classification(self):
        """Test sponsor tier classification logic"""
        # Test platinum tier
        platinum_tier = self.agent._calculate_sponsor_tier(0.9, 0.9, 0.8)
        assert platinum_tier == "platinum"
        
        # Test gold tier
        gold_tier = self.agent._calculate_sponsor_tier(0.7, 0.7, 0.6)
        assert gold_tier == "gold"
        
        # Test silver tier
        silver_tier = self.agent._calculate_sponsor_tier(0.5, 0.5, 0.4)
        assert silver_tier == "silver"
        
        # Test bronze tier
        bronze_tier = self.agent._calculate_sponsor_tier(0.3, 0.3, 0.2)
        assert bronze_tier == "bronze"
    
    def test_sponsor_risk_assessment(self):
        """Test sponsor risk assessment functionality"""
        # High risk sponsor
        high_risk_data = {
            "last_contact_date": (datetime.now() - timedelta(days=90)).isoformat()
        }
        high_risk = self.agent._calculate_sponsor_risk(high_risk_data, 0.2, 0.3)
        assert high_risk['level'] == 'high'
        assert len(high_risk['factors']) > 0
        
        # Low risk sponsor
        low_risk_data = {
            "last_contact_date": (datetime.now() - timedelta(days=10)).isoformat()
        }
        low_risk = self.agent._calculate_sponsor_risk(low_risk_data, 0.9, 0.9)
        assert low_risk['level'] == 'low'
    
    def test_grant_timeline_success_probability(self):
        """Test grant timeline success probability calculation"""
        # Test different grant types and preparation times
        prob_federal_90 = self.agent._calculate_success_probability("federal", 90)
        prob_federal_30 = self.agent._calculate_success_probability("federal", 30)
        prob_corporate_90 = self.agent._calculate_success_probability("corporate", 90)
        
        # More preparation time should increase probability
        assert prob_federal_90 > prob_federal_30
        
        # Corporate grants should be easier than federal
        assert prob_corporate_90 > prob_federal_90
        
        # All probabilities should be between 0 and 1
        assert 0 <= prob_federal_90 <= 1
        assert 0 <= prob_federal_30 <= 1
        assert 0 <= prob_corporate_90 <= 1

def test_processing_agent_global_instance():
    """Test global processing agent instance functionality"""
    from processing import get_processing_agent
    
    agent1 = get_processing_agent()
    agent2 = get_processing_agent()
    
    # Should return the same instance (singleton pattern)
    assert agent1 is agent2
    
    # Should be a ProcessingAgent instance
    assert isinstance(agent1, ProcessingAgent)

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])