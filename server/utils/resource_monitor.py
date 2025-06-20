"""
Resource monitoring for Zero Gate ESO Platform
Enhanced for 70% memory threshold compliance per attached asset specifications
"""
import psutil
import threading
import time
import logging
import gc
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger("zero-gate.monitoring")

class ResourceMonitor:
    def __init__(self, cpu_threshold: int = 65, memory_threshold: int = 70):
        """Initialize ResourceMonitor with 70% memory threshold per specifications"""
        self.cpu_threshold = cpu_threshold
        self.memory_threshold = memory_threshold  # 70% per File 45 specifications
        
        self.current_usage = {
            "cpu": 0.0,
            "memory": 0.0,
            "disk": 0.0,
            "timestamp": datetime.now()
        }
        
        # Feature flags per File 7 specifications
        self.feature_flags = {
            "advanced_analytics": True,
            "relationship_mapping": True,
            "excel_processing": True,
            "content_generation": True,
            "background_sync": True,
            "real_time_updates": True,
            "microsoft_integration": True
        }
        
        self.running = False
        self.thread = None
        self.alert_history = []
        self.compliance_violations = 0
        
        # Emergency thresholds per memory crisis specifications
        self.emergency_thresholds = {
            "memory_warning": 75,    # Disable non-essential features
            "memory_critical": 85,   # Disable most features
            "memory_emergency": 90   # Only core operations
        }
        
    def start(self):
        """Start resource monitoring with 70% compliance tracking"""
        self.running = True
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        logger.info(f"Resource monitoring started - Memory threshold: {self.memory_threshold}%")
        
    def stop(self):
        """Stop resource monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Resource monitoring stopped")
        
    def _monitor_loop(self):
        """Enhanced monitoring loop with 70% compliance"""
        while self.running:
            try:
                # Get current resource usage
                cpu_usage = psutil.cpu_percent(interval=1)
                memory_usage = psutil.virtual_memory().percent
                disk_usage = psutil.disk_usage('/').percent
                
                self.current_usage.update({
                    "cpu": cpu_usage,
                    "memory": memory_usage,
                    "disk": disk_usage,
                    "timestamp": datetime.now()
                })
                
                # Track compliance violations
                if memory_usage > self.memory_threshold:
                    self.compliance_violations += 1
                    logger.warning(f"Memory compliance violation #{self.compliance_violations}: {memory_usage:.1f}% > {self.memory_threshold}%")
                
                # Update feature flags based on enhanced thresholds
                self._update_feature_flags_enhanced(cpu_usage, memory_usage)
                
                # Trigger emergency actions if needed
                self._handle_emergency_conditions(memory_usage)
                
                # Log compliance status
                compliance_status = "COMPLIANT" if memory_usage <= self.memory_threshold else "VIOLATION"
                logger.info(f"Memory Compliance: {memory_usage:.1f}% ({compliance_status}) | Features: {sum(self.feature_flags.values())}/7 enabled")
                
                time.sleep(5)  # Check every 5 seconds per specifications
                
            except Exception as e:
                logger.error(f"Error in resource monitoring: {str(e)}")
                time.sleep(10)
    
    def _update_feature_flags_enhanced(self, cpu_usage: float, memory_usage: float):
        """Enhanced feature flag management with 70% threshold compliance"""
        
        # Reset all features if below threshold (compliance mode)
        if memory_usage <= self.memory_threshold and cpu_usage <= self.cpu_threshold:
            self.feature_flags = {
                "advanced_analytics": True,
                "relationship_mapping": True,
                "excel_processing": True,
                "content_generation": True,
                "background_sync": True,
                "real_time_updates": True,
                "microsoft_integration": True
            }
            return
        
        # Warning level (75-85%) - Disable memory-intensive features
        if memory_usage > self.emergency_thresholds["memory_warning"]:
            self.feature_flags.update({
                "advanced_analytics": False,
                "excel_processing": False,
                "background_sync": False
            })
            logger.warning(f"Memory warning level: {memory_usage:.1f}% - Disabled analytics, Excel processing, background sync")
        
        # Critical level (85-90%) - Only essential features
        if memory_usage > self.emergency_thresholds["memory_critical"]:
            self.feature_flags.update({
                "relationship_mapping": False,
                "content_generation": False,
                "real_time_updates": False
            })
            logger.critical(f"Memory critical level: {memory_usage:.1f}% - Only core features enabled")
        
        # Emergency level (90%+) - Core operations only
        if memory_usage > self.emergency_thresholds["memory_emergency"]:
            self.feature_flags = {key: False for key in self.feature_flags}
            logger.critical(f"Memory emergency level: {memory_usage:.1f}% - All features disabled")
            
            # Force garbage collection
            gc.collect()
            logger.info("Emergency garbage collection triggered")
    
    def _handle_emergency_conditions(self, memory_usage: float):
        """Handle emergency memory conditions per memory crisis specifications"""
        
        if memory_usage > 90:
            # Emergency actions per memory management requirements
            try:
                # Force garbage collection
                gc.collect()
                
                # Alert for immediate intervention
                alert = {
                    "timestamp": datetime.now(),
                    "level": "EMERGENCY",
                    "memory_usage": memory_usage,
                    "action": "Garbage collection triggered, all features disabled"
                }
                self.alert_history.append(alert)
                
                # Keep only last 50 alerts
                if len(self.alert_history) > 50:
                    self.alert_history = self.alert_history[-50:]
                
                logger.critical(f"EMERGENCY: Memory at {memory_usage:.1f}% - Immediate intervention required")
                
            except Exception as e:
                logger.error(f"Emergency handling failed: {str(e)}")
    
    def get_current_usage(self) -> Dict[str, Any]:
        """Get current resource usage with compliance status"""
        usage = self.current_usage.copy()
        usage["compliance_status"] = "COMPLIANT" if usage["memory"] <= self.memory_threshold else "VIOLATION"
        usage["violations_count"] = self.compliance_violations
        return usage
    
    def get_enabled_features(self) -> Dict[str, bool]:
        """Get current feature flags"""
        return self.feature_flags.copy()
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a specific feature is enabled"""
        return self.feature_flags.get(feature, False)
    
    def force_feature_state(self, feature: str, enabled: bool):
        """Force a feature to be enabled or disabled"""
        if feature in self.feature_flags:
            self.feature_flags[feature] = enabled
            logger.info(f"Feature {feature} {'enabled' if enabled else 'disabled'} manually")
        else:
            logger.warning(f"Unknown feature: {feature}")
    
    def get_compliance_report(self) -> Dict[str, Any]:
        """Generate compliance report per attached asset specifications"""
        current = self.get_current_usage()
        
        return {
            "compliance_status": current["compliance_status"],
            "current_memory": current["memory"],
            "threshold": self.memory_threshold,
            "violations_count": self.compliance_violations,
            "enabled_features": sum(self.feature_flags.values()),
            "total_features": len(self.feature_flags),
            "last_check": current["timestamp"].isoformat(),
            "alert_history": self.alert_history[-10:],  # Last 10 alerts
            "recommendations": self._generate_recommendations(current["memory"])
        }
    
    def _generate_recommendations(self, memory_usage: float) -> list:
        """Generate recommendations based on current memory usage"""
        recommendations = []
        
        if memory_usage > 90:
            recommendations.extend([
                "CRITICAL: Restart application immediately",
                "Clear all caches and temporary data",
                "Disable all non-essential features"
            ])
        elif memory_usage > 85:
            recommendations.extend([
                "Reduce dashboard refresh intervals",
                "Clear query cache",
                "Disable advanced analytics"
            ])
        elif memory_usage > self.memory_threshold:
            recommendations.extend([
                "Monitor memory usage closely",
                "Consider disabling Excel processing",
                "Reduce background sync frequency"
            ])
        else:
            recommendations.append("Memory usage within compliance threshold")
        
        return recommendations
    
    def reset_compliance_violations(self):
        """Reset compliance violation counter"""
        self.compliance_violations = 0
        logger.info("Compliance violation counter reset")

# Global resource monitor instance
resource_monitor: Optional[ResourceMonitor] = None

def get_resource_monitor() -> ResourceMonitor:
    """Get or create global resource monitor instance"""
    global resource_monitor
    if resource_monitor is None:
        resource_monitor = ResourceMonitor(cpu_threshold=65, memory_threshold=70)
    return resource_monitor

def start_monitoring():
    """Start global resource monitoring"""
    monitor = get_resource_monitor()
    if not monitor.running:
        monitor.start()
    return monitor

def stop_monitoring():
    """Stop global resource monitoring"""
    global resource_monitor
    if resource_monitor and resource_monitor.running:
        resource_monitor.stop()

def is_compliant() -> bool:
    """Check if system is currently memory compliant"""
    monitor = get_resource_monitor()
    current = monitor.get_current_usage()
    return current["memory"] <= monitor.memory_threshold

def get_compliance_status() -> Dict[str, Any]:
    """Get current compliance status"""
    monitor = get_resource_monitor()
    return monitor.get_compliance_report()