#!/usr/bin/env python3
"""
Comprehensive Test Runner for Zero Gate ESO Platform
Executes all pytest suites with proper configuration and reporting
"""

import os
import sys
import subprocess
import asyncio
from datetime import datetime
import json

class ComprehensiveTestRunner:
    """Manages execution of all platform test suites"""
    
    def __init__(self):
        self.test_suites = [
            {
                "name": "Tenant Isolation Tests",
                "path": "tests/test_tenant_isolation.py",
                "description": "Multi-tenant data segregation and security boundary validation"
            },
            {
                "name": "Grant Timeline Tests", 
                "path": "tests/test_grant_timeline.py",
                "description": "Backwards planning and 90/60/30-day milestone generation"
            },
            {
                "name": "Path Discovery Tests",
                "path": "tests/test_path_discovery.py", 
                "description": "Seven-degree path discovery and relationship analysis"
            }
        ]
        
        self.results = {}
        self.start_time = None
        self.end_time = None
    
    def setup_environment(self):
        """Setup test environment variables and dependencies"""
        os.environ["ENVIRONMENT"] = "test"
        os.environ["JWT_SECRET"] = "test-secret-key-for-testing"
        os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL", "postgresql://test:test@localhost/test")
        
        print("🔧 Environment configured for testing")
    
    def run_test_suite(self, suite):
        """Run individual test suite with pytest"""
        print(f"\n📋 Running {suite['name']}...")
        print(f"   {suite['description']}")
        
        cmd = [
            sys.executable, "-m", "pytest",
            suite["path"],
            "-v",
            "--tb=short",
            "--disable-warnings",
            f"--junitxml=test-results-{suite['name'].lower().replace(' ', '-')}.xml"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout per suite
            )
            
            self.results[suite["name"]] = {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            }
            
            if result.returncode == 0:
                print(f"   ✅ {suite['name']} passed")
            else:
                print(f"   ❌ {suite['name']} failed")
                if result.stderr:
                    print(f"   Error: {result.stderr[:200]}...")
                    
        except subprocess.TimeoutExpired:
            print(f"   ⏰ {suite['name']} timed out")
            self.results[suite["name"]] = {
                "success": False,
                "error": "Test suite timed out after 5 minutes",
                "return_code": -1
            }
        except Exception as e:
            print(f"   💥 {suite['name']} encountered error: {str(e)}")
            self.results[suite["name"]] = {
                "success": False,
                "error": str(e),
                "return_code": -1
            }
    
    def generate_report(self):
        """Generate comprehensive test report"""
        total_suites = len(self.test_suites)
        passed_suites = sum(1 for result in self.results.values() if result.get("success", False))
        failed_suites = total_suites - passed_suites
        
        duration = (self.end_time - self.start_time).total_seconds()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_suites": total_suites,
                "passed_suites": passed_suites,
                "failed_suites": failed_suites,
                "success_rate": f"{(passed_suites/total_suites)*100:.1f}%",
                "duration_seconds": duration
            },
            "suite_results": self.results,
            "recommendations": self.generate_recommendations()
        }
        
        # Save detailed report
        with open("comprehensive-test-report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        return report
    
    def generate_recommendations(self):
        """Generate recommendations based on test results"""
        recommendations = []
        
        for suite_name, result in self.results.items():
            if not result.get("success", False):
                if "tenant_isolation" in suite_name.lower():
                    recommendations.append(
                        "Review multi-tenant security policies and database Row-Level Security implementation"
                    )
                elif "grant_timeline" in suite_name.lower():
                    recommendations.append(
                        "Check backwards planning algorithm and milestone generation logic"
                    )
                elif "path_discovery" in suite_name.lower():
                    recommendations.append(
                        "Verify NetworkX integration and seven-degree pathfinding algorithms"
                    )
        
        if not recommendations:
            recommendations.append("All test suites passed - platform is ready for production deployment")
        
        return recommendations
    
    def print_summary(self, report):
        """Print test execution summary"""
        print("\n" + "="*60)
        print("🧪 COMPREHENSIVE TEST EXECUTION SUMMARY")
        print("="*60)
        
        summary = report["summary"]
        print(f"📊 Total Suites: {summary['total_suites']}")
        print(f"✅ Passed: {summary['passed_suites']}")
        print(f"❌ Failed: {summary['failed_suites']}")
        print(f"📈 Success Rate: {summary['success_rate']}")
        print(f"⏱️  Duration: {summary['duration_seconds']:.1f} seconds")
        
        print("\n📋 SUITE DETAILS:")
        for suite in self.test_suites:
            result = self.results.get(suite["name"], {})
            status = "✅ PASSED" if result.get("success") else "❌ FAILED"
            print(f"   {status} - {suite['name']}")
        
        print("\n💡 RECOMMENDATIONS:")
        for i, rec in enumerate(report["recommendations"], 1):
            print(f"   {i}. {rec}")
        
        print(f"\n📄 Detailed report saved to: comprehensive-test-report.json")
        print("="*60)
    
    async def run_all_tests(self):
        """Execute all test suites and generate report"""
        self.start_time = datetime.now()
        
        print("🚀 Starting Comprehensive Test Execution")
        print(f"📅 {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Setup environment
        self.setup_environment()
        
        # Run each test suite
        for suite in self.test_suites:
            self.run_test_suite(suite)
        
        self.end_time = datetime.now()
        
        # Generate and display report
        report = self.generate_report()
        self.print_summary(report)
        
        return report


def main():
    """Main execution function"""
    runner = ComprehensiveTestRunner()
    
    try:
        # Run tests synchronously (pytest doesn't require async)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        report = loop.run_until_complete(runner.run_all_tests())
        
        # Exit with appropriate code
        failed_suites = report["summary"]["failed_suites"]
        sys.exit(0 if failed_suites == 0 else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Test execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Test runner encountered critical error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()