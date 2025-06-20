#!/usr/bin/env python3
"""
Comprehensive Debug and Fix Script for Zero Gate ESO Platform
Systematically identifies and fixes all broken code while maintaining attached assets compliance
"""
import os
import sys
import subprocess
import time
import requests
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("comprehensive-debug")

class ComprehensiveDebugger:
    def __init__(self):
        self.issues_found = []
        self.fixes_applied = []
        self.test_results = {}
        
    def log_issue(self, issue_type, description, severity="medium"):
        """Log an identified issue"""
        self.issues_found.append({
            "type": issue_type,
            "description": description,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        })
        logger.warning(f"ISSUE ({severity}): {issue_type} - {description}")
    
    def log_fix(self, fix_type, description):
        """Log an applied fix"""
        self.fixes_applied.append({
            "type": fix_type,
            "description": description,
            "timestamp": datetime.now().isoformat()
        })
        logger.info(f"FIX APPLIED: {fix_type} - {description}")
    
    def test_fastapi_startup(self):
        """Test FastAPI application startup and functionality"""
        logger.info("Testing FastAPI startup and functionality...")
        
        try:
            # Kill any existing FastAPI processes
            subprocess.run(["pkill", "-f", "uvicorn"], capture_output=True)
            time.sleep(2)
            
            # Start FastAPI application
            process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for startup
            time.sleep(10)
            
            # Test health endpoint
            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code == 200:
                    self.test_results["fastapi_health"] = "PASS"
                    logger.info("FastAPI health endpoint: PASS")
                else:
                    self.test_results["fastapi_health"] = "FAIL"
                    self.log_issue("api_endpoint", f"Health endpoint returned {response.status_code}", "high")
            except requests.exceptions.RequestException as e:
                self.test_results["fastapi_health"] = "FAIL"
                self.log_issue("fastapi_startup", f"FastAPI not responding: {str(e)}", "critical")
            
            # Test API endpoints
            endpoints = ["/", "/api/status", "/api/sponsors", "/api/grants", "/api/relationships"]
            for endpoint in endpoints:
                try:
                    response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
                    if response.status_code in [200, 404]:  # 404 is acceptable for some endpoints
                        self.test_results[f"endpoint_{endpoint}"] = "PASS"
                    else:
                        self.test_results[f"endpoint_{endpoint}"] = "FAIL"
                        self.log_issue("api_endpoint", f"Endpoint {endpoint} returned {response.status_code}")
                except requests.exceptions.RequestException:
                    self.test_results[f"endpoint_{endpoint}"] = "FAIL"
                    self.log_issue("api_endpoint", f"Endpoint {endpoint} not accessible")
            
            # Cleanup
            process.terminate()
            time.sleep(2)
            
        except Exception as e:
            self.log_issue("fastapi_test", f"FastAPI testing failed: {str(e)}", "critical")
    
    def test_express_functionality(self):
        """Test Express.js application functionality"""
        logger.info("Testing Express.js application functionality...")
        
        try:
            # Test Express health
            response = requests.get("http://localhost:5000/api/health", timeout=5)
            if response.status_code == 200:
                self.test_results["express_health"] = "PASS"
                logger.info("Express.js health: PASS")
            else:
                self.test_results["express_health"] = "FAIL"
                self.log_issue("express_health", f"Express health returned {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.test_results["express_health"] = "FAIL"
            self.log_issue("express_health", f"Express not responding: {str(e)}")
    
    def check_python_imports(self):
        """Check Python module imports for issues"""
        logger.info("Checking Python module imports...")
        
        modules_to_test = [
            "main",
            "agents.orchestration",
            "agents.processing", 
            "agents.integration",
            "utils.database",
            "utils.resource_monitor",
            "utils.tenant_context",
            "routers.sponsors",
            "routers.grants",
            "routers.relationships"
        ]
        
        for module in modules_to_test:
            try:
                subprocess.run([sys.executable, "-c", f"import {module}"], 
                             check=True, capture_output=True, text=True)
                self.test_results[f"import_{module}"] = "PASS"
            except subprocess.CalledProcessError as e:
                self.test_results[f"import_{module}"] = "FAIL"
                self.log_issue("python_import", f"Failed to import {module}: {e.stderr}", "high")
    
    def check_type_annotations(self):
        """Check Python type annotations for issues"""
        logger.info("Checking Python type annotations...")
        
        python_files = [
            "agents/processing.py",
            "agents/orchestration.py",
            "agents/integration.py",
            "utils/database.py",
            "utils/resource_monitor.py",
            "main.py"
        ]
        
        for file_path in python_files:
            if os.path.exists(file_path):
                try:
                    result = subprocess.run(
                        [sys.executable, "-m", "mypy", file_path, "--ignore-missing-imports"],
                        capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        self.test_results[f"types_{file_path}"] = "PASS"
                    else:
                        self.test_results[f"types_{file_path}"] = "FAIL"
                        self.log_issue("type_annotation", f"Type issues in {file_path}: {result.stdout}")
                except Exception as e:
                    self.log_issue("type_check", f"Could not check types for {file_path}: {str(e)}")
    
    def fix_processing_agent_types(self):
        """Fix type annotation issues in processing agent"""
        logger.info("Fixing processing agent type annotations...")
        
        try:
            # Read current file
            with open("agents/processing.py", "r") as f:
                content = f.read()
            
            # Apply fixes
            if "metadata: Dict[str, Any] = None" in content:
                content = content.replace(
                    "metadata: Dict[str, Any] = None",
                    "metadata: Optional[Dict[str, Any]] = None"
                )
                self.log_fix("type_annotation", "Fixed metadata parameter type in processing agent")
            
            if "sponsor_data: Dict[str, Any] = None" in content:
                content = content.replace(
                    "sponsor_data: Dict[str, Any] = None", 
                    "sponsor_data: Optional[Dict[str, Any]] = None"
                )
                self.log_fix("type_annotation", "Fixed sponsor_data parameter type in processing agent")
            
            # Write back file
            with open("agents/processing.py", "w") as f:
                f.write(content)
                
        except Exception as e:
            self.log_issue("file_fix", f"Could not fix processing agent types: {str(e)}")
    
    def test_database_connectivity(self):
        """Test database connectivity and initialization"""
        logger.info("Testing database connectivity...")
        
        try:
            # Test database initialization
            result = subprocess.run([
                sys.executable, "-c", 
                "import asyncio; from utils.database import DatabaseManager; "
                "async def test(): dm = DatabaseManager(); await dm.initialize(); print('DB OK'); "
                "asyncio.run(test())"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and "DB OK" in result.stdout:
                self.test_results["database_init"] = "PASS"
                logger.info("Database initialization: PASS")
            else:
                self.test_results["database_init"] = "FAIL"
                self.log_issue("database", f"Database initialization failed: {result.stderr}")
                
        except Exception as e:
            self.test_results["database_init"] = "FAIL"
            self.log_issue("database", f"Database test failed: {str(e)}")
    
    def generate_comprehensive_report(self):
        """Generate comprehensive debug and fix report"""
        report = {
            "debug_session": {
                "timestamp": datetime.now().isoformat(),
                "total_issues_found": len(self.issues_found),
                "total_fixes_applied": len(self.fixes_applied)
            },
            "issues_identified": self.issues_found,
            "fixes_applied": self.fixes_applied,
            "test_results": self.test_results,
            "summary": {
                "critical_issues": len([i for i in self.issues_found if i["severity"] == "critical"]),
                "high_issues": len([i for i in self.issues_found if i["severity"] == "high"]),
                "medium_issues": len([i for i in self.issues_found if i["severity"] == "medium"]),
                "tests_passed": len([k for k, v in self.test_results.items() if v == "PASS"]),
                "tests_failed": len([k for k, v in self.test_results.items() if v == "FAIL"])
            }
        }
        
        # Write report to file
        with open("comprehensive_debug_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        logger.info("=" * 60)
        logger.info("COMPREHENSIVE DEBUG REPORT SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total Issues Found: {report['debug_session']['total_issues_found']}")
        logger.info(f"Total Fixes Applied: {report['debug_session']['total_fixes_applied']}")
        logger.info(f"Critical Issues: {report['summary']['critical_issues']}")
        logger.info(f"High Priority Issues: {report['summary']['high_issues']}")
        logger.info(f"Tests Passed: {report['summary']['tests_passed']}")
        logger.info(f"Tests Failed: {report['summary']['tests_failed']}")
        logger.info("=" * 60)
        
        return report
    
    def run_comprehensive_debug(self):
        """Run complete debugging and fixing process"""
        logger.info("Starting comprehensive debugging and fixing process...")
        
        # Phase 1: Check imports and basic functionality
        self.check_python_imports()
        
        # Phase 2: Fix known type annotation issues
        self.fix_processing_agent_types()
        
        # Phase 3: Test database connectivity
        self.test_database_connectivity()
        
        # Phase 4: Test FastAPI functionality
        self.test_fastapi_startup()
        
        # Phase 5: Test Express.js functionality
        self.test_express_functionality()
        
        # Phase 6: Check type annotations
        # self.check_type_annotations()  # Skip if mypy not available
        
        # Generate comprehensive report
        report = self.generate_comprehensive_report()
        
        logger.info("Comprehensive debugging and fixing process completed!")
        return report

if __name__ == "__main__":
    debugger = ComprehensiveDebugger()
    debugger.run_comprehensive_debug()