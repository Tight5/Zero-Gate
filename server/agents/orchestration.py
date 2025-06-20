"""
Asyncio-based Orchestration Agent for Zero Gate ESO Platform
Manages workflow tasks with intelligent resource monitoring and feature toggling
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import psutil
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class Priority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

class FeatureFlag(Enum):
    SPONSOR_ANALYSIS = "sponsor_analysis"
    GRANT_TIMELINE = "grant_timeline"
    RELATIONSHIP_MAPPING = "relationship_mapping"
    ADVANCED_ANALYTICS = "advanced_analytics"
    EXCEL_PROCESSING = "excel_processing"
    EMAIL_ANALYSIS = "email_analysis"

@dataclass
class ResourceThresholds:
    """Resource usage thresholds for feature management"""
    cpu_high: float = 80.0
    cpu_critical: float = 95.0
    memory_high: float = 85.0
    memory_critical: float = 95.0
    disk_high: float = 90.0
    disk_critical: float = 98.0

@dataclass
class WorkflowTask:
    """Individual workflow task definition"""
    id: str
    name: str
    workflow_type: str
    priority: Priority
    status: WorkflowStatus
    tenant_id: str
    payload: Dict[str, Any]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    estimated_duration: int = 300  # seconds
    dependencies: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []

@dataclass
class ResourceMetrics:
    """System resource utilization metrics"""
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_io: Dict[str, int]
    timestamp: datetime
    active_processes: int
    load_average: List[float]

class ResourceMonitor:
    """Intelligent resource monitoring with feature management"""
    
    def __init__(self, thresholds: ResourceThresholds):
        self.thresholds = thresholds
        self.enabled_features: Dict[FeatureFlag, bool] = {
            feature: True for feature in FeatureFlag
        }
        self.metrics_history: List[ResourceMetrics] = []
        self.monitoring_active = False
        self._monitor_task = None
        
    async def start_monitoring(self, interval: int = 30):
        """Start continuous resource monitoring"""
        self.monitoring_active = True
        self._monitor_task = asyncio.create_task(self._monitor_loop(interval))
        logger.info("Resource monitoring started")
        
    async def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring_active = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Resource monitoring stopped")
        
    async def _monitor_loop(self, interval: int):
        """Continuous monitoring loop"""
        while self.monitoring_active:
            try:
                metrics = await self._collect_metrics()
                self.metrics_history.append(metrics)
                
                # Keep only last 100 metrics entries
                if len(self.metrics_history) > 100:
                    self.metrics_history = self.metrics_history[-100:]
                
                await self._evaluate_feature_toggles(metrics)
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(interval)
    
    async def _collect_metrics(self) -> ResourceMetrics:
        """Collect current system resource metrics"""
        def get_sync_metrics():
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()._asdict()
            load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            active_processes = len(psutil.pids())
            
            return ResourceMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=disk.percent,
                network_io=network,
                timestamp=datetime.now(),
                active_processes=active_processes,
                load_average=load_avg
            )
        
        # Run CPU-intensive operations in thread pool
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            metrics = await loop.run_in_executor(executor, get_sync_metrics)
            
        return metrics
    
    async def _evaluate_feature_toggles(self, metrics: ResourceMetrics):
        """Evaluate and toggle features based on resource usage"""
        cpu_high = metrics.cpu_percent > self.thresholds.cpu_high
        cpu_critical = metrics.cpu_percent > self.thresholds.cpu_critical
        memory_high = metrics.memory_percent > self.thresholds.memory_high
        memory_critical = metrics.memory_percent > self.thresholds.memory_critical
        
        # Critical resource usage - disable all non-essential features
        if cpu_critical or memory_critical:
            await self._disable_non_essential_features()
            logger.warning(f"Critical resources: CPU {metrics.cpu_percent}%, Memory {metrics.memory_percent}%")
            
        # High resource usage - disable resource-intensive features
        elif cpu_high or memory_high:
            await self._disable_intensive_features()
            logger.info(f"High resources: CPU {metrics.cpu_percent}%, Memory {metrics.memory_percent}%")
            
        # Normal resource usage - re-enable features
        else:
            await self._enable_standard_features()
    
    async def _disable_non_essential_features(self):
        """Disable non-essential features during critical resource usage"""
        features_to_disable = [
            FeatureFlag.ADVANCED_ANALYTICS,
            FeatureFlag.EXCEL_PROCESSING,
            FeatureFlag.EMAIL_ANALYSIS,
            FeatureFlag.RELATIONSHIP_MAPPING
        ]
        
        for feature in features_to_disable:
            if self.enabled_features[feature]:
                self.enabled_features[feature] = False
                logger.warning(f"Disabled feature: {feature.value}")
    
    async def _disable_intensive_features(self):
        """Disable resource-intensive features during high usage"""
        features_to_disable = [
            FeatureFlag.ADVANCED_ANALYTICS,
            FeatureFlag.EXCEL_PROCESSING
        ]
        
        for feature in features_to_disable:
            if self.enabled_features[feature]:
                self.enabled_features[feature] = False
                logger.info(f"Disabled intensive feature: {feature.value}")
    
    async def _enable_standard_features(self):
        """Re-enable standard features when resources are available"""
        standard_features = [
            FeatureFlag.SPONSOR_ANALYSIS,
            FeatureFlag.GRANT_TIMELINE,
            FeatureFlag.RELATIONSHIP_MAPPING
        ]
        
        for feature in standard_features:
            if not self.enabled_features[feature]:
                self.enabled_features[feature] = True
                logger.info(f"Enabled feature: {feature.value}")
    
    def is_feature_enabled(self, feature: FeatureFlag) -> bool:
        """Check if a feature is currently enabled"""
        return self.enabled_features.get(feature, False)
    
    def get_current_metrics(self) -> Optional[ResourceMetrics]:
        """Get the most recent resource metrics"""
        return self.metrics_history[-1] if self.metrics_history else None

class WorkflowQueue:
    """Priority-based workflow task queue with dependency management"""
    
    def __init__(self):
        self.tasks: Dict[str, WorkflowTask] = {}
        self.pending_queue = asyncio.PriorityQueue()
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self.completed_tasks: List[str] = []
        self.failed_tasks: List[str] = []
        
    async def add_task(self, task: WorkflowTask):
        """Add a task to the workflow queue"""
        self.tasks[task.id] = task
        
        # Check if dependencies are satisfied
        if await self._dependencies_satisfied(task):
            # Add to priority queue (negative priority for max-heap behavior)
            await self.pending_queue.put((-task.priority.value, task.created_at, task.id))
            logger.info(f"Added task to queue: {task.name} (ID: {task.id})")
        else:
            logger.info(f"Task {task.name} waiting for dependencies: {task.dependencies}")
    
    async def _dependencies_satisfied(self, task: WorkflowTask) -> bool:
        """Check if all task dependencies are completed"""
        for dep_id in task.dependencies:
            if dep_id not in self.completed_tasks:
                return False
        return True
    
    async def get_next_task(self) -> Optional[WorkflowTask]:
        """Get the next highest priority task from the queue"""
        try:
            _, _, task_id = await asyncio.wait_for(self.pending_queue.get(), timeout=1.0)
            task = self.tasks.get(task_id)
            if task and task.status == WorkflowStatus.PENDING:
                return task
        except asyncio.TimeoutError:
            pass
        return None
    
    async def mark_completed(self, task_id: str):
        """Mark a task as completed and check for dependent tasks"""
        if task_id in self.tasks:
            self.tasks[task_id].status = WorkflowStatus.COMPLETED
            self.tasks[task_id].completed_at = datetime.now()
            self.completed_tasks.append(task_id)
            
            # Check for tasks waiting on this dependency
            await self._check_dependent_tasks(task_id)
            
            logger.info(f"Task completed: {task_id}")
    
    async def mark_failed(self, task_id: str, error_message: str):
        """Mark a task as failed"""
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.status = WorkflowStatus.FAILED
            task.error_message = error_message
            task.completed_at = datetime.now()
            self.failed_tasks.append(task_id)
            
            logger.error(f"Task failed: {task_id} - {error_message}")
    
    async def _check_dependent_tasks(self, completed_task_id: str):
        """Check for tasks that were waiting on the completed task"""
        for task in self.tasks.values():
            if (task.status == WorkflowStatus.PENDING and 
                completed_task_id in task.dependencies and
                await self._dependencies_satisfied(task)):
                await self.pending_queue.put((-task.priority.value, task.created_at, task.id))

class OrchestrationAgent:
    """Main orchestration agent managing workflow execution"""
    
    def __init__(self, max_concurrent_tasks: int = 5):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.resource_monitor = ResourceMonitor(ResourceThresholds())
        self.workflow_queue = WorkflowQueue()
        self.workflow_handlers: Dict[str, Callable] = {}
        self.running = False
        self.stats = {
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
            'average_execution_time': 0,
            'uptime_start': None
        }
        
        # Register default workflow handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default workflow handlers"""
        self.workflow_handlers.update({
            'sponsor_analysis': self._handle_sponsor_analysis,
            'grant_timeline': self._handle_grant_timeline,
            'relationship_mapping': self._handle_relationship_mapping,
            'email_analysis': self._handle_email_analysis,
            'excel_processing': self._handle_excel_processing
        })
    
    async def start(self):
        """Start the orchestration agent"""
        if self.running:
            logger.warning("Orchestration agent is already running")
            return
            
        self.running = True
        self.stats['uptime_start'] = datetime.now()
        
        # Start resource monitoring
        await self.resource_monitor.start_monitoring(interval=30)
        
        # Start main execution loop
        asyncio.create_task(self._execution_loop())
        
        logger.info("Orchestration agent started")
    
    async def stop(self):
        """Stop the orchestration agent"""
        self.running = False
        await self.resource_monitor.stop_monitoring()
        
        # Cancel running tasks
        for task_id, task in self.workflow_queue.running_tasks.items():
            task.cancel()
            logger.info(f"Cancelled running task: {task_id}")
        
        logger.info("Orchestration agent stopped")
    
    async def _execution_loop(self):
        """Main execution loop for processing workflow tasks"""
        while self.running:
            try:
                # Check if we can start new tasks
                current_running = len(self.workflow_queue.running_tasks)
                if current_running < self.max_concurrent_tasks:
                    
                    # Get next task from queue
                    workflow_task = await self.workflow_queue.get_next_task()
                    if workflow_task:
                        # Check if the required feature is enabled
                        feature_map = {
                            'sponsor_analysis': FeatureFlag.SPONSOR_ANALYSIS,
                            'grant_timeline': FeatureFlag.GRANT_TIMELINE,
                            'relationship_mapping': FeatureFlag.RELATIONSHIP_MAPPING,
                            'email_analysis': FeatureFlag.EMAIL_ANALYSIS,
                            'excel_processing': FeatureFlag.EXCEL_PROCESSING
                        }
                        
                        required_feature = feature_map.get(workflow_task.workflow_type)
                        if required_feature and not self.resource_monitor.is_feature_enabled(required_feature):
                            # Postpone task if feature is disabled due to resource constraints
                            logger.info(f"Postponing task {workflow_task.id} - feature {required_feature.value} disabled")
                            await asyncio.sleep(30)  # Wait before checking again
                            continue
                        
                        # Execute task
                        task_coroutine = self._execute_task(workflow_task)
                        asyncio_task = asyncio.create_task(task_coroutine)
                        self.workflow_queue.running_tasks[workflow_task.id] = asyncio_task
                        
                        workflow_task.status = WorkflowStatus.RUNNING
                        workflow_task.started_at = datetime.now()
                        
                        logger.info(f"Started executing task: {workflow_task.name}")
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in execution loop: {e}")
                await asyncio.sleep(10)
    
    async def _execute_task(self, workflow_task: WorkflowTask):
        """Execute a single workflow task"""
        try:
            handler = self.workflow_handlers.get(workflow_task.workflow_type)
            if not handler:
                raise ValueError(f"No handler found for workflow type: {workflow_task.workflow_type}")
            
            # Execute the workflow handler
            result = await handler(workflow_task)
            
            # Mark task as completed
            await self.workflow_queue.mark_completed(workflow_task.id)
            
            # Update statistics
            self.stats['completed_tasks'] += 1
            execution_time = (datetime.now() - workflow_task.started_at).total_seconds()
            self._update_average_execution_time(execution_time)
            
            # Remove from running tasks
            if workflow_task.id in self.workflow_queue.running_tasks:
                del self.workflow_queue.running_tasks[workflow_task.id]
            
            logger.info(f"Task execution completed: {workflow_task.name}")
            return result
            
        except Exception as e:
            # Handle task failure
            error_message = str(e)
            await self.workflow_queue.mark_failed(workflow_task.id, error_message)
            
            # Update statistics
            self.stats['failed_tasks'] += 1
            
            # Remove from running tasks
            if workflow_task.id in self.workflow_queue.running_tasks:
                del self.workflow_queue.running_tasks[workflow_task.id]
            
            # Retry logic
            if workflow_task.retry_count < workflow_task.max_retries:
                workflow_task.retry_count += 1
                workflow_task.status = WorkflowStatus.PENDING
                await self.workflow_queue.add_task(workflow_task)
                logger.info(f"Retrying task: {workflow_task.name} (attempt {workflow_task.retry_count})")
            else:
                logger.error(f"Task failed permanently: {workflow_task.name} - {error_message}")
    
    def _update_average_execution_time(self, execution_time: float):
        """Update running average of execution times"""
        total_completed = self.stats['completed_tasks']
        current_avg = self.stats['average_execution_time']
        self.stats['average_execution_time'] = ((current_avg * (total_completed - 1)) + execution_time) / total_completed
    
    async def submit_workflow(self, workflow_type: str, tenant_id: str, payload: Dict[str, Any], 
                            priority: Priority = Priority.MEDIUM, dependencies: List[str] = None) -> str:
        """Submit a new workflow task"""
        task_id = f"{workflow_type}_{tenant_id}_{int(time.time() * 1000)}"
        
        task = WorkflowTask(
            id=task_id,
            name=f"{workflow_type.replace('_', ' ').title()}",
            workflow_type=workflow_type,
            priority=priority,
            status=WorkflowStatus.PENDING,
            tenant_id=tenant_id,
            payload=payload,
            created_at=datetime.now(),
            dependencies=dependencies or []
        )
        
        await self.workflow_queue.add_task(task)
        self.stats['total_tasks'] += 1
        
        logger.info(f"Submitted workflow: {workflow_type} for tenant {tenant_id}")
        return task_id
    
    def register_workflow_handler(self, workflow_type: str, handler: Callable):
        """Register a custom workflow handler"""
        self.workflow_handlers[workflow_type] = handler
        logger.info(f"Registered workflow handler: {workflow_type}")
    
    async def get_workflow_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific workflow task"""
        task = self.workflow_queue.tasks.get(task_id)
        if task:
            return {
                'id': task.id,
                'name': task.name,
                'status': task.status.value,
                'progress': self._calculate_progress(task),
                'created_at': task.created_at.isoformat(),
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'error_message': task.error_message,
                'retry_count': task.retry_count
            }
        return None
    
    def _calculate_progress(self, task: WorkflowTask) -> float:
        """Calculate task progress percentage"""
        if task.status == WorkflowStatus.COMPLETED:
            return 100.0
        elif task.status == WorkflowStatus.FAILED:
            return 0.0
        elif task.status == WorkflowStatus.RUNNING and task.started_at:
            elapsed = (datetime.now() - task.started_at).total_seconds()
            return min(90.0, (elapsed / task.estimated_duration) * 100.0)
        return 0.0
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        current_metrics = self.resource_monitor.get_current_metrics()
        
        return {
            'agent_status': 'running' if self.running else 'stopped',
            'uptime': (datetime.now() - self.stats['uptime_start']).total_seconds() if self.stats['uptime_start'] else 0,
            'statistics': self.stats,
            'queue_status': {
                'pending_tasks': self.workflow_queue.pending_queue.qsize(),
                'running_tasks': len(self.workflow_queue.running_tasks),
                'completed_tasks': len(self.workflow_queue.completed_tasks),
                'failed_tasks': len(self.workflow_queue.failed_tasks)
            },
            'resource_metrics': asdict(current_metrics) if current_metrics else None,
            'enabled_features': {flag.value: enabled for flag, enabled in self.resource_monitor.enabled_features.items()},
            'max_concurrent_tasks': self.max_concurrent_tasks
        }
    
    # Default workflow handlers
    async def _handle_sponsor_analysis(self, task: WorkflowTask) -> Dict[str, Any]:
        """Handle sponsor analysis workflow"""
        payload = task.payload
        sponsor_id = payload.get('sponsor_id')
        
        logger.info(f"Processing sponsor analysis for sponsor: {sponsor_id}")
        
        # Simulate sponsor analysis processing
        await asyncio.sleep(2)  # Simulate processing time
        
        return {
            'sponsor_id': sponsor_id,
            'analysis_completed': True,
            'metrics': {
                'relationship_strength': 85,
                'funding_probability': 0.7,
                'response_time_days': 14,
                'influence_score': 92
            },
            'recommendations': [
                'Schedule follow-up meeting within 2 weeks',
                'Prepare detailed project proposal',
                'Include sustainability metrics'
            ]
        }
    
    async def _handle_grant_timeline(self, task: WorkflowTask) -> Dict[str, Any]:
        """Handle grant timeline workflow"""
        payload = task.payload
        grant_id = payload.get('grant_id')
        
        logger.info(f"Processing grant timeline for grant: {grant_id}")
        
        # Simulate timeline processing
        await asyncio.sleep(3)
        
        return {
            'grant_id': grant_id,
            'timeline_generated': True,
            'milestones': [
                {
                    'milestone': '90-day checkpoint',
                    'due_date': (datetime.now() + timedelta(days=90)).isoformat(),
                    'tasks': ['Research completion', 'Partner identification', 'Budget finalization']
                },
                {
                    'milestone': '60-day checkpoint',
                    'due_date': (datetime.now() + timedelta(days=60)).isoformat(),
                    'tasks': ['Proposal draft', 'Stakeholder review', 'Technical specifications']
                },
                {
                    'milestone': '30-day checkpoint',
                    'due_date': (datetime.now() + timedelta(days=30)).isoformat(),
                    'tasks': ['Final review', 'Submission preparation', 'Quality assurance']
                }
            ],
            'risk_assessment': 'Medium',
            'completion_probability': 0.8
        }
    
    async def _handle_relationship_mapping(self, task: WorkflowTask) -> Dict[str, Any]:
        """Handle relationship mapping workflow"""
        payload = task.payload
        source_entity = payload.get('source_entity')
        target_entity = payload.get('target_entity')
        
        logger.info(f"Processing relationship mapping: {source_entity} -> {target_entity}")
        
        # Simulate relationship analysis
        await asyncio.sleep(4)
        
        return {
            'source_entity': source_entity,
            'target_entity': target_entity,
            'mapping_completed': True,
            'path_analysis': {
                'shortest_path_length': 3,
                'path_confidence': 0.85,
                'intermediate_connections': [
                    'Microsoft Foundation',
                    'Tech Innovation Hub'
                ],
                'relationship_strength': 'Strong'
            },
            'network_metrics': {
                'centrality_score': 0.78,
                'influence_radius': 5,
                'connection_quality': 'High'
            }
        }
    
    async def _handle_email_analysis(self, task: WorkflowTask) -> Dict[str, Any]:
        """Handle email analysis workflow"""
        payload = task.payload
        email_batch_id = payload.get('email_batch_id')
        
        logger.info(f"Processing email analysis for batch: {email_batch_id}")
        
        # Simulate email processing
        await asyncio.sleep(5)
        
        return {
            'email_batch_id': email_batch_id,
            'analysis_completed': True,
            'processed_emails': 156,
            'relationship_updates': 23,
            'sentiment_analysis': {
                'positive': 78,
                'neutral': 67,
                'negative': 11
            },
            'key_insights': [
                'Increased engagement from tech sector sponsors',
                'Growing interest in sustainability projects',
                'Need for more detailed funding timelines'
            ]
        }
    
    async def _handle_excel_processing(self, task: WorkflowTask) -> Dict[str, Any]:
        """Handle Excel file processing workflow"""
        payload = task.payload
        file_path = payload.get('file_path')
        processing_type = payload.get('processing_type', 'data_extraction')
        
        logger.info(f"Processing Excel file: {file_path}")
        
        # Simulate Excel processing
        await asyncio.sleep(3)
        
        return {
            'file_path': file_path,
            'processing_type': processing_type,
            'processing_completed': True,
            'extracted_records': 245,
            'data_quality_score': 0.92,
            'identified_entities': {
                'sponsors': 45,
                'grants': 78,
                'relationships': 156
            },
            'validation_results': {
                'valid_records': 239,
                'invalid_records': 6,
                'duplicate_records': 12
            }
        }

# Global orchestration agent instance
orchestration_agent = OrchestrationAgent()

async def initialize_orchestration():
    """Initialize the orchestration agent"""
    await orchestration_agent.start()
    return orchestration_agent

async def shutdown_orchestration():
    """Shutdown the orchestration agent"""
    await orchestration_agent.stop()

if __name__ == "__main__":
    # Example usage
    async def main():
        # Initialize orchestration agent
        agent = await initialize_orchestration()
        
        # Submit some example workflows
        task1_id = await agent.submit_workflow(
            'sponsor_analysis',
            'nasdaq-center',
            {'sponsor_id': 'microsoft-foundation'},
            Priority.HIGH
        )
        
        task2_id = await agent.submit_workflow(
            'grant_timeline',
            'nasdaq-center',
            {'grant_id': 'tech-innovation-2025'},
            Priority.MEDIUM
        )
        
        task3_id = await agent.submit_workflow(
            'relationship_mapping',
            'nasdaq-center',
            {
                'source_entity': 'nasdaq-foundation',
                'target_entity': 'community-tech-center'
            },
            Priority.MEDIUM,
            dependencies=[task1_id]  # Depends on sponsor analysis
        )
        
        # Wait for some processing
        await asyncio.sleep(30)
        
        # Check system status
        status = await agent.get_system_status()
        print(f"System Status: {json.dumps(status, indent=2, default=str)}")
        
        # Shutdown
        await shutdown_orchestration()
    
    asyncio.run(main())