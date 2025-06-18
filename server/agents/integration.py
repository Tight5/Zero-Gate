"""
Integration layer for connecting the orchestration agent with Express.js backend
Handles workflow task execution and resource monitoring integration
"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, Any, Optional
from datetime import datetime
from .orchestration import (
    OrchestrationAgent, 
    ResourceThresholds, 
    WorkflowTask,
    create_sponsor_analysis_task,
    create_grant_timeline_task,
    create_relationship_mapping_task
)

class ExpressIntegration:
    """Integration layer for communicating with Express.js backend"""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get current system health status"""
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                return await response.json()
        except Exception as e:
            return {"error": str(e), "status": "unhealthy"}
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get detailed system metrics"""
        try:
            async with self.session.get(f"{self.base_url}/metrics") as response:
                return await response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def get_tenant_sponsors(self, tenant_id: str, auth_token: str = None) -> Dict[str, Any]:
        """Get sponsors for a specific tenant"""
        headers = {"X-Tenant-ID": tenant_id}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        try:
            async with self.session.get(
                f"{self.base_url}/api/sponsors", 
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def get_tenant_grants(self, tenant_id: str, auth_token: str = None) -> Dict[str, Any]:
        """Get grants for a specific tenant"""
        headers = {"X-Tenant-ID": tenant_id}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        try:
            async with self.session.get(
                f"{self.base_url}/api/grants", 
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def discover_relationship_path(self, tenant_id: str, source: str, target: str, auth_token: str = None) -> Dict[str, Any]:
        """Discover relationship path between two entities"""
        headers = {"X-Tenant-ID": tenant_id, "Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            
        payload = {
            "source_id": source,
            "target_id": target,
            "max_depth": 7
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/relationships/discover-path",
                headers=headers,
                json=payload
            ) as response:
                return await response.json()
        except Exception as e:
            return {"error": str(e)}

class WorkflowManager:
    """Main workflow manager integrating orchestration agent with Express backend"""
    
    def __init__(self, db_url: str = None, express_url: str = "http://localhost:5000"):
        self.db_url = db_url or os.getenv("DATABASE_URL", "postgresql://localhost/zero_gate")
        self.express_url = express_url
        
        # Configure resource thresholds based on current metrics
        self.thresholds = ResourceThresholds(
            cpu_high=75.0,          # Start degrading at 75% CPU
            cpu_critical=90.0,      # Emergency mode at 90% CPU
            memory_high=80.0,       # Start degrading at 80% memory
            memory_critical=95.0,   # Emergency mode at 95% memory
            disk_high=85.0,         # Reduce disk operations at 85%
            response_time_high=2000.0  # Alert on 2+ second responses
        )
        
        self.agent = OrchestrationAgent(self.db_url, self.thresholds)
        self.is_running = False
        
    async def start(self, num_workers: int = 3):
        """Start the workflow manager"""
        await self.agent.start(num_workers)
        self.is_running = True
        
        # Start integration monitoring
        asyncio.create_task(self._monitor_integration())
        
    async def stop(self):
        """Stop the workflow manager"""
        self.is_running = False
        await self.agent.stop()
    
    async def trigger_sponsor_analysis(self, tenant_id: str, sponsor_id: str = None) -> Dict[str, Any]:
        """Trigger sponsor analysis workflow"""
        async with ExpressIntegration(self.express_url) as integration:
            # Get sponsors data
            sponsors_data = await integration.get_tenant_sponsors(tenant_id)
            
            if "error" in sponsors_data:
                return {"error": f"Failed to get sponsors: {sponsors_data['error']}"}
            
            # Process each sponsor or specific sponsor
            results = []
            sponsors = sponsors_data.get("sponsors", [])
            
            if sponsor_id:
                sponsors = [s for s in sponsors if s.get("id") == sponsor_id]
            
            for sponsor in sponsors[:5]:  # Limit to 5 sponsors to avoid overload
                task = create_sponsor_analysis_task(tenant_id, sponsor)
                success = await self.agent.submit_task(task)
                
                if success:
                    results.append({
                        "sponsor_id": sponsor.get("id"),
                        "task_id": task.task_id,
                        "status": "submitted"
                    })
                else:
                    results.append({
                        "sponsor_id": sponsor.get("id"),
                        "status": "rejected",
                        "reason": "Resource constraints"
                    })
            
            return {"results": results, "total_submitted": len(results)}
    
    async def trigger_grant_timeline_analysis(self, tenant_id: str, grant_id: str = None) -> Dict[str, Any]:
        """Trigger grant timeline analysis workflow"""
        async with ExpressIntegration(self.express_url) as integration:
            # Get grants data
            grants_data = await integration.get_tenant_grants(tenant_id)
            
            if "error" in grants_data:
                return {"error": f"Failed to get grants: {grants_data['error']}"}
            
            # Process each grant or specific grant
            results = []
            grants = grants_data.get("grants", [])
            
            if grant_id:
                grants = [g for g in grants if g.get("id") == grant_id]
            
            for grant in grants:
                if grant.get("submission_deadline"):  # Only process grants with deadlines
                    task = create_grant_timeline_task(tenant_id, grant)
                    success = await self.agent.submit_task(task)
                    
                    if success:
                        results.append({
                            "grant_id": grant.get("id"),
                            "task_id": task.task_id,
                            "status": "submitted"
                        })
                    else:
                        results.append({
                            "grant_id": grant.get("id"),
                            "status": "rejected",
                            "reason": "Resource constraints"
                        })
            
            return {"results": results, "total_submitted": len(results)}
    
    async def trigger_relationship_mapping(self, tenant_id: str, source: str, target: str) -> Dict[str, Any]:
        """Trigger relationship mapping workflow"""
        task = create_relationship_mapping_task(tenant_id, source, target)
        success = await self.agent.submit_task(task)
        
        if success:
            return {
                "task_id": task.task_id,
                "status": "submitted",
                "source": source,
                "target": target
            }
        else:
            return {
                "status": "rejected",
                "reason": "Relationship mapping disabled due to resource constraints",
                "source": source,
                "target": target
            }
    
    async def get_workflow_status(self) -> Dict[str, Any]:
        """Get current workflow and system status"""
        agent_status = self.agent.get_status()
        metrics_summary = self.agent.get_metrics_summary()
        
        async with ExpressIntegration(self.express_url) as integration:
            health_status = await integration.get_health_status()
            system_metrics = await integration.get_system_metrics()
        
        return {
            "workflow_manager": {
                "is_running": self.is_running,
                "agent_status": agent_status
            },
            "system_health": health_status,
            "system_metrics": system_metrics,
            "metrics_summary": metrics_summary,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_feature_availability(self) -> Dict[str, str]:
        """Get current feature availability based on resource usage"""
        return self.agent.feature_states
    
    async def _monitor_integration(self):
        """Monitor integration health and adjust thresholds if needed"""
        while self.is_running:
            try:
                async with ExpressIntegration(self.express_url) as integration:
                    health = await integration.get_health_status()
                    
                    # Adjust thresholds based on health status
                    if health.get("status") == "critical":
                        # Tighten thresholds in critical state
                        self.thresholds.cpu_high = 60.0
                        self.thresholds.memory_high = 70.0
                    elif health.get("status") == "ok":
                        # Relax thresholds when healthy
                        self.thresholds.cpu_high = 75.0
                        self.thresholds.memory_high = 80.0
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                print(f"Integration monitoring error: {e}")
                await asyncio.sleep(60)

# Global workflow manager instance
workflow_manager = None

async def get_workflow_manager() -> WorkflowManager:
    """Get or create global workflow manager instance"""
    global workflow_manager
    
    if workflow_manager is None:
        workflow_manager = WorkflowManager()
        await workflow_manager.start()
    
    return workflow_manager

async def cleanup_workflow_manager():
    """Cleanup global workflow manager"""
    global workflow_manager
    
    if workflow_manager:
        await workflow_manager.stop()
        workflow_manager = None

# Example usage and testing
async def test_workflow_integration():
    """Test the workflow integration"""
    manager = WorkflowManager()
    
    try:
        await manager.start(num_workers=2)
        
        # Test sponsor analysis
        print("Testing sponsor analysis...")
        sponsor_result = await manager.trigger_sponsor_analysis("test-tenant")
        print(f"Sponsor analysis result: {sponsor_result}")
        
        # Test grant timeline
        print("Testing grant timeline...")
        timeline_result = await manager.trigger_grant_timeline_analysis("test-tenant")
        print(f"Timeline analysis result: {timeline_result}")
        
        # Test relationship mapping
        print("Testing relationship mapping...")
        mapping_result = await manager.trigger_relationship_mapping(
            "test-tenant", "user1@example.com", "user2@example.com"
        )
        print(f"Mapping result: {mapping_result}")
        
        # Wait for some tasks to complete
        await asyncio.sleep(10)
        
        # Get status
        status = await manager.get_workflow_status()
        print(f"Workflow status: {json.dumps(status, indent=2, default=str)}")
        
    finally:
        await manager.stop()

if __name__ == "__main__":
    asyncio.run(test_workflow_integration())