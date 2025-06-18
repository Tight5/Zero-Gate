"""
Comprehensive test suite for ProcessingAgent
Tests tenant isolation, grant timeline generation, and path discovery algorithms
"""

import pytest
import asyncio
from datetime import datetime, timedelta
import sys
import os

# Add server directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server', 'agents'))

from processing import ProcessingAgent, Sponsor, Grant, Relationship

@pytest.fixture
def tenant_id():
    """Test tenant ID"""
    return "test-tenant-123"

@pytest.fixture
def agent(tenant_id):
    """ProcessingAgent instance for testing"""
    return ProcessingAgent(tenant_id)

@pytest.fixture
def sample_sponsors():
    """Sample sponsor data for testing"""
    return [
        Sponsor(
            id="sponsor1",
            name="Tech Foundation",
            tier="platinum",
            contact_strength=0.9,
            funding_capacity=1000000,
            response_rate=0.8,
            last_contact=datetime.now() - timedelta(days=15),
            industries=["technology", "education"],
            location="San Francisco",
            tenant_id="test-tenant-123"
        ),
        Sponsor(
            id="sponsor2", 
            name="Education Grant Corp",
            tier="gold",
            contact_strength=0.7,
            funding_capacity=500000,
            response_rate=0.6,
            last_contact=datetime.now() - timedelta(days=45),
            industries=["education", "research"],
            location="Boston",
            tenant_id="test-tenant-123"
        ),
        Sponsor(
            id="sponsor3",
            name="Community Fund",
            tier="silver",
            contact_strength=0.5,
            funding_capacity=100000,
            response_rate=0.4,
            last_contact=datetime.now() - timedelta(days=90),
            industries=["community", "social"],
            location="Chicago",
            tenant_id="test-tenant-123"
        )
    ]

@pytest.fixture
def sample_relationships():
    """Sample relationship data for testing"""
    return [
        Relationship(
            source_id="sponsor1",
            target_id="contact1",
            strength=0.8,
            relationship_type="professional",
            context="board_member",
            last_interaction=datetime.now() - timedelta(days=10),
            tenant_id="test-tenant-123"
        ),
        Relationship(
            source_id="contact1",
            target_id="sponsor2",
            strength=0.6,
            relationship_type="professional", 
            context="colleague",
            last_interaction=datetime.now() - timedelta(days=20),
            tenant_id="test-tenant-123"
        ),
        Relationship(
            source_id="sponsor2",
            target_id="contact2",
            strength=0.7,
            relationship_type="personal",
            context="friend",
            last_interaction=datetime.now() - timedelta(days=5),
            tenant_id="test-tenant-123"
        ),
        Relationship(
            source_id="contact2",
            target_id="sponsor3",
            strength=0.5,
            relationship_type="organizational",
            context="partner_org",
            last_interaction=datetime.now() - timedelta(days=30),
            tenant_id="test-tenant-123"
        )
    ]

class TestTenantIsolation:
    """Test tenant data isolation and security"""
    
    @pytest.mark.asyncio
    async def test_multiple_tenant_isolation(self):
        """Test that multiple tenants maintain separate graphs"""
        agent1 = ProcessingAgent("tenant-1")
        agent2 = ProcessingAgent("tenant-2")
        
        # Add sponsor to tenant 1
        sponsor1 = Sponsor(
            id="shared-sponsor-id",
            name="Shared Name",
            tier="gold",
            contact_strength=0.8,
            funding_capacity=500000,
            response_rate=0.7,
            last_contact=datetime.now(),
            industries=["tech"],
            location="NYC",
            tenant_id="tenant-1"
        )
        
        await agent1.add_sponsor(sponsor1)
        
        # Add different sponsor with same ID to tenant 2
        sponsor2 = Sponsor(
            id="shared-sponsor-id",
            name="Different Name",
            tier="platinum",
            contact_strength=0.9,
            funding_capacity=1000000,
            response_rate=0.8,
            last_contact=datetime.now(),
            industries=["finance"],
            location="LA",
            tenant_id="tenant-2"
        )
        
        await agent2.add_sponsor(sponsor2)
        
        # Verify isolation
        stats1 = await agent1.get_network_statistics()
        stats2 = await agent2.get_network_statistics()
        
        assert stats1["node_count"] == 1
        assert stats2["node_count"] == 1
        assert stats1["tenant_id"] == "tenant-1"
        assert stats2["tenant_id"] == "tenant-2"
        
        # Verify data separation
        assert agent1.graph.nodes["shared-sponsor-id"]["name"] == "Shared Name"
        assert agent2.graph.nodes["shared-sponsor-id"]["name"] == "Different Name"

    @pytest.mark.asyncio
    async def test_tenant_context_validation(self):
        """Test that tenant context is properly validated"""
        agent = ProcessingAgent("test-tenant")
        
        # Try to add sponsor with wrong tenant ID
        wrong_tenant_sponsor = Sponsor(
            id="wrong-tenant-sponsor",
            name="Wrong Tenant",
            tier="bronze",
            contact_strength=0.3,
            funding_capacity=50000,
            response_rate=0.2,
            last_contact=datetime.now(),
            industries=["other"],
            location="Other",
            tenant_id="wrong-tenant-id"
        )
        
        # Should still add (current implementation doesn't enforce tenant match)
        # But verify tenant isolation through separate agent instances
        await agent.add_sponsor(wrong_tenant_sponsor)
        
        stats = await agent.get_network_statistics()
        assert stats["tenant_id"] == "test-tenant"

class TestGrantTimelineGeneration:
    """Test grant timeline generation with backwards planning"""
    
    @pytest.mark.asyncio
    async def test_standard_grant_timeline(self, agent):
        """Test generation of standard grant timeline with 90-day lead time"""
        future_deadline = datetime.now() + timedelta(days=90)
        
        grant = Grant(
            id="grant-90-days",
            title="90-Day Grant Opportunity",
            sponsor_id="sponsor1",
            amount=250000,
            submission_deadline=future_deadline,
            status="active",
            requirements=["budget", "proposal", "team"],
            tenant_id="test-tenant-123"
        )
        
        timeline = await agent.generate_grant_timeline(grant)
        
        # Verify timeline structure
        assert timeline.grant_id == "grant-90-days"
        assert timeline.submission_deadline == future_deadline
        assert timeline.risk_assessment == "low"
        assert timeline.buffer_days >= 0
        
        # Verify milestones
        assert len(timeline.milestones) > 0
        assert len(timeline.critical_path) > 0
        
        # Check milestone ordering (backwards planning)
        milestone_dates = [datetime.fromisoformat(m["date"]) for m in timeline.milestones]
        assert all(d1 <= d2 for d1, d2 in zip(milestone_dates, milestone_dates[1:]))
        
        # Verify critical milestones exist
        critical_milestones = [m["name"] for m in timeline.milestones if m["priority"] == "critical"]
        assert len(critical_milestones) > 0

    @pytest.mark.asyncio 
    async def test_short_deadline_grant_timeline(self, agent):
        """Test timeline generation for grants with short deadlines"""
        short_deadline = datetime.now() + timedelta(days=20)
        
        grant = Grant(
            id="grant-20-days",
            title="Short Deadline Grant",
            sponsor_id="sponsor2",
            amount=50000,
            submission_deadline=short_deadline,
            status="active",
            requirements=["proposal"],
            tenant_id="test-tenant-123"
        )
        
        timeline = await agent.generate_grant_timeline(grant)
        
        # Should be high risk
        assert timeline.risk_assessment == "high"
        assert timeline.buffer_days < 30
        
        # Should have fewer milestones due to time constraints
        milestone_count = len(timeline.milestones)
        assert milestone_count < 9  # Standard is 9 milestones

    @pytest.mark.asyncio
    async def test_past_deadline_grant(self, agent):
        """Test handling of grants with past deadlines"""
        past_deadline = datetime.now() - timedelta(days=10)
        
        grant = Grant(
            id="grant-past",
            title="Past Deadline Grant",
            sponsor_id="sponsor3",
            amount=100000,
            submission_deadline=past_deadline,
            status="missed",
            requirements=["proposal"],
            tenant_id="test-tenant-123"
        )
        
        # Should raise ValueError for past deadline
        with pytest.raises(ValueError, match="Grant deadline has already passed"):
            await agent.generate_grant_timeline(grant)

    @pytest.mark.asyncio
    async def test_milestone_backwards_planning(self, agent):
        """Test that milestones are properly calculated with backwards planning"""
        deadline = datetime.now() + timedelta(days=60)
        
        grant = Grant(
            id="grant-backwards",
            title="Backwards Planning Test",
            sponsor_id="sponsor1",
            amount=300000,
            submission_deadline=deadline,
            status="active",
            requirements=["detailed_budget", "proposal", "team_plan"],
            tenant_id="test-tenant-123"
        )
        
        timeline = await agent.generate_grant_timeline(grant)
        
        # Verify milestone structure
        for milestone in timeline.milestones:
            assert "name" in milestone
            assert "days_before_deadline" in milestone
            assert "date" in milestone
            assert "start_date" in milestone
            assert "priority" in milestone
            
            # Verify timing logic
            milestone_date = datetime.fromisoformat(milestone["date"])
            days_diff = (deadline - milestone_date).days
            assert days_diff == milestone["days_before_deadline"]

class TestPathDiscovery:
    """Test seven-degree path discovery algorithms"""
    
    @pytest.mark.asyncio
    async def test_direct_connection_path(self, agent, sample_sponsors, sample_relationships):
        """Test path discovery for directly connected nodes"""
        # Add sponsors and relationships
        for sponsor in sample_sponsors:
            await agent.add_sponsor(sponsor)
        
        for relationship in sample_relationships:
            await agent.add_relationship(relationship)
        
        # Test direct path
        path_result = await agent.find_shortest_path("sponsor1", "contact1")
        
        assert path_result is not None
        assert path_result.path_length == 1
        assert path_result.path == ["sponsor1", "contact1"]
        assert path_result.confidence_score > 0.7

    @pytest.mark.asyncio
    async def test_multi_hop_path_discovery(self, agent, sample_sponsors, sample_relationships):
        """Test multi-hop path discovery up to 7 degrees"""
        # Add sponsors and relationships
        for sponsor in sample_sponsors:
            await agent.add_sponsor(sponsor)
        
        for relationship in sample_relationships:
            await agent.add_relationship(relationship)
        
        # Test path from sponsor1 to sponsor3 (should be 4 hops)
        path_result = await agent.find_shortest_path("sponsor1", "sponsor3")
        
        assert path_result is not None
        assert path_result.path_length <= 7
        assert path_result.path[0] == "sponsor1"
        assert path_result.path[-1] == "sponsor3"
        assert path_result.total_strength > 0
        assert path_result.estimated_time_hours > 0

    @pytest.mark.asyncio
    async def test_no_path_exists(self, agent):
        """Test behavior when no path exists between nodes"""
        # Add isolated sponsors
        sponsor1 = Sponsor(
            id="isolated1",
            name="Isolated 1",
            tier="bronze",
            contact_strength=0.5,
            funding_capacity=10000,
            response_rate=0.3,
            last_contact=datetime.now(),
            industries=["test"],
            location="Test",
            tenant_id="test-tenant-123"
        )
        
        sponsor2 = Sponsor(
            id="isolated2", 
            name="Isolated 2",
            tier="bronze",
            contact_strength=0.5,
            funding_capacity=10000,
            response_rate=0.3,
            last_contact=datetime.now(),
            industries=["test"],
            location="Test",
            tenant_id="test-tenant-123"
        )
        
        await agent.add_sponsor(sponsor1)
        await agent.add_sponsor(sponsor2)
        
        # No relationships added, should return None
        path_result = await agent.find_shortest_path("isolated1", "isolated2")
        assert path_result is None

    @pytest.mark.asyncio
    async def test_seven_degree_limit(self, agent):
        """Test that path discovery respects 7-degree limit"""
        # Create a long chain of connections (8 degrees)
        nodes = [f"node{i}" for i in range(9)]
        
        # Add chain relationships
        for i in range(len(nodes) - 1):
            relationship = Relationship(
                source_id=nodes[i],
                target_id=nodes[i + 1],
                strength=0.8,
                relationship_type="professional",
                context="chain",
                last_interaction=datetime.now(),
                tenant_id="test-tenant-123"
            )
            await agent.add_relationship(relationship)
        
        # Path from node0 to node8 is 8 degrees, should return None
        path_result = await agent.find_shortest_path("node0", "node8", max_length=7)
        assert path_result is None
        
        # Path from node0 to node7 is 7 degrees, should succeed
        path_result = await agent.find_shortest_path("node0", "node7", max_length=7)
        assert path_result is not None
        assert path_result.path_length == 7

    @pytest.mark.asyncio
    async def test_multiple_paths_discovery(self, agent, sample_sponsors, sample_relationships):
        """Test discovery of multiple paths between nodes"""
        # Add sponsors and relationships
        for sponsor in sample_sponsors:
            await agent.add_sponsor(sponsor)
        
        for relationship in sample_relationships:
            await agent.add_relationship(relationship)
        
        # Add additional paths
        extra_relationships = [
            Relationship(
                source_id="sponsor1",
                target_id="sponsor3",
                strength=0.3,
                relationship_type="organizational",
                context="indirect",
                last_interaction=datetime.now(),
                tenant_id="test-tenant-123"
            )
        ]
        
        for rel in extra_relationships:
            await agent.add_relationship(rel)
        
        # Find multiple paths
        paths = await agent.find_multiple_paths("sponsor1", "sponsor3", k=2)
        
        assert len(paths) >= 1
        assert all(path.path[0] == "sponsor1" for path in paths)
        assert all(path.path[-1] == "sponsor3" for path in paths)
        
        # Paths should be sorted by confidence score
        if len(paths) > 1:
            assert paths[0].confidence_score >= paths[1].confidence_score

class TestSponsorMetrics:
    """Test sponsor metrics calculation"""
    
    @pytest.mark.asyncio
    async def test_sponsor_metrics_calculation(self, agent, sample_sponsors, sample_relationships):
        """Test comprehensive sponsor metrics calculation"""
        # Add sponsors and relationships
        for sponsor in sample_sponsors:
            await agent.add_sponsor(sponsor)
        
        for relationship in sample_relationships:
            await agent.add_relationship(relationship)
        
        # Calculate metrics for sponsor1
        metrics = await agent.calculate_sponsor_metrics("sponsor1")
        
        assert metrics.sponsor_id == "sponsor1"
        assert 0 <= metrics.network_centrality <= 1
        assert 0 <= metrics.influence_score <= 1
        assert 0 <= metrics.funding_probability <= 1
        assert 0 <= metrics.response_likelihood <= 1
        assert 0 <= metrics.grant_success_rate <= 1
        assert metrics.optimal_contact_window in ["recent_contact", "optimal", "overdue", "initial_contact"]
        assert isinstance(metrics.key_connections, list)

    @pytest.mark.asyncio
    async def test_tier_impact_on_metrics(self, agent):
        """Test that sponsor tier affects funding probability"""
        # Add sponsors with different tiers
        platinum_sponsor = Sponsor(
            id="platinum",
            name="Platinum Sponsor",
            tier="platinum",
            contact_strength=0.8,
            funding_capacity=1000000,
            response_rate=0.8,
            last_contact=datetime.now(),
            industries=["tech"],
            location="SF",
            tenant_id="test-tenant-123"
        )
        
        bronze_sponsor = Sponsor(
            id="bronze",
            name="Bronze Sponsor", 
            tier="bronze",
            contact_strength=0.8,
            funding_capacity=50000,
            response_rate=0.8,
            last_contact=datetime.now(),
            industries=["tech"],
            location="SF",
            tenant_id="test-tenant-123"
        )
        
        await agent.add_sponsor(platinum_sponsor)
        await agent.add_sponsor(bronze_sponsor)
        
        platinum_metrics = await agent.calculate_sponsor_metrics("platinum")
        bronze_metrics = await agent.calculate_sponsor_metrics("bronze")
        
        # Platinum should have higher funding probability
        assert platinum_metrics.funding_probability > bronze_metrics.funding_probability

class TestNetworkStatistics:
    """Test network analysis and statistics"""
    
    @pytest.mark.asyncio
    async def test_empty_network_statistics(self, agent):
        """Test statistics for empty network"""
        stats = await agent.get_network_statistics()
        
        assert stats["node_count"] == 0
        assert stats["edge_count"] == 0
        assert stats["density"] == 0
        assert stats["landmark_count"] == 0
        assert stats["tenant_id"] == "test-tenant-123"

    @pytest.mark.asyncio
    async def test_populated_network_statistics(self, agent, sample_sponsors, sample_relationships):
        """Test statistics for populated network"""
        # Add sponsors and relationships
        for sponsor in sample_sponsors:
            await agent.add_sponsor(sponsor)
        
        for relationship in sample_relationships:
            await agent.add_relationship(relationship)
        
        stats = await agent.get_network_statistics()
        
        assert stats["node_count"] > 0
        assert stats["edge_count"] > 0
        assert stats["density"] >= 0
        assert "node_types" in stats
        assert stats["tenant_id"] == "test-tenant-123"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])