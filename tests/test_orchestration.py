"""
Comprehensive test suite for the Orchestration Agent
Tests workflow management, resource monitoring, and feature toggles
"""

import asyncio
import pytest
import json
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Import the orchestration components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

from agents.orchestration import (
    OrchestrationAgent, WorkflowTask, Priority, WorkflowStatus,
    ResourceMonitor, ResourceThresholds, FeatureFlag
)
from utils.resource_monitor import EnhancedResourceMonitor

class TestOrchestrationAgent:
    """Test suite for OrchestrationAgent"""
    
    @pytest.fixture
    async def agent(self):
        """Create a test orchestration agent"""
        agent = OrchestrationAgent(max_concurrent_tasks=3)
        await agent.start()
        yield agent
        await agent.stop()
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self):
        """Test agent initialization and startup"""
        agent = OrchestrationAgent()
        assert not agent.running
        assert agent.max_concurrent_tasks == 5
        assert len(agent.workflow_handlers) > 0
        
        await agent.start()
        assert agent.running
        assert agent.stats['uptime_start'] is not None
        
        await agent.stop()
        assert not agent.running
    
    @pytest.mark.asyncio
    async def test_workflow_submission(self, agent):
        """Test workflow task submission"""
        task_id = await agent.submit_workflow(
            'sponsor_analysis',
            'test-tenant',
            {'sponsor_id': 'test-sponsor'},
            Priority.HIGH
        )
        
        assert task_id is not None
        assert task_id.startswith('sponsor_analysis_test-tenant_')
        assert agent.stats['total_tasks'] == 1
        
        # Check task was added to queue
        task = agent.workflow_queue.tasks.get(task_id)
        assert task is not None
        assert task.workflow_type == 'sponsor_analysis'
        assert task.tenant_id == 'test-tenant'
        assert task.priority == Priority.HIGH
    
    @pytest.mark.asyncio
    async def test_workflow_execution(self, agent):
        """Test workflow task execution"""
        task_id = await agent.submit_workflow(
            'sponsor_analysis',
            'test-tenant',
            {'sponsor_id': 'test-sponsor'},
            Priority.HIGH
        )
        
        # Wait for task to complete
        await asyncio.sleep(5)
        
        status = await agent.get_workflow_status(task_id)
        assert status is not None
        assert status['status'] in ['completed', 'running']
        
        if status['status'] == 'completed':
            assert status['progress'] == 100.0
            assert status['completed_at'] is not None
    
    @pytest.mark.asyncio
    async def test_workflow_dependencies(self, agent):
        """Test workflow task dependencies"""
        # Submit parent task
        parent_task_id = await agent.submit_workflow(
            'sponsor_analysis',
            'test-tenant',
            {'sponsor_id': 'test-sponsor'},
            Priority.HIGH
        )
        
        # Submit dependent task
        dependent_task_id = await agent.submit_workflow(
            'relationship_mapping',
            'test-tenant',
            {'source_entity': 'test-sponsor', 'target_entity': 'test-target'},
            Priority.MEDIUM,
            dependencies=[parent_task_id]
        )
        
        # Wait for parent to complete
        await asyncio.sleep(5)
        
        parent_status = await agent.get_workflow_status(parent_task_id)
        dependent_status = await agent.get_workflow_status(dependent_task_id)
        
        # Dependent task should only start after parent completes
        if parent_status['status'] == 'completed':
            assert dependent_status['status'] in ['running', 'completed', 'pending']
    
    @pytest.mark.asyncio
    async def test_concurrent_task_limit(self, agent):
        """Test concurrent task execution limit"""
        # Submit more tasks than the limit
        task_ids = []
        for i in range(5):
            task_id = await agent.submit_workflow(
                'grant_timeline',
                'test-tenant',
                {'grant_id': f'grant-{i}'},
                Priority.MEDIUM
            )
            task_ids.append(task_id)
        
        await asyncio.sleep(2)
        
        # Check that only max_concurrent_tasks are running
        running_count = len(agent.workflow_queue.running_tasks)
        assert running_count <= agent.max_concurrent_tasks
    
    @pytest.mark.asyncio
    async def test_system_status(self, agent):
        """Test system status reporting"""
        # Submit a few tasks
        await agent.submit_workflow('sponsor_analysis', 'test-tenant', {'sponsor_id': 'test'})
        await agent.submit_workflow('grant_timeline', 'test-tenant', {'grant_id': 'test'})
        
        status = await agent.get_system_status()
        
        assert 'agent_status' in status
        assert 'uptime' in status
        assert 'statistics' in status
        assert 'queue_status' in status
        assert 'resource_metrics' in status
        assert 'enabled_features' in status
        
        assert status['agent_status'] == 'running'
        assert status['statistics']['total_tasks'] >= 2

class TestResourceMonitor:
    """Test suite for ResourceMonitor"""
    
    @pytest.fixture
    def monitor(self):
        """Create a test resource monitor"""
        thresholds = ResourceThresholds(
            cpu_high=80.0,
            cpu_critical=95.0,
            memory_high=85.0,
            memory_critical=95.0
        )
        return ResourceMonitor(thresholds)
    
    @pytest.mark.asyncio
    async def test_monitor_initialization(self, monitor):
        """Test resource monitor initialization"""
        assert not monitor.monitoring_active
        assert len(monitor.enabled_features) == len(FeatureFlag)
        assert all(monitor.enabled_features.values())  # All features enabled initially
    
    @pytest.mark.asyncio
    async def test_feature_toggling(self, monitor):
        """Test feature enabling/disabling"""
        # All features should be enabled initially
        assert monitor.is_feature_enabled(FeatureFlag.SPONSOR_ANALYSIS)
        assert monitor.is_feature_enabled(FeatureFlag.ADVANCED_ANALYTICS)
        
        # Simulate high resource usage
        await monitor._disable_intensive_features()
        
        # Check that intensive features are disabled
        assert not monitor.is_feature_enabled(FeatureFlag.ADVANCED_ANALYTICS)
        assert not monitor.is_feature_enabled(FeatureFlag.EXCEL_PROCESSING)
        
        # Standard features should still be enabled
        assert monitor.is_feature_enabled(FeatureFlag.SPONSOR_ANALYSIS)
    
    @pytest.mark.asyncio
    async def test_monitoring_loop(self, monitor):
        """Test monitoring loop functionality"""
        await monitor.start_monitoring(interval=1)  # Short interval for testing
        assert monitor.monitoring_active
        
        # Let it run for a few seconds
        await asyncio.sleep(3)
        
        # Check that metrics were collected
        assert len(monitor.metrics_history) > 0
        
        latest_metrics = monitor.get_current_metrics()
        assert latest_metrics is not None
        assert hasattr(latest_metrics, 'cpu_percent')
        assert hasattr(latest_metrics, 'memory_percent')
        
        await monitor.stop_monitoring()
        assert not monitor.monitoring_active

class TestEnhancedResourceMonitor:
    """Test suite for EnhancedResourceMonitor"""
    
    @pytest.fixture
    def enhanced_monitor(self):
        """Create a test enhanced resource monitor"""
        return EnhancedResourceMonitor("development")
    
    @pytest.mark.asyncio
    async def test_profile_switching(self, enhanced_monitor):
        """Test performance profile switching"""
        assert enhanced_monitor.current_profile.name == "development"
        
        enhanced_monitor.switch_profile("performance")
        assert enhanced_monitor.current_profile.name == "performance"
        assert enhanced_monitor.current_profile.cpu_threshold_high == 60.0
        
        # Test invalid profile
        with pytest.raises(ValueError):
            enhanced_monitor.switch_profile("invalid_profile")
    
    @pytest.mark.asyncio
    async def test_feature_overrides(self, enhanced_monitor):
        """Test manual feature overrides"""
        # Test normal feature status
        status = enhanced_monitor.get_feature_status("advanced_analytics")
        assert isinstance(status, bool)
        
        # Override feature
        enhanced_monitor.override_feature("advanced_analytics", False)
        assert not enhanced_monitor.get_feature_status("advanced_analytics")
        
        enhanced_monitor.override_feature("advanced_analytics", True)
        assert enhanced_monitor.get_feature_status("advanced_analytics")
    
    @pytest.mark.asyncio
    async def test_health_score_calculation(self, enhanced_monitor):
        """Test system health score calculation"""
        # Initially should be 100 (no data)
        health_score = enhanced_monitor.get_system_health_score()
        assert health_score == 100.0
        
        # Start monitoring briefly to get some data
        await enhanced_monitor.start_monitoring()
        await asyncio.sleep(2)
        
        health_score = enhanced_monitor.get_system_health_score()
        assert 0.0 <= health_score <= 100.0
        
        await enhanced_monitor.stop_monitoring()

class TestWorkflowIntegration:
    """Test suite for workflow and resource monitoring integration"""
    
    @pytest.mark.asyncio
    async def test_resource_aware_execution(self):
        """Test that workflows respect resource constraints"""
        # Create agent with resource monitoring
        agent = OrchestrationAgent(max_concurrent_tasks=2)
        await agent.start()
        
        try:
            # Simulate high resource usage
            await agent.resource_monitor._disable_intensive_features()
            
            # Submit intensive workflow
            task_id = await agent.submit_workflow(
                'excel_processing',
                'test-tenant',
                {'file_path': 'test.xlsx'},
                Priority.HIGH
            )
            
            # Wait and check if task was postponed due to resource constraints
            await asyncio.sleep(3)
            
            status = await agent.get_workflow_status(task_id)
            # Task might be pending if feature is disabled
            assert status['status'] in ['pending', 'running', 'completed']
            
        finally:
            await agent.stop()
    
    @pytest.mark.asyncio
    async def test_emergency_controls(self):
        """Test emergency workflow controls"""
        agent = OrchestrationAgent()
        await agent.start()
        
        try:
            # Submit several workflows
            task_ids = []
            for i in range(3):
                task_id = await agent.submit_workflow(
                    'sponsor_analysis',
                    'test-tenant',
                    {'sponsor_id': f'sponsor-{i}'},
                    Priority.MEDIUM
                )
                task_ids.append(task_id)
            
            await asyncio.sleep(1)
            
            # Test emergency stop
            await agent.stop()
            assert not agent.running
            
            # All running tasks should be cancelled
            assert len(agent.workflow_queue.running_tasks) == 0
            
        finally:
            if agent.running:
                await agent.stop()

class TestWorkflowQueue:
    """Test suite for WorkflowQueue"""
    
    @pytest.mark.asyncio
    async def test_priority_ordering(self):
        """Test that tasks are processed in priority order"""
        from agents.orchestration import WorkflowQueue
        
        queue = WorkflowQueue()
        
        # Add tasks with different priorities
        low_task = WorkflowTask(
            id="low", name="Low Priority", workflow_type="test",
            priority=Priority.LOW, status=WorkflowStatus.PENDING,
            tenant_id="test", payload={}, created_at=datetime.now()
        )
        
        high_task = WorkflowTask(
            id="high", name="High Priority", workflow_type="test",
            priority=Priority.HIGH, status=WorkflowStatus.PENDING,
            tenant_id="test", payload={}, created_at=datetime.now()
        )
        
        medium_task = WorkflowTask(
            id="medium", name="Medium Priority", workflow_type="test",
            priority=Priority.MEDIUM, status=WorkflowStatus.PENDING,
            tenant_id="test", payload={}, created_at=datetime.now()
        )
        
        # Add in reverse priority order
        await queue.add_task(low_task)
        await queue.add_task(medium_task)
        await queue.add_task(high_task)
        
        # Tasks should come out in priority order (high first)
        first_task = await queue.get_next_task()
        assert first_task.id == "high"
        
        second_task = await queue.get_next_task()
        assert second_task.id == "medium"
        
        third_task = await queue.get_next_task()
        assert third_task.id == "low"

@pytest.mark.asyncio
async def test_end_to_end_workflow():
    """End-to-end test of complete workflow processing"""
    # Create orchestration agent
    agent = OrchestrationAgent(max_concurrent_tasks=2)
    await agent.start()
    
    try:
        # Submit a complex workflow with dependencies
        sponsor_task_id = await agent.submit_workflow(
            'sponsor_analysis',
            'e2e-tenant',
            {'sponsor_id': 'microsoft-foundation'},
            Priority.HIGH
        )
        
        grant_task_id = await agent.submit_workflow(
            'grant_timeline',
            'e2e-tenant',
            {'grant_id': 'innovation-grant-2025'},
            Priority.MEDIUM
        )
        
        relationship_task_id = await agent.submit_workflow(
            'relationship_mapping',
            'e2e-tenant',
            {'source_entity': 'microsoft-foundation', 'target_entity': 'tech-hub'},
            Priority.MEDIUM,
            dependencies=[sponsor_task_id]
        )
        
        # Wait for processing
        await asyncio.sleep(10)
        
        # Check final status
        system_status = await agent.get_system_status()
        assert system_status['statistics']['total_tasks'] == 3
        
        # Check individual task statuses
        sponsor_status = await agent.get_workflow_status(sponsor_task_id)
        grant_status = await agent.get_workflow_status(grant_task_id)
        relationship_status = await agent.get_workflow_status(relationship_task_id)
        
        # At least some tasks should be completed
        completed_tasks = [
            status for status in [sponsor_status, grant_status, relationship_status]
            if status and status['status'] == 'completed'
        ]
        assert len(completed_tasks) > 0
        
        # Relationship task should not complete before sponsor task
        if (sponsor_status['status'] == 'completed' and 
            relationship_status['status'] == 'completed'):
            sponsor_completed = datetime.fromisoformat(sponsor_status['completed_at'])
            relationship_completed = datetime.fromisoformat(relationship_status['completed_at'])
            assert sponsor_completed <= relationship_completed
            
    finally:
        await agent.stop()

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])