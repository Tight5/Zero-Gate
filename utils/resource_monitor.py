"""
Resource monitoring for Zero Gate ESO Platform
Optimized for Replit environment constraints
"""
import psutil
import threading
import time
import logging
from typing import Dict, Any

logger = logging.getLogger("zero-gate.monitoring")

class ResourceMonitor:
    def __init__(self, cpu_threshold: int = 65, memory_threshold: int = 70):
        self.cpu_threshold = cpu_threshold
        self.memory_threshold = memory_threshold
        self.current_usage = {
            "cpu": 0.0,
            "memory": 0.0,
            "disk": 0.0
        }
        self.feature_flags = {
            "advanced_analytics": True,
            "relationship_mapping": True,
            "excel_dashboard": True,
            "content_generation": True
        }
        self.running = False
        self.thread = None
        
    def start(self):
        """Start resource monitoring in background thread"""
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        logger.info("Resource monitoring started")
        
    def stop(self):
        """Stop resource monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Resource monitoring stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                # Get current resource usage
                cpu_usage = psutil.cpu_percent(interval=1)
                memory_usage = psutil.virtual_memory().percent
                disk_usage = psutil.disk_usage('/').percent
                
                self.current_usage.update({
                    "cpu": cpu_usage,
                    "memory": memory_usage,
                    "disk": disk_usage
                })
                
                # Update feature flags based on resource usage
                self._update_feature_flags(cpu_usage, memory_usage)
                
                # Log warnings for high usage
                if cpu_usage > self.cpu_threshold or memory_usage > self.memory_threshold:
                    logger.warning(
                        f"High resource usage - CPU: {cpu_usage}%, Memory: {memory_usage}%"
                    )
                
                time.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in resource monitoring: {str(e)}")
                time.sleep(10)
    
    def _update_feature_flags(self, cpu_usage: float, memory_usage: float):
        """Update feature flags based on current resource usage"""
        # Moderate usage - disable advanced analytics
        if cpu_usage > self.cpu_threshold or memory_usage > self.memory_threshold:
            self.feature_flags["advanced_analytics"] = False
            logger.info("Advanced analytics disabled due to resource constraints")
        else:
            self.feature_flags["advanced_analytics"] = True
        
        # High usage - disable more features
        if cpu_usage > 80 or memory_usage > 85:
            self.feature_flags["relationship_mapping"] = False
            self.feature_flags["content_generation"] = False
            logger.warning("Additional features disabled due to high resource usage")
        elif cpu_usage < 70 and memory_usage < 75:
            self.feature_flags["relationship_mapping"] = True
            self.feature_flags["content_generation"] = True
        
        # Critical usage - only core features
        if cpu_usage > 90 or memory_usage > 95:
            self.feature_flags = {key: False for key in self.feature_flags}
            self.feature_flags["core_operations"] = True
            logger.critical("System under extreme load - only core operations enabled")
    
    def get_current_usage(self) -> Dict[str, float]:
        """Get current resource usage"""
        return self.current_usage.copy()
    
    def get_enabled_features(self) -> Dict[str, bool]:
        """Get current feature flags"""
        return self.feature_flags.copy()
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a specific feature is enabled"""
        return self.feature_flags.get(feature, False)
    
    def force_feature_state(self, feature: str, enabled: bool):
        """Force a feature to be enabled or disabled"""
        self.feature_flags[feature] = enabled
        logger.info(f"Feature {feature} {'enabled' if enabled else 'disabled'} manually")