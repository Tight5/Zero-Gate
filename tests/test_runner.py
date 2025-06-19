#!/usr/bin/env python3
"""
Test Runner for Zero Gate ESO Platform Backend Tests
Comprehensive test execution with reporting and multi-tenant validation
Based on attached asset specifications
"""

import sys
import os
import pytest
import argparse
import time
from typing import List, Dict, Any
import json
from datetime import datetime

# Add server directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

class TestRunner:
    """Comprehensive test runner for Zero Gate ESO Platform"""
    
    def __init__(self):
        self.test_results = {}
        self.start_time = None
        self.end_time = None
        
    def run_tenant_isolation_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run tenant isolation test suite"""
        print("🔒 Running Tenant Isolation Tests...")
        
        args = [
            'tests/test_tenant_isolation.py',
            '-v' if verbose else '',
            '--tb=short',
            '-x',  # Stop on first failure for quick feedback
            '--durations=10'  # Show 10 slowest tests
        ]
        
        # Filter out empty args
        args = [arg for arg in args if arg]
        
        start_time = time.time()
        result = pytest.main(args)
        end_time = time.time()
        
        return {
            'exit_code': result,
            'duration': end_time - start_time,
            'test_type': 'tenant_isolation',
            'success': result == 0
        }
    
    def run_grant_timeline_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run grant timeline test suite"""
        print("⏱️ Running Grant Timeline Tests...")
        
        args = [
            'tests/test_grant_timeline.py',
            '-v' if verbose else '',
            '--tb=short',
            '--durations=10'
        ]
        
        args = [arg for arg in args if arg]
        
        start_time = time.time()
        result = pytest.main(args)
        end_time = time.time()
        
        return {
            'exit_code': result,
            'duration': end_time - start_time,
            'test_type': 'grant_timeline',
            'success': result == 0
        }
    
    def run_path_discovery_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run path discovery test suite"""
        print("🗺️ Running Path Discovery Tests...")
        
        args = [
            'tests/test_path_discovery.py',
            '-v' if verbose else '',
            '--tb=short',
            '--durations=10'
        ]
        
        args = [arg for arg in args if arg]
        
        start_time = time.time()
        result = pytest.main(args)
        end_time = time.time()
        
        return {
            'exit_code': result,
            'duration': end_time - start_time,
            'test_type': 'path_discovery',
            'success': result == 0
        }
    
    def run_all_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        print("🚀 Running Comprehensive Test Suite...")
        
        args = [
            'tests/',
            '-v' if verbose else '',
            '--tb=short',
            '--durations=20',
            '--cov=server',  # Coverage if available
            '--cov-report=term-missing'
        ]
        
        args = [arg for arg in args if arg]
        
        start_time = time.time()
        result = pytest.main(args)
        end_time = time.time()
        
        return {
            'exit_code': result,
            'duration': end_time - start_time,
            'test_type': 'comprehensive',
            'success': result == 0
        }
    
    def run_performance_tests(self, verbose: bool = False) -> Dict[str, Any]:
        """Run performance-focused tests"""
        print("⚡ Running Performance Tests...")
        
        args = [
            'tests/',
            '-v' if verbose else '',
            '-m', 'performance',
            '--tb=short',
            '--durations=10'
        ]
        
        args = [arg for arg in args if arg]
        
        start_time = time.time()
        result = pytest.main(args)
        end_time = time.time()
        
        return {
            'exit_code': result,
            'duration': end_time - start_time,
            'test_type': 'performance',
            'success': result == 0
        }
    
    def generate_test_report(self, results: List[Dict[str, Any]]) -> str:
        """Generate comprehensive test report"""
        total_duration = sum(r['duration'] for r in results)
        successful_tests = [r for r in results if r['success']]
        failed_tests = [r for r in results if not r['success']]
        
        report = f"""
# Zero Gate ESO Platform Backend Test Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- **Total Test Suites**: {len(results)}
- **Successful**: {len(successful_tests)}
- **Failed**: {len(failed_tests)}
- **Total Duration**: {total_duration:.2f} seconds
- **Success Rate**: {(len(successful_tests) / len(results) * 100):.1f}%

## Test Suite Results

"""
        
        for result in results:
            status = "✅ PASSED" if result['success'] else "❌ FAILED"
            report += f"""
### {result['test_type'].replace('_', ' ').title()}
- **Status**: {status}
- **Duration**: {result['duration']:.2f} seconds
- **Exit Code**: {result['exit_code']}
"""
        
        if failed_tests:
            report += "\n## Failed Tests\n"
            for failed in failed_tests:
                report += f"- {failed['test_type']}: Exit code {failed['exit_code']}\n"
        
        report += f"""
## Performance Metrics
- **Average Test Suite Duration**: {total_duration / len(results):.2f} seconds
- **Fastest Test Suite**: {min(results, key=lambda x: x['duration'])['test_type']} ({min(r['duration'] for r in results):.2f}s)
- **Slowest Test Suite**: {max(results, key=lambda x: x['duration'])['test_type']} ({max(r['duration'] for r in results):.2f}s)

## Recommendations
"""
        
        if failed_tests:
            report += "- ⚠️ Address failed test suites before deployment\n"
            report += "- 🔍 Review error logs for detailed failure information\n"
        
        if total_duration > 60:
            report += "- ⚡ Consider optimizing test performance (current duration > 60s)\n"
        
        if len(successful_tests) == len(results):
            report += "- ✅ All tests passing - ready for deployment consideration\n"
            report += "- 🚀 Backend testing complete and successful\n"
        
        return report
    
    def main(self):
        """Main test runner execution"""
        parser = argparse.ArgumentParser(description='Zero Gate ESO Platform Backend Test Runner')
        parser.add_argument('--suite', choices=['tenant', 'grant', 'path', 'all', 'performance'], 
                          default='all', help='Test suite to run')
        parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
        parser.add_argument('--report', action='store_true', help='Generate test report')
        
        args = parser.parse_args()
        
        self.start_time = time.time()
        results = []
        
        print(f"🧪 Zero Gate ESO Platform Backend Test Runner")
        print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        try:
            if args.suite == 'tenant':
                results.append(self.run_tenant_isolation_tests(args.verbose))
            elif args.suite == 'grant':
                results.append(self.run_grant_timeline_tests(args.verbose))
            elif args.suite == 'path':
                results.append(self.run_path_discovery_tests(args.verbose))
            elif args.suite == 'performance':
                results.append(self.run_performance_tests(args.verbose))
            elif args.suite == 'all':
                results.append(self.run_tenant_isolation_tests(args.verbose))
                results.append(self.run_grant_timeline_tests(args.verbose))
                results.append(self.run_path_discovery_tests(args.verbose))
            
            self.end_time = time.time()
            
            print("\n" + "=" * 60)
            print("📊 Test Execution Summary")
            
            for result in results:
                status = "✅ PASSED" if result['success'] else "❌ FAILED"
                print(f"  {result['test_type']}: {status} ({result['duration']:.2f}s)")
            
            total_duration = self.end_time - self.start_time
            success_rate = len([r for r in results if r['success']]) / len(results) * 100
            
            print(f"\n⏱️ Total Duration: {total_duration:.2f} seconds")
            print(f"📈 Success Rate: {success_rate:.1f}%")
            
            if args.report:
                report = self.generate_test_report(results)
                report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
                
                with open(report_file, 'w') as f:
                    f.write(report)
                
                print(f"\n📄 Test report generated: {report_file}")
            
            # Exit with appropriate code
            exit_code = 0 if all(r['success'] for r in results) else 1
            
            if exit_code == 0:
                print("\n🎉 All tests passed successfully!")
            else:
                print("\n⚠️ Some tests failed. Check logs for details.")
            
            sys.exit(exit_code)
            
        except KeyboardInterrupt:
            print("\n\n⏹️ Test execution interrupted by user")
            sys.exit(1)
        except Exception as e:
            print(f"\n\n💥 Test execution failed with error: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    runner = TestRunner()
    runner.main()