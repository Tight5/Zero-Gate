"""
Asyncio-based Orchestration Agent for Zero Gate ESO Platform
Manages workflow tasks with resource-aware feature toggling
"""

import asyncio
import json
import time
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import asyncpg

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class FeatureState(Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    DEGRADED = "degraded"

@dataclass
class ResourceThresholds:
    """Resource usage thresholds for feature management"""
    cpu_high: float = 80.0      # Disable low priority features
    cpu_critical: float = 90.0   # Disable medium priority features
    memory_high: float = 85.0    # Start degrading features
    memory_critical: float = 95.0 # Emergency mode
    disk_high: float = 85.0      # Reduce file operations
    response_time_high: float = 2000.0  # 2 seconds

@dataclass
class WorkflowTask:
    """Represents a workflow task in the orchestration system"""
    task_id: str
    task_type: str
    priority: TaskPriority
    tenant_id: str
    data: Dict[str, Any]
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    dependencies: List[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.dependencies is None:
            self.dependencies = []

class ResourceMonitor:
    """Monitors system resources and determines feature availability"""
    
    def __init__(self, thresholds: ResourceThresholds):
        self.thresholds = thresholds
        self.api_url = "http://localhost:5000"
        
    async def get_system_metrics(self) -> Dict[str, float]:
        """Get current system resource metrics"""
        try:
            # Get local system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Get application metrics from health endpoint
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(f"{self.api_url}/metrics", timeout=5) as response:
                        if response.status == 200:
                            app_metrics = await response.json()
                            app_memory = app_metrics.get('system', {}).get('memory', {}).get('percentage', 0)
                        else:
                            app_memory = 0
                except:
                    app_memory = 0
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'app_memory_percent': app_memory,
                'disk_percent': disk.percent,
                'memory_available_gb': memory.available / (1024**3),
                'timestamp': time.time()
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {
                'cpu_percent': 0,
                'memory_percent': 0,
                'app_memory_percent': 0,
                'disk_percent': 0,
                'memory_available_gb': 0,
                'timestamp': time.time()
            }
    
    async def determine_feature_states(self, metrics: Dict[str, float]) -> Dict[str, FeatureState]:
        """Determine which features should be enabled based on resource usage"""
        states = {}
        
        cpu = metrics['cpu_percent']
        memory = max(metrics['memory_percent'], metrics['app_memory_percent'])
        disk = metrics['disk_percent']
        
        # Core features (always enabled unless critical)
        states['authentication'] = FeatureState.ENABLED
        states['basic_crud'] = FeatureState.ENABLED
        
        # Aggressive memory management - trigger at 85% threshold
        if memory >= 85 or cpu > self.thresholds.cpu_critical:
            # Emergency mode - disable non-essential features immediately
            states['relationship_mapping'] = FeatureState.DISABLED
            states['advanced_analytics'] = FeatureState.DISABLED
            states['background_sync'] = FeatureState.DISABLED
            states['file_processing'] = FeatureState.DISABLED
            states['grant_timeline_analysis'] = FeatureState.DISABLED
            logger.warning(f"CRITICAL: Emergency memory management activated - Memory={memory}%, CPU={cpu}%")
            
        elif memory >= 80 or cpu > self.thresholds.cpu_high:
            # High usage - aggressively degrade features
            states['relationship_mapping'] = FeatureState.DISABLED
            states['advanced_analytics'] = FeatureState.DISABLED
            states['background_sync'] = FeatureState.DEGRADED
            states['file_processing'] = FeatureState.DEGRADED
            states['grant_timeline_analysis'] = FeatureState.DEGRADED
            logger.warning(f"HIGH: Aggressive memory management - Memory={memory}%, CPU={cpu}%")
            
        elif memory >= 75:
            # Warning level - start disabling memory-intensive features
            states['relationship_mapping'] = FeatureState.DEGRADED
            states['advanced_analytics'] = FeatureState.DEGRADED
            states['background_sync'] = FeatureState.ENABLED
            states['file_processing'] = FeatureState.ENABLED
            states['grant_timeline_analysis'] = FeatureState.ENABLED
            logger.info(f"WARNING: Memory management engaged - Memory={memory}%, CPU={cpu}%")
            
        else:
            # Normal operation
            states['relationship_mapping'] = FeatureState.ENABLED
            states['advanced_analytics'] = FeatureState.ENABLED
            states['background_sync'] = FeatureState.ENABLED
            states['file_processing'] = FeatureState.ENABLED
            states['grant_timeline_analysis'] = FeatureState.ENABLED
        
        # Disk-specific features
        if disk > self.thresholds.disk_high:
            states['file_processing'] = FeatureState.DISABLED
            states['backup_operations'] = FeatureState.DISABLED
        else:
            states['backup_operations'] = FeatureState.ENABLED
            
        return states

class OrchestrationAgent:
    """Main orchestration agent managing workflow tasks"""
    
    def __init__(self, db_url: str, thresholds: ResourceThresholds = None):
        self.db_url = db_url
        self.thresholds = thresholds or ResourceThresholds()
        self.resource_monitor = ResourceMonitor(self.thresholds)
        self.task_queue = asyncio.Queue()
        self.running_tasks = {}
        self.feature_states = {}
        self.workers = []
        self.is_running = False
        self.metrics_history = []
        self.max_history = 1000
        
    async def start(self, num_workers: int = 3):
        """Start the orchestration agent"""
        self.is_running = True
        logger.info(f"Starting orchestration agent with {num_workers} workers")
        
        # Start worker tasks
        for i in range(num_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        
        # Start monitoring task
        monitor_task = asyncio.create_task(self._monitor_resources())
        self.workers.append(monitor_task)
        
        # Start cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_completed_tasks())
        self.workers.append(cleanup_task)
        
        logger.info("Orchestration agent started successfully")
    
    async def stop(self):
        """Stop the orchestration agent"""
        self.is_running = False
        logger.info("Stopping orchestration agent...")
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        logger.info("Orchestration agent stopped")
    
    async def submit_task(self, task: WorkflowTask) -> bool:
        """Submit a task to the workflow queue"""
        if not self._is_feature_enabled(task.task_type):
            logger.warning(f"Task {task.task_type} disabled due to resource constraints")
            task.status = TaskStatus.CANCELLED
            task.error_message = "Feature disabled due to resource constraints"
            return False
        
        await self.task_queue.put(task)
        logger.info(f"Task {task.task_id} ({task.task_type}) submitted")
        return True
    
    def _is_feature_enabled(self, task_type: str) -> bool:
        """Check if a feature is enabled based on current resource state"""
        feature_map = {
            'sponsor_analysis': 'advanced_analytics',
            'relationship_mapping': 'relationship_mapping',
            'grant_timeline': 'grant_timeline_analysis',
            'background_sync': 'background_sync',
            'file_processing': 'file_processing'
        }
        
        feature = feature_map.get(task_type, 'basic_crud')
        state = self.feature_states.get(feature, FeatureState.ENABLED)
        return state != FeatureState.DISABLED
    
    async def _worker(self, worker_name: str):
        """Worker coroutine that processes tasks from the queue"""
        logger.info(f"Worker {worker_name} started")
        
        while self.is_running:
            try:
                # Get task from queue with timeout
                task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                
                # Check dependencies
                if not await self._check_dependencies(task):
                    # Requeue task for later
                    await asyncio.sleep(5)
                    await self.task_queue.put(task)
                    continue
                
                # Process the task
                self.running_tasks[task.task_id] = task
                task.status = TaskStatus.RUNNING
                task.started_at = datetime.utcnow()
                
                logger.info(f"Worker {worker_name} processing task {task.task_id}")
                
                try:
                    await self._execute_task(task)
                    task.status = TaskStatus.COMPLETED
                    task.completed_at = datetime.utcnow()
                    logger.info(f"Task {task.task_id} completed successfully")
                    
                except Exception as e:
                    task.retry_count += 1
                    if task.retry_count <= task.max_retries:
                        task.status = TaskStatus.PENDING
                        task.error_message = str(e)
                        await asyncio.sleep(2 ** task.retry_count)  # Exponential backoff
                        await self.task_queue.put(task)
                        logger.warning(f"Task {task.task_id} failed, retrying ({task.retry_count}/{task.max_retries})")
                    else:
                        task.status = TaskStatus.FAILED
                        task.error_message = str(e)
                        logger.error(f"Task {task.task_id} failed permanently: {e}")
                
                finally:
                    if task.task_id in self.running_tasks:
                        del self.running_tasks[task.task_id]
                        
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}")
                await asyncio.sleep(1)
    
    async def _check_dependencies(self, task: WorkflowTask) -> bool:
        """Check if task dependencies are satisfied"""
        if not task.dependencies:
            return True
        
        # Check if dependency tasks are completed
        # In a real implementation, this would check a persistent store
        return True
    
    async def _execute_task(self, task: WorkflowTask):
        """Execute a specific task based on its type"""
        handler_map = {
            'sponsor_analysis': self._handle_sponsor_analysis,
            'grant_timeline': self._handle_grant_timeline,
            'relationship_mapping': self._handle_relationship_mapping,
            'background_sync': self._handle_background_sync,
            'file_processing': self._handle_file_processing
        }
        
        handler = handler_map.get(task.task_type)
        if handler:
            await handler(task)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    async def _handle_sponsor_analysis(self, task: WorkflowTask):
        """Handle sponsor analysis workflow task"""
        tenant_id = task.tenant_id
        sponsor_data = task.data.get('sponsor_data', {})
        
        # Simulate sponsor analysis processing
        await asyncio.sleep(2)  # Simulate processing time
        
        # In degraded mode, use simplified analysis
        if self.feature_states.get('advanced_analytics') == FeatureState.DEGRADED:
            logger.info(f"Running simplified sponsor analysis for tenant {tenant_id}")
            analysis_result = {
                'sponsor_id': sponsor_data.get('id'),
                'tier': 'unknown',
                'engagement_score': 0.5,
                'simplified': True
            }
        else:
            logger.info(f"Running full sponsor analysis for tenant {tenant_id}")
            # Simulate complex analysis
            await asyncio.sleep(3)
            analysis_result = {
                'sponsor_id': sponsor_data.get('id'),
                'tier': 'tier-1',
                'engagement_score': 0.85,
                'funding_capacity': 'high',
                'relationship_strength': 0.9,
                'historical_grants': 12,
                'success_rate': 0.75
            }
        
        task.data['analysis_result'] = analysis_result
    
    async def _handle_grant_timeline(self, task: WorkflowTask):
        """Handle grant timeline analysis workflow task"""
        tenant_id = task.tenant_id
        grant_data = task.data.get('grant_data', {})
        
        logger.info(f"Processing grant timeline for tenant {tenant_id}")
        
        # Simulate timeline calculation
        await asyncio.sleep(1)
        
        submission_deadline = grant_data.get('submission_deadline')
        if submission_deadline:
            # Calculate backwards planning milestones
            timeline = {
                'submission_deadline': submission_deadline,
                'milestones': [
                    {'name': '90-day milestone', 'days_before': 90},
                    {'name': '60-day milestone', 'days_before': 60},
                    {'name': '30-day milestone', 'days_before': 30}
                ]
            }
        else:
            timeline = {'error': 'Missing submission deadline'}
        
        task.data['timeline_result'] = timeline
    
    async def _handle_relationship_mapping(self, task: WorkflowTask):
        """Handle relationship mapping workflow task"""
        tenant_id = task.tenant_id
        mapping_data = task.data.get('mapping_data', {})
        
        # Check if relationship mapping is enabled
        if self.feature_states.get('relationship_mapping') == FeatureState.DISABLED:
            raise Exception("Relationship mapping disabled due to resource constraints")
        
        logger.info(f"Processing relationship mapping for tenant {tenant_id}")
        
        if self.feature_states.get('relationship_mapping') == FeatureState.DEGRADED:
            # Simplified relationship mapping
            await asyncio.sleep(1)
            result = {
                'source': mapping_data.get('source'),
                'target': mapping_data.get('target'),
                'path_found': True,
                'path_length': 3,
                'simplified': True
            }
        else:
            # Full 7-degree relationship mapping
            await asyncio.sleep(5)  # Simulate complex graph traversal
            result = {
                'source': mapping_data.get('source'),
                'target': mapping_data.get('target'),
                'path_found': True,
                'path_length': 4,
                'intermediary_nodes': ['node1', 'node2', 'node3'],
                'relationship_strength': 0.7,
                'confidence_score': 0.85
            }
        
        task.data['mapping_result'] = result
    
    async def _handle_background_sync(self, task: WorkflowTask):
        """Handle background synchronization tasks"""
        tenant_id = task.tenant_id
        sync_data = task.data.get('sync_data', {})
        
        logger.info(f"Processing background sync for tenant {tenant_id}")
        
        # Simulate sync operation
        if self.feature_states.get('background_sync') == FeatureState.DEGRADED:
            await asyncio.sleep(0.5)  # Quick sync
        else:
            await asyncio.sleep(2)    # Full sync
        
        task.data['sync_result'] = {'status': 'completed', 'records_synced': 150}
    
    async def _handle_file_processing(self, task: WorkflowTask):
        """Handle file processing workflow task"""
        tenant_id = task.tenant_id
        file_data = task.data.get('file_data', {})
        
        if self.feature_states.get('file_processing') == FeatureState.DISABLED:
            raise Exception("File processing disabled due to resource constraints")
        
        logger.info(f"Processing file for tenant {tenant_id}")
        
        # Simulate file processing
        await asyncio.sleep(3)
        
        task.data['processing_result'] = {
            'file_id': file_data.get('file_id'),
            'records_processed': 200,
            'status': 'completed'
        }
    
    async def _monitor_resources(self):
        """Monitor system resources and update feature states"""
        while self.is_running:
            try:
                metrics = await self.resource_monitor.get_system_metrics()
                self.feature_states = await self.resource_monitor.determine_feature_states(metrics)
                
                # Store metrics history
                self.metrics_history.append({
                    'timestamp': datetime.utcnow(),
                    'metrics': metrics,
                    'feature_states': {k: v.value for k, v in self.feature_states.items()}
                })
                
                # Limit history size
                if len(self.metrics_history) > self.max_history:
                    self.metrics_history = self.metrics_history[-self.max_history:]
                
                # Log resource status periodically
                if int(time.time()) % 30 == 0:  # Every 30 seconds
                    disabled_features = [k for k, v in self.feature_states.items() 
                                       if v == FeatureState.DISABLED]
                    if disabled_features:
                        logger.warning(f"Disabled features: {disabled_features}")
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in resource monitoring: {e}")
                await asyncio.sleep(10)
    
    async def _cleanup_completed_tasks(self):
        """Clean up old completed tasks"""
        while self.is_running:
            try:
                # In a real implementation, this would clean up persistent storage
                await asyncio.sleep(300)  # Clean up every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in cleanup: {e}")
                await asyncio.sleep(60)
    
    def get_status(self) -> Dict[str, Any]:
        """Get current orchestration agent status"""
        return {
            'is_running': self.is_running,
            'queue_size': self.task_queue.qsize(),
            'running_tasks': len(self.running_tasks),
            'feature_states': {k: v.value for k, v in self.feature_states.items()},
            'worker_count': len([w for w in self.workers if not w.done()]),
            'last_metrics': self.metrics_history[-1] if self.metrics_history else None
        }
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of recent metrics"""
        if not self.metrics_history:
            return {}
        
        recent_metrics = self.metrics_history[-10:]  # Last 10 data points
        
        avg_cpu = sum(m['metrics']['cpu_percent'] for m in recent_metrics) / len(recent_metrics)
        avg_memory = sum(m['metrics']['memory_percent'] for m in recent_metrics) / len(recent_metrics)
        avg_app_memory = sum(m['metrics']['app_memory_percent'] for m in recent_metrics) / len(recent_metrics)
        
        return {
            'average_cpu_percent': round(avg_cpu, 2),
            'average_memory_percent': round(avg_memory, 2),
            'average_app_memory_percent': round(avg_app_memory, 2),
            'data_points': len(recent_metrics),
            'time_range': f"{recent_metrics[0]['timestamp']} to {recent_metrics[-1]['timestamp']}"
        }

# Factory functions for creating workflow tasks
def create_sponsor_analysis_task(tenant_id: str, sponsor_data: Dict[str, Any]) -> WorkflowTask:
    return WorkflowTask(
        task_id=f"sponsor-analysis-{int(time.time())}",
        task_type="sponsor_analysis",
        priority=TaskPriority.HIGH,
        tenant_id=tenant_id,
        data={'sponsor_data': sponsor_data}
    )

def create_grant_timeline_task(tenant_id: str, grant_data: Dict[str, Any]) -> WorkflowTask:
    return WorkflowTask(
        task_id=f"grant-timeline-{int(time.time())}",
        task_type="grant_timeline",
        priority=TaskPriority.MEDIUM,
        tenant_id=tenant_id,
        data={'grant_data': grant_data}
    )

def create_relationship_mapping_task(tenant_id: str, source: str, target: str) -> WorkflowTask:
    return WorkflowTask(
        task_id=f"relationship-mapping-{int(time.time())}",
        task_type="relationship_mapping",
        priority=TaskPriority.LOW,
        tenant_id=tenant_id,
        data={'mapping_data': {'source': source, 'target': target}}
    )

if __name__ == "__main__":
    async def main():
        # Example usage
        thresholds = ResourceThresholds(
            cpu_high=70.0,
            cpu_critical=85.0,
            memory_high=80.0,
            memory_critical=90.0
        )
        
        agent = OrchestrationAgent("postgresql://localhost/test", thresholds)
        
        try:
            await agent.start(num_workers=2)
            
            # Submit some test tasks
            sponsor_task = create_sponsor_analysis_task("tenant-1", {"id": "sponsor-123"})
            await agent.submit_task(sponsor_task)
            
            timeline_task = create_grant_timeline_task("tenant-1", {
                "id": "grant-456",
                "submission_deadline": "2024-12-31"
            })
            await agent.submit_task(timeline_task)
            
            # Run for a while
            await asyncio.sleep(30)
            
            print("Agent Status:", agent.get_status())
            print("Metrics Summary:", agent.get_metrics_summary())
            
        finally:
            await agent.stop()
    
    asyncio.run(main())