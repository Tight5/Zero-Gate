"""
Comprehensive pytest suite for grant timeline generation testing
Tests backwards planning, 90/60/30-day milestone generation, and progress tracking
Based on attached asset specifications for Zero Gate ESO Platform
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Import platform modules
from server.auth.jwt_auth import create_access_token, verify_token
from server.agents.processing import ProcessingAgent


class TestGrantTimelineGeneration:
    """Test suite for grant timeline generation and milestone management"""
    
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
    def test_grants(self):
        """Create test grant data with various submission deadlines"""
        base_date = datetime.now()
        return {
            "nasdaq-center": [
                {
                    "grant_id": "grant1",
                    "title": "Tech Innovation Grant",
                    "sponsor_id": "sponsor1",
                    "amount": 50000,
                    "submission_deadline": (base_date + timedelta(days=120)).isoformat(),
                    "status": "planning",
                    "tenant_id": "nasdaq-center"
                },
                {
                    "grant_id": "grant2", 
                    "title": "Startup Accelerator Fund",
                    "sponsor_id": "sponsor2",
                    "amount": 75000,
                    "submission_deadline": (base_date + timedelta(days=90)).isoformat(),
                    "status": "in_progress",
                    "tenant_id": "nasdaq-center"
                },
                {
                    "grant_id": "grant3",
                    "title": "Emergency Response Grant",
                    "sponsor_id": "sponsor1",
                    "amount": 25000,
                    "submission_deadline": (base_date + timedelta(days=45)).isoformat(),
                    "status": "urgent",
                    "tenant_id": "nasdaq-center"
                }
            ],
            "tight5-digital": [
                {
                    "grant_id": "grant4",
                    "title": "Digital Transformation Initiative",
                    "sponsor_id": "sponsor3",
                    "amount": 100000,
                    "submission_deadline": (base_date + timedelta(days=150)).isoformat(),
                    "status": "planning",
                    "tenant_id": "tight5-digital"
                }
            ]
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
    async def test_backwards_planning_milestone_generation(self, test_grants):
        """Test automatic generation of 90/60/30-day milestones using backwards planning"""
        agent = ProcessingAgent()
        
        # Test grant with 120-day timeline
        grant = test_grants["nasdaq-center"][0]
        deadline = datetime.fromisoformat(grant["submission_deadline"])
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            mock_get_grant.return_value = grant
            
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            
            # Verify timeline structure
            assert "grant_id" in timeline
            assert "milestones" in timeline
            assert "submission_deadline" in timeline
            assert "days_remaining" in timeline
            
            milestones = timeline["milestones"]
            
            # Should have at least 3 major milestones (90, 60, 30 days)
            assert len(milestones) >= 3
            
            # Calculate expected milestone dates
            milestone_90_date = deadline - timedelta(days=90)
            milestone_60_date = deadline - timedelta(days=60)
            milestone_30_date = deadline - timedelta(days=30)
            
            milestone_dates = [datetime.fromisoformat(m["date"]) for m in milestones]
            
            # Verify milestone dates are within acceptable range (±2 days)
            def date_within_range(target_date, actual_dates, tolerance_days=2):
                return any(
                    abs((actual_date - target_date).days) <= tolerance_days
                    for actual_date in actual_dates
                )
            
            assert date_within_range(milestone_90_date, milestone_dates)
            assert date_within_range(milestone_60_date, milestone_dates)
            assert date_within_range(milestone_30_date, milestone_dates)
    
    @pytest.mark.asyncio
    async def test_milestone_task_generation_by_phase(self, test_grants):
        """Test that appropriate tasks are generated for each milestone phase"""
        agent = ProcessingAgent()
        grant = test_grants["nasdaq-center"][0]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            mock_get_grant.return_value = grant
            
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            milestones = timeline["milestones"]
            
            # Find milestones by phase
            milestone_90 = next((m for m in milestones if "90" in m.get("title", "") or "Content Strategy" in m.get("title", "")), None)
            milestone_60 = next((m for m in milestones if "60" in m.get("title", "") or "Development" in m.get("title", "")), None)
            milestone_30 = next((m for m in milestones if "30" in m.get("title", "") or "Execution" in m.get("title", "")), None)
            
            # 90-day milestone should have content strategy tasks
            if milestone_90:
                tasks = milestone_90.get("tasks", [])
                strategy_keywords = ["audit", "strategy", "research", "planning", "analysis"]
                assert any(keyword in " ".join(tasks).lower() for keyword in strategy_keywords)
            
            # 60-day milestone should have development tasks
            if milestone_60:
                tasks = milestone_60.get("tasks", [])
                development_keywords = ["review", "feedback", "draft", "development", "preparation"]
                assert any(keyword in " ".join(tasks).lower() for keyword in development_keywords)
            
            # 30-day milestone should have execution tasks
            if milestone_30:
                tasks = milestone_30.get("tasks", [])
                execution_keywords = ["publication", "engagement", "submission", "finalization", "execution"]
                assert any(keyword in " ".join(tasks).lower() for keyword in execution_keywords)
    
    @pytest.mark.asyncio
    async def test_urgent_grant_timeline_adjustment(self, test_grants):
        """Test timeline adjustment for grants with short deadlines"""
        agent = ProcessingAgent()
        
        # Test urgent grant with only 45 days
        urgent_grant = test_grants["nasdaq-center"][2]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            mock_get_grant.return_value = urgent_grant
            
            timeline = await agent.generate_grant_timeline(urgent_grant["grant_id"], urgent_grant["tenant_id"])
            
            # Verify urgent timeline has compressed milestones
            milestones = timeline["milestones"]
            
            # Should still have milestones but with adjusted intervals
            assert len(milestones) >= 2
            
            # Check that all milestones fall within the 45-day window
            deadline = datetime.fromisoformat(urgent_grant["submission_deadline"])
            today = datetime.now()
            
            for milestone in milestones:
                milestone_date = datetime.fromisoformat(milestone["date"])
                assert today <= milestone_date <= deadline
                
            # Verify urgent status is reflected
            assert timeline.get("status") == "urgent" or any("urgent" in m.get("title", "").lower() for m in milestones)
    
    @pytest.mark.asyncio
    async def test_milestone_progress_tracking(self, test_grants, auth_tokens):
        """Test milestone status updates and progress tracking"""
        agent = ProcessingAgent()
        grant = test_grants["nasdaq-center"][1]  # in_progress grant
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant, \
             patch.object(agent, '_update_milestone_status') as mock_update:
            
            mock_get_grant.return_value = grant
            
            # Generate timeline
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            milestones = timeline["milestones"]
            
            if milestones:
                milestone_id = milestones[0].get("milestone_id", "milestone_1")
                
                # Test status updates
                valid_statuses = ["not_started", "in_progress", "completed", "overdue"]
                
                for status in valid_statuses:
                    result = await agent.update_milestone_status(
                        grant["grant_id"],
                        milestone_id,
                        status,
                        grant["tenant_id"]
                    )
                    
                    assert result["success"] is True
                    assert result["milestone_id"] == milestone_id
                    assert result["new_status"] == status
                
                # Test invalid status
                with pytest.raises(ValueError):
                    await agent.update_milestone_status(
                        grant["grant_id"],
                        milestone_id,
                        "invalid_status",
                        grant["tenant_id"]
                    )
    
    @pytest.mark.asyncio
    async def test_grant_timeline_tenant_isolation(self, test_grants, auth_tokens):
        """Test that grant timelines respect tenant boundaries"""
        agent = ProcessingAgent()
        
        nasdaq_grant = test_grants["nasdaq-center"][0]
        tight5_grant = test_grants["tight5-digital"][0]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            # Test nasdaq grant access
            mock_get_grant.return_value = nasdaq_grant
            nasdaq_timeline = await agent.generate_grant_timeline(
                nasdaq_grant["grant_id"], 
                "nasdaq-center"
            )
            
            assert nasdaq_timeline["grant_id"] == nasdaq_grant["grant_id"]
            
            # Test tight5 grant access
            mock_get_grant.return_value = tight5_grant
            tight5_timeline = await agent.generate_grant_timeline(
                tight5_grant["grant_id"],
                "tight5-digital"
            )
            
            assert tight5_timeline["grant_id"] == tight5_grant["grant_id"]
            
            # Verify cross-tenant access fails
            mock_get_grant.return_value = None  # Simulate tenant isolation
            
            with pytest.raises(HTTPException) as exc_info:
                await agent.generate_grant_timeline(
                    nasdaq_grant["grant_id"],
                    "tight5-digital"  # Wrong tenant
                )
            
            assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_content_calendar_integration(self, test_grants):
        """Test integration between grant timelines and content calendar"""
        agent = ProcessingAgent()
        grant = test_grants["nasdaq-center"][0]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant, \
             patch.object(agent, '_create_content_calendar_entries') as mock_create_content:
            
            mock_get_grant.return_value = grant
            mock_create_content.return_value = {
                "content_items_created": 5,
                "milestone_content_mapping": {
                    "milestone_1": ["social_media_post", "newsletter_update"],
                    "milestone_2": ["blog_post", "press_release"],
                    "milestone_3": ["final_announcement", "success_story"]
                }
            }
            
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            
            # Verify content calendar integration
            mock_create_content.assert_called_once()
            
            # Check that timeline includes content calendar references
            assert "content_calendar_items" in timeline or any(
                "content" in milestone for milestone in timeline["milestones"]
            )
    
    @pytest.mark.asyncio
    async def test_risk_assessment_integration(self, test_grants):
        """Test risk assessment integration in grant timelines"""
        agent = ProcessingAgent()
        grant = test_grants["nasdaq-center"][0]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant, \
             patch.object(agent, '_assess_timeline_risks') as mock_assess_risks:
            
            mock_get_grant.return_value = grant
            mock_assess_risks.return_value = {
                "overall_risk": "medium",
                "risk_factors": [
                    {"factor": "tight_deadline", "severity": "high"},
                    {"factor": "resource_availability", "severity": "low"}
                ],
                "mitigation_strategies": [
                    "Increase team allocation",
                    "Parallel task execution"
                ]
            }
            
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            
            # Verify risk assessment is included
            assert "risk_assessment" in timeline
            assert timeline["risk_assessment"]["overall_risk"] == "medium"
            assert len(timeline["risk_assessment"]["risk_factors"]) == 2
    
    @pytest.mark.asyncio
    async def test_timeline_critical_path_analysis(self, test_grants):
        """Test critical path analysis for grant timelines"""
        agent = ProcessingAgent()
        grant = test_grants["nasdaq-center"][0]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            mock_get_grant.return_value = grant
            
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            
            # Verify critical path analysis
            assert "critical_path" in timeline
            critical_path = timeline["critical_path"]
            
            assert "total_duration" in critical_path
            assert "critical_milestones" in critical_path
            assert "buffer_time" in critical_path
            
            # Critical milestones should be a subset of all milestones
            all_milestone_ids = [m.get("milestone_id") for m in timeline["milestones"]]
            critical_milestone_ids = critical_path["critical_milestones"]
            
            assert all(mid in all_milestone_ids for mid in critical_milestone_ids)
    
    @pytest.mark.asyncio
    async def test_timeline_dependency_management(self, test_grants):
        """Test milestone dependency management"""
        agent = ProcessingAgent()
        grant = test_grants["nasdaq-center"][0]
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            mock_get_grant.return_value = grant
            
            timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
            milestones = timeline["milestones"]
            
            # Check for dependency information
            for milestone in milestones:
                if "dependencies" in milestone:
                    dependencies = milestone["dependencies"]
                    
                    # Dependencies should reference other milestones
                    for dep in dependencies:
                        assert "milestone_id" in dep
                        assert "type" in dep  # predecessor, successor, etc.
            
            # Verify dependency order (earlier milestones shouldn't depend on later ones)
            milestone_dates = [(m.get("milestone_id"), datetime.fromisoformat(m["date"])) for m in milestones]
            milestone_dates.sort(key=lambda x: x[1])  # Sort by date
            
            for i, (milestone_id, date) in enumerate(milestone_dates[1:], 1):
                milestone = next(m for m in milestones if m.get("milestone_id") == milestone_id)
                if "dependencies" in milestone:
                    for dep in milestone["dependencies"]:
                        dep_milestone_id = dep["milestone_id"]
                        dep_date = next(d for mid, d in milestone_dates if mid == dep_milestone_id)
                        assert dep_date <= date  # Dependency should come before current milestone
    
    @pytest.mark.asyncio
    async def test_multi_grant_timeline_coordination(self, test_grants):
        """Test coordination between multiple grant timelines"""
        agent = ProcessingAgent()
        nasdaq_grants = test_grants["nasdaq-center"]
        
        timelines = []
        
        with patch.object(agent, '_get_grant_data') as mock_get_grant:
            for grant in nasdaq_grants:
                mock_get_grant.return_value = grant
                timeline = await agent.generate_grant_timeline(grant["grant_id"], grant["tenant_id"])
                timelines.append(timeline)
        
        # Verify each timeline is generated independently
        assert len(timelines) == len(nasdaq_grants)
        
        # Check for timeline conflicts or resource overlaps
        all_milestone_dates = []
        for timeline in timelines:
            for milestone in timeline["milestones"]:
                all_milestone_dates.append({
                    "grant_id": timeline["grant_id"],
                    "date": datetime.fromisoformat(milestone["date"]),
                    "milestone_id": milestone.get("milestone_id"),
                    "estimated_effort": milestone.get("estimated_effort", 1)
                })
        
        # Sort by date to check for potential resource conflicts
        all_milestone_dates.sort(key=lambda x: x["date"])
        
        # Identify potential conflicts (milestones on same day)
        conflicts = []
        for i in range(len(all_milestone_dates) - 1):
            current = all_milestone_dates[i]
            next_item = all_milestone_dates[i + 1]
            
            if current["date"].date() == next_item["date"].date():
                if current["grant_id"] != next_item["grant_id"]:
                    conflicts.append((current, next_item))
        
        # This is informational - conflicts aren't necessarily errors
        # but should be flagged for resource planning
        if conflicts:
            print(f"Identified {len(conflicts)} potential timeline conflicts for resource planning")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])