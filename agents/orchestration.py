"""
Orchestration Agent for Zero Gate ESO Platform
Handles workflow coordination, tenant management, and security
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from utils.resource_monitor import ResourceMonitor
from utils.tenant_context import get_current_tenant

logger = logging.getLogger("zero-gate.orchestration")

class OrchestrationAgent:
    def __init__(self, resource_monitor: ResourceMonitor):
        self.resource_monitor = resource_monitor
        self.active_workflows = {}
        self.task_queue = asyncio.Queue()
        self.running = False
        self.memory_monitoring_enabled = True
        self.last_memory_check = datetime.now()
        self.degraded_features = set()
        
        # Memory thresholds per attached asset requirements
        self.memory_thresholds = {
            "warning": 0.75,    # 75% - warning level
            "critical": 0.90,   # 90% - critical level requiring feature degradation
            "emergency": 0.95   # 95% - emergency shutdown
        }
        
    async def start(self):
        """Start the orchestration agent"""
        self.running = True
        asyncio.create_task(self._process_tasks())
        asyncio.create_task(self._monitor_memory())
        logger.info("Orchestration Agent started with memory monitoring enabled")
    
    async def stop(self):
        """Stop the orchestration agent"""
        self.running = False
        logger.info("Orchestration Agent stopped")
    
    async def _monitor_memory(self):
        """Monitor memory usage and trigger feature degradation per attached asset requirements"""
        while self.running:
            try:
                if self.memory_monitoring_enabled:
                    current_usage = self.resource_monitor.get_memory_usage()
                    
                    # Check for critical memory threshold (90%) requiring feature degradation
                    if current_usage >= self.memory_thresholds["critical"]:
                        await self._trigger_feature_degradation(current_usage)
                    elif current_usage >= self.memory_thresholds["warning"]:
                        logger.warning(f"Memory usage at warning level: {current_usage:.1%}")
                    
                    # Emergency shutdown at 95%
                    if current_usage >= self.memory_thresholds["emergency"]:
                        await self._emergency_resource_management()
                    
                    self.last_memory_check = datetime.now()
                
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                logger.error(f"Error monitoring memory: {str(e)}")
                await asyncio.sleep(10)  # Back off on error

    async def _trigger_feature_degradation(self, memory_usage: float):
        """Trigger automatic feature degradation when memory exceeds 90%"""
        logger.critical(f"Memory usage critical at {memory_usage:.1%} - triggering feature degradation")
        
        # Disable advanced analytics
        if "advanced_analytics" not in self.degraded_features:
            self.resource_monitor.disable_feature("advanced_analytics")
            self.degraded_features.add("advanced_analytics")
            logger.info("Disabled advanced analytics due to memory pressure")
        
        # Disable relationship mapping
        if "relationship_mapping" not in self.degraded_features:
            self.resource_monitor.disable_feature("relationship_mapping")
            self.degraded_features.add("relationship_mapping")
            logger.info("Disabled relationship mapping due to memory pressure")
        
        # Disable Excel processing
        if "excel_processing" not in self.degraded_features:
            self.resource_monitor.disable_feature("excel_processing")
            self.degraded_features.add("excel_processing")
            logger.info("Disabled Excel processing due to memory pressure")
        
        # Clear task queue to reduce memory pressure
        while not self.task_queue.empty():
            try:
                self.task_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        
        logger.info("Task queue cleared to reduce memory pressure")

    async def _emergency_resource_management(self):
        """Emergency resource management at 95% memory usage"""
        logger.critical("Emergency memory threshold reached - implementing aggressive optimization")
        
        # Stop all active workflows
        self.active_workflows.clear()
        
        # Disable all non-essential features
        non_essential_features = [
            "advanced_analytics", "relationship_mapping", "excel_processing",
            "real_time_updates", "background_sync", "detailed_logging"
        ]
        
        for feature in non_essential_features:
            self.resource_monitor.disable_feature(feature)
            self.degraded_features.add(feature)
        
        # Trigger garbage collection
        try:
            import gc
            gc.collect()
            logger.info("Emergency garbage collection triggered")
        except Exception as e:
            logger.error(f"Garbage collection failed: {str(e)}")

    async def _process_tasks(self):
        """Process tasks from the queue with memory awareness"""
        while self.running:
            try:
                # Check memory before processing tasks
                current_usage = self.resource_monitor.get_memory_usage()
                if current_usage >= self.memory_thresholds["critical"]:
                    logger.warning("Skipping task processing due to high memory usage")
                    await asyncio.sleep(5)
                    continue
                
                if not self.task_queue.empty():
                    task = await self.task_queue.get()
                    await self._execute_task(task)
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error processing task: {str(e)}")
    
    async def _execute_task(self, task: Dict[str, Any]):
        """Execute a specific task"""
        task_type = task.get("type")
        tenant_id = task.get("tenant_id")
        
        if not tenant_id:
            logger.error("Task missing tenant_id")
            return
        
        try:
            if task_type == "sponsor_analysis":
                await self._handle_sponsor_analysis(task)
            elif task_type == "grant_timeline":
                await self._handle_grant_timeline(task)
            elif task_type == "relationship_mapping":
                await self._handle_relationship_mapping(task)
            else:
                logger.warning(f"Unknown task type: {task_type}")
        except Exception as e:
            logger.error(f"Task execution failed: {str(e)}")
    
    async def _handle_sponsor_analysis(self, task: Dict[str, Any]):
        """Handle sponsor analysis workflow"""
        if not self.resource_monitor.is_feature_enabled("advanced_analytics"):
            logger.warning("Sponsor analysis disabled due to resource constraints")
            return
        
        sponsor_id = task.get("sponsor_id")
        logger.info(f"Processing sponsor analysis for {sponsor_id}")
        
        # Implement sponsor analysis logic
        # This would coordinate between Processing and Integration agents
    
    async def _handle_grant_timeline(self, task: Dict[str, Any]):
        """Handle grant timeline generation"""
        grant_id = task.get("grant_id")
        logger.info(f"Generating timeline for grant {grant_id}")
        
        # Implement backwards planning logic for grant timelines
    
    async def _handle_relationship_mapping(self, task: Dict[str, Any]):
        """Handle relationship mapping requests"""
        if not self.resource_monitor.is_feature_enabled("relationship_mapping"):
            logger.warning("Relationship mapping disabled due to resource constraints")
            return
        
        source_id = task.get("source_id")
        target_id = task.get("target_id")
        logger.info(f"Finding relationship path from {source_id} to {target_id}")
        
        # Implement seven degrees of separation logic
    
    async def submit_task(self, task: Dict[str, Any]) -> str:
        """Submit a task for processing"""
        task_id = f"task_{datetime.now().timestamp()}"
        task["task_id"] = task_id
        task["submitted_at"] = datetime.now()
        
        await self.task_queue.put(task)
        logger.info(f"Task {task_id} submitted for processing")
        
        return task_id
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get the status of a specific workflow"""
        return self.active_workflows.get(workflow_id, {"status": "not_found"})
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status with memory monitoring details"""
        current_memory = self.resource_monitor.get_memory_usage()
        
        return {
            "agent_status": "running" if self.running else "stopped",
            "active_workflows": len(self.active_workflows),
            "queue_size": self.task_queue.qsize(),
            "resource_usage": self.resource_monitor.get_current_usage(),
            "enabled_features": self.resource_monitor.get_enabled_features(),
            "memory_status": {
                "current_usage": current_memory,
                "warning_threshold": self.memory_thresholds["warning"],
                "critical_threshold": self.memory_thresholds["critical"],
                "emergency_threshold": self.memory_thresholds["emergency"],
                "degraded_features": list(self.degraded_features),
                "last_check": self.last_memory_check.isoformat(),
                "monitoring_enabled": self.memory_monitoring_enabled
            }
        }
    
    def enable_feature_recovery(self):
        """Re-enable features when memory usage returns to normal levels"""
        current_usage = self.resource_monitor.get_memory_usage()
        
        # Only recover features if memory is below warning threshold
        if current_usage < self.memory_thresholds["warning"]:
            recovered_features = []
            
            for feature in list(self.degraded_features):
                self.resource_monitor.enable_feature(feature)
                self.degraded_features.remove(feature)
                recovered_features.append(feature)
                logger.info(f"Re-enabled feature: {feature}")
            
            if recovered_features:
                logger.info(f"Memory recovery complete - restored {len(recovered_features)} features")
            
            return recovered_features
        
        return []
    
    def force_memory_optimization(self):
        """Manually trigger memory optimization for emergency situations"""
        logger.warning("Manual memory optimization triggered")
        current_usage = self.resource_monitor.get_memory_usage()
        
        if current_usage >= self.memory_thresholds["critical"]:
            asyncio.create_task(self._trigger_feature_degradation(current_usage))
        
        # Force garbage collection
        try:
            import gc
            gc.collect()
            logger.info("Manual garbage collection completed")
        except Exception as e:
            logger.error(f"Manual garbage collection failed: {str(e)}")
        
        return self.get_system_status()