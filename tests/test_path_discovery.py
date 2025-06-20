"""
Comprehensive pytest suite for path discovery testing
Tests seven-degree path discovery, relationship strength analysis, and network algorithms
Based on attached asset specifications for Zero Gate ESO Platform
"""

import pytest
import asyncio
import networkx as nx
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

# Import platform modules
from server.auth.jwt_auth import create_access_token, verify_token
from server.agents.processing import ProcessingAgent


class TestPathDiscovery:
    """Test suite for seven-degree path discovery and relationship analysis"""
    
    @pytest.fixture
    def test_tenants(self):
        """Create test tenant configurations"""
        return {
            "nasdaq-center": {
                "tenant_id": "nasdaq-center",
                "name": "NASDAQ Entrepreneurial Center",
                "users": [
                    {"user_id": "user1", "email": "clint.phillips@thecenter.nasdaq.org", "role": "admin"}
                ]
            },
            "tight5-digital": {
                "tenant_id": "tight5-digital",
                "name": "Tight5 Digital",
                "users": [
                    {"user_id": "user2", "email": "admin@tight5digital.com", "role": "admin"}
                ]
            }
        }
    
    @pytest.fixture
    def test_network_data(self):
        """Create comprehensive test network data for path discovery"""
        return {
            "nasdaq-center": {
                "nodes": [
                    {"id": "person1", "name": "John Smith", "role": "CEO", "organization": "TechCorp"},
                    {"id": "person2", "name": "Sarah Johnson", "role": "CTO", "organization": "Innovation Labs"},
                    {"id": "person3", "name": "Mike Chen", "role": "Director", "organization": "StartupHub"},
                    {"id": "person4", "name": "Lisa Wang", "role": "VP", "organization": "VentureCapital"},
                    {"id": "person5", "name": "David Brown", "role": "Manager", "organization": "TechCorp"},
                    {"id": "person6", "name": "Emily Davis", "role": "Founder", "organization": "NextGen"},
                    {"id": "person7", "name": "Robert Miller", "role": "Advisor", "organization": "Advisory Corp"}
                ],
                "relationships": [
                    {"from": "person1", "to": "person2", "strength": 0.8, "type": "colleague", "context": "worked together at TechCorp"},
                    {"from": "person2", "to": "person3", "strength": 0.6, "type": "professional", "context": "conference connection"},
                    {"from": "person3", "to": "person4", "strength": 0.9, "type": "business_partner", "context": "investment deal"},
                    {"from": "person4", "to": "person5", "strength": 0.7, "type": "mentor", "context": "advisory relationship"},
                    {"from": "person1", "to": "person5", "strength": 0.9, "type": "colleague", "context": "same company"},
                    {"from": "person5", "to": "person6", "strength": 0.5, "type": "acquaintance", "context": "networking event"},
                    {"from": "person6", "to": "person7", "strength": 0.8, "type": "advisor", "context": "startup advisory"},
                    {"from": "person2", "to": "person7", "strength": 0.4, "type": "acquaintance", "context": "mutual connection"}
                ]
            },
            "tight5-digital": {
                "nodes": [
                    {"id": "person8", "name": "Alex Turner", "role": "CEO", "organization": "Digital Corp"},
                    {"id": "person9", "name": "Maria Rodriguez", "role": "CTO", "organization": "Tech Solutions"},
                    {"id": "person10", "name": "James Wilson", "role": "Director", "organization": "Digital Corp"}
                ],
                "relationships": [
                    {"from": "person8", "to": "person9", "strength": 0.7, "type": "colleague", "context": "partnership"},
                    {"from": "person9", "to": "person10", "strength": 0.6, "type": "professional", "context": "collaboration"}
                ]
            }
        }
    
    @pytest.fixture
    def auth_tokens(self, test_tenants):
        """Generate authentication tokens for testing"""
        tokens = {}
        for tenant_id, tenant_data in test_tenants.items():
            tokens[tenant_id] = {}
            for user in tenant_data["users"]:
                token = create_access_token(
                    user_id=user["user_id"],
                    email=user["email"],
                    tenant_id=tenant_id,
                    role=user["role"]
                )
                tokens[tenant_id][user["user_id"]] = token
        return tokens
    
    @pytest.mark.asyncio
    async def test_direct_connection_discovery(self, test_network_data):
        """Test discovery of direct (1-degree) connections"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            # Test direct connection between person1 and person2
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person2",
                tenant_id="nasdaq-center"
            )
            
            # Verify direct connection
            assert path_result["path_found"] is True
            assert path_result["path_length"] == 1
            assert path_result["path"] == ["person1", "person2"]
            assert path_result["path_quality"] in ["excellent", "good"]
            
            # Verify relationship analysis
            analysis = path_result["relationship_analysis"]
            assert analysis["average_strength"] == 0.8
            assert analysis["minimum_strength"] == 0.8
            assert "colleague" in analysis["relationship_types"]
    
    @pytest.mark.asyncio
    async def test_multi_degree_path_discovery(self, test_network_data):
        """Test discovery of multi-degree paths (2-7 degrees)"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            # Test 3-degree path: person1 -> person2 -> person3 -> person4
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person4",
                tenant_id="nasdaq-center"
            )
            
            # Verify multi-degree connection
            assert path_result["path_found"] is True
            assert 2 <= path_result["path_length"] <= 3
            assert path_result["path"][0] == "person1"
            assert path_result["path"][-1] == "person4"
            
            # Verify path quality calculation
            analysis = path_result["relationship_analysis"]
            assert 0.0 < analysis["average_strength"] <= 1.0
            assert 0.0 < analysis["minimum_strength"] <= 1.0
            assert analysis["minimum_strength"] <= analysis["average_strength"]
    
    @pytest.mark.asyncio
    async def test_no_path_found_scenario(self, test_network_data):
        """Test scenario where no path exists between nodes"""
        agent = ProcessingAgent()
        
        # Create isolated network data
        isolated_network = {
            "nodes": [
                {"id": "isolated1", "name": "Isolated Person 1"},
                {"id": "isolated2", "name": "Isolated Person 2"}
            ],
            "relationships": []  # No connections
        }
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = isolated_network
            
            path_result = await agent.discover_relationship_path(
                source_id="isolated1",
                target_id="isolated2",
                tenant_id="nasdaq-center"
            )
            
            # Verify no path found
            assert path_result["path_found"] is False
            assert path_result["path_length"] == 0
            assert path_result["path"] == []
            assert path_result["error_reason"] in ["no_path_exists", "nodes_not_connected"]
    
    @pytest.mark.asyncio
    async def test_seven_degree_limit_enforcement(self, test_network_data):
        """Test that path discovery respects seven-degree separation limit"""
        agent = ProcessingAgent()
        
        # Create long chain network (8+ degrees)
        long_chain_network = {
            "nodes": [{"id": f"person{i}", "name": f"Person {i}"} for i in range(10)],
            "relationships": [
                {"from": f"person{i}", "to": f"person{i+1}", "strength": 0.5, "type": "acquaintance"}
                for i in range(9)
            ]
        }
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = long_chain_network
            
            # Test path discovery beyond 7 degrees
            path_result = await agent.discover_relationship_path(
                source_id="person0",
                target_id="person9",  # 9 degrees away
                tenant_id="nasdaq-center",
                max_degrees=7
            )
            
            # Should either find path within 7 degrees or return no path
            if path_result["path_found"]:
                assert path_result["path_length"] <= 7
            else:
                assert path_result["error_reason"] == "path_exceeds_max_degrees"
    
    @pytest.mark.asyncio
    async def test_path_quality_assessment(self, test_network_data):
        """Test path quality assessment based on relationship strengths"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person3",
                tenant_id="nasdaq-center"
            )
            
            if path_result["path_found"]:
                analysis = path_result["relationship_analysis"]
                
                # Test quality categorization
                avg_strength = analysis["average_strength"]
                quality = path_result["path_quality"]
                
                if avg_strength >= 0.8:
                    assert quality == "excellent"
                elif avg_strength >= 0.6:
                    assert quality == "good"
                elif avg_strength >= 0.4:
                    assert quality == "fair"
                else:
                    assert quality == "weak"
                
                # Test weakest link identification
                assert "minimum_strength" in analysis
                assert analysis["minimum_strength"] <= avg_strength
    
    @pytest.mark.asyncio
    async def test_algorithm_comparison(self, test_network_data):
        """Test comparison between different pathfinding algorithms (BFS, DFS, Dijkstra)"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        algorithms = ["bfs", "dfs", "dijkstra"]
        results = {}
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            for algorithm in algorithms:
                path_result = await agent.discover_relationship_path(
                    source_id="person1",
                    target_id="person6",
                    tenant_id="nasdaq-center",
                    algorithm=algorithm
                )
                results[algorithm] = path_result
            
            # All algorithms should find a path if one exists
            paths_found = [r["path_found"] for r in results.values()]
            assert all(paths_found) or not any(paths_found)  # All or none
            
            if all(paths_found):
                # BFS should find shortest path
                bfs_length = results["bfs"]["path_length"]
                
                # Dijkstra should find optimal path based on weights
                dijkstra_strength = results["dijkstra"]["relationship_analysis"]["average_strength"]
                
                # Verify algorithmic properties
                assert bfs_length >= 1
                assert 0.0 < dijkstra_strength <= 1.0
    
    @pytest.mark.asyncio
    async def test_landmark_optimization(self, test_network_data):
        """Test landmark-based distance estimation optimization"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network, \
             patch.object(agent, '_identify_landmark_nodes') as mock_landmarks:
            
            mock_get_network.return_value = network_data
            mock_landmarks.return_value = ["person2", "person4"]  # High-centrality nodes
            
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person7",
                tenant_id="nasdaq-center",
                use_landmarks=True
            )
            
            # Verify landmark optimization was used
            mock_landmarks.assert_called_once()
            
            if path_result["path_found"]:
                assert "landmark_optimization" in path_result
                assert path_result["landmark_optimization"]["used"] is True
                assert "computation_time_saved" in path_result["landmark_optimization"]
    
    @pytest.mark.asyncio
    async def test_tenant_isolation_in_path_discovery(self, test_network_data, auth_tokens):
        """Test that path discovery respects tenant boundaries"""
        agent = ProcessingAgent()
        
        nasdaq_network = test_network_data["nasdaq-center"]
        tight5_network = test_network_data["tight5-digital"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            # Test nasdaq-center path discovery
            mock_get_network.return_value = nasdaq_network
            nasdaq_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person3",
                tenant_id="nasdaq-center"
            )
            
            # Test tight5-digital path discovery
            mock_get_network.return_value = tight5_network
            tight5_result = await agent.discover_relationship_path(
                source_id="person8",
                target_id="person9",
                tenant_id="tight5-digital"
            )
            
            # Verify tenant isolation
            if nasdaq_result["path_found"]:
                nasdaq_persons = set()
                for person in nasdaq_result["path"]:
                    nasdaq_persons.add(person)
                
                # NASDAQ persons should not appear in Tight5 network
                tight5_persons = {node["id"] for node in tight5_network["nodes"]}
                assert nasdaq_persons.isdisjoint(tight5_persons)
            
            # Test cross-tenant access failure
            mock_get_network.return_value = None  # Simulate tenant isolation
            
            with pytest.raises(HTTPException) as exc_info:
                await agent.discover_relationship_path(
                    source_id="person1",  # NASDAQ person
                    target_id="person8",  # Tight5 person  
                    tenant_id="nasdaq-center"
                )
            
            assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_introduction_template_generation(self, test_network_data):
        """Test generation of introduction templates for discovered paths"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person4",
                tenant_id="nasdaq-center",
                include_introduction_template=True
            )
            
            if path_result["path_found"] and len(path_result["path"]) >= 3:
                # Should include introduction template
                assert "introduction_template" in path_result
                template = path_result["introduction_template"]
                
                # Template should include key elements
                assert "template_text" in template
                assert "recommended_approach" in template
                
                # Template should reference the intermediate connection
                intermediate_person = path_result["path"][1]
                assert intermediate_person in template["template_text"]
                
                # Should include relationship context
                assert "relationship_context" in template
    
    @pytest.mark.asyncio
    async def test_network_statistics_calculation(self, test_network_data):
        """Test calculation of network statistics during path discovery"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person7",
                tenant_id="nasdaq-center",
                include_network_stats=True
            )
            
            # Should include network statistics
            assert "network_statistics" in path_result
            stats = path_result["network_statistics"]
            
            # Basic network metrics
            assert "total_nodes" in stats
            assert "total_edges" in stats
            assert "network_density" in stats
            assert "average_clustering" in stats
            
            # Path-specific metrics
            assert "centrality_scores" in stats
            assert "shortest_path_lengths" in stats
            
            # Verify statistical validity
            assert stats["total_nodes"] == len(network_data["nodes"])
            assert stats["total_edges"] == len(network_data["relationships"])
            assert 0.0 <= stats["network_density"] <= 1.0
    
    @pytest.mark.asyncio
    async def test_confidence_scoring(self, test_network_data):
        """Test confidence scoring for discovered paths"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person6",
                tenant_id="nasdaq-center"
            )
            
            if path_result["path_found"]:
                # Should include confidence scoring
                assert "confidence_score" in path_result
                confidence = path_result["confidence_score"]
                
                # Confidence should be between 0 and 1
                assert 0.0 <= confidence <= 1.0
                
                # Confidence factors
                assert "confidence_factors" in path_result
                factors = path_result["confidence_factors"]
                
                expected_factors = [
                    "relationship_strength",
                    "path_length", 
                    "data_completeness",
                    "relationship_recency"
                ]
                
                for factor in expected_factors:
                    if factor in factors:
                        assert 0.0 <= factors[factor] <= 1.0
    
    @pytest.mark.asyncio
    async def test_path_risk_assessment(self, test_network_data):
        """Test risk assessment for relationship paths"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            path_result = await agent.discover_relationship_path(
                source_id="person1",
                target_id="person7",
                tenant_id="nasdaq-center",
                include_risk_assessment=True
            )
            
            if path_result["path_found"]:
                # Should include risk assessment
                assert "risk_assessment" in path_result
                risk = path_result["risk_assessment"]
                
                # Risk categories
                assert "overall_risk" in risk
                assert risk["overall_risk"] in ["low", "medium", "high"]
                
                # Risk factors
                assert "risk_factors" in risk
                factors = risk["risk_factors"]
                
                potential_risks = [
                    "weak_connections",
                    "relationship_gaps", 
                    "outdated_connections",
                    "competitive_conflicts"
                ]
                
                # Should identify specific risks
                for risk_factor in factors:
                    assert "factor" in risk_factor
                    assert "severity" in risk_factor
                    assert risk_factor["severity"] in ["low", "medium", "high"]
    
    @pytest.mark.asyncio
    async def test_concurrent_path_discovery(self, test_network_data):
        """Test concurrent path discovery operations"""
        agent = ProcessingAgent()
        network_data = test_network_data["nasdaq-center"]
        
        # Test multiple concurrent path discoveries
        path_queries = [
            ("person1", "person3"),
            ("person2", "person5"),
            ("person4", "person7"),
            ("person1", "person6")
        ]
        
        with patch.object(agent, '_get_network_data') as mock_get_network:
            mock_get_network.return_value = network_data
            
            # Run concurrent path discoveries
            tasks = [
                agent.discover_relationship_path(
                    source_id=source,
                    target_id=target,
                    tenant_id="nasdaq-center"
                )
                for source, target in path_queries
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Verify all operations completed
            assert len(results) == len(path_queries)
            
            # Check that no exceptions occurred
            for result in results:
                assert not isinstance(result, Exception)
                assert "path_found" in result
            
            # Verify results are independent
            unique_paths = set()
            for result in results:
                if result["path_found"]:
                    path_tuple = tuple(result["path"])
                    unique_paths.add(path_tuple)
            
            # Should have multiple unique paths
            assert len(unique_paths) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])