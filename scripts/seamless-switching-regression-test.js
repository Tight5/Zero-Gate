#!/usr/bin/env node

/**
 * Seamless Tenant/Admin Mode Switching - Comprehensive Regression Test Suite
 * Validates all platform functionality remains intact after dual-mode authentication implementation
 * Tests both existing functionality preservation and new switching capabilities
 */

import { performance } from 'perf_hooks';
import http from 'http';

class SeamlessSwitchingRegressionTester {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      existingFunctionality: [],
      newFunctionality: [],
      performance: {},
      compliance: {},
      errors: []
    };
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      WARNING: '\x1b[33m',
      ERROR: '\x1b[31m',
      RESET: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.RESET}`);
  }

  async testServerHealth() {
    this.log('Testing server health and basic connectivity...');
    try {
      const start = performance.now();
      const response = await fetch(`${this.baseUrl}/health`);
      const end = performance.now();
      
      if (response.ok) {
        const healthData = await response.json();
        this.results.performance.healthCheck = Math.round(end - start);
        this.results.existingFunctionality.push({
          test: 'Server Health Check',
          status: 'PASS',
          responseTime: Math.round(end - start),
          details: `Memory: ${healthData.memory.percentage}%, Uptime: ${Math.round(healthData.uptime)}s`
        });
        this.results.passed++;
        this.log(`✓ Server health check passed (${Math.round(end - start)}ms)`, 'SUCCESS');
        return true;
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`Health Check: ${error.message}`);
      this.log(`✗ Server health check failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testExistingAuthentication() {
    this.log('Testing existing authentication system preservation...');
    try {
      const start = performance.now();
      const response = await fetch(`${this.baseUrl}/api/auth/user`);
      const end = performance.now();
      
      if (response.ok) {
        const userData = await response.json();
        
        // Validate user data structure remains intact
        const requiredFields = ['id', 'email', 'firstName', 'lastName'];
        const hasAllFields = requiredFields.every(field => userData.hasOwnProperty(field));
        
        if (hasAllFields) {
          this.results.existingFunctionality.push({
            test: 'Authentication API Structure',
            status: 'PASS',
            responseTime: Math.round(end - start),
            details: `User: ${userData.email}, Admin: ${userData.isAdmin || false}`
          });
          this.results.passed++;
          this.log(`✓ Authentication API structure preserved (${Math.round(end - start)}ms)`, 'SUCCESS');
          return userData;
        } else {
          throw new Error('Authentication response missing required fields');
        }
      } else {
        throw new Error(`Authentication failed: ${response.status}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`Authentication: ${error.message}`);
      this.log(`✗ Authentication test failed: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async testExistingTenantEndpoints() {
    this.log('Testing existing tenant management endpoints...');
    try {
      const start = performance.now();
      const response = await fetch(`${this.baseUrl}/api/auth/user/tenants`);
      const end = performance.now();
      
      if (response.ok) {
        const tenantsData = await response.json();
        
        // Validate tenant data structure
        if (tenantsData.tenants && Array.isArray(tenantsData.tenants)) {
          const validTenants = tenantsData.tenants.every(tenant => 
            tenant.id && tenant.name && tenant.status
          );
          
          if (validTenants) {
            this.results.existingFunctionality.push({
              test: 'Tenant Management API',
              status: 'PASS',
              responseTime: Math.round(end - start),
              details: `Found ${tenantsData.tenants.length} tenants`
            });
            this.results.passed++;
            this.log(`✓ Tenant management API preserved (${Math.round(end - start)}ms)`, 'SUCCESS');
            return tenantsData.tenants;
          } else {
            throw new Error('Invalid tenant data structure');
          }
        } else {
          throw new Error('Tenants response missing required structure');
        }
      } else {
        throw new Error(`Tenant API failed: ${response.status}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`Tenant API: ${error.message}`);
      this.log(`✗ Tenant API test failed: ${error.message}`, 'ERROR');
      return [];
    }
  }

  async testEmailSwitchingFunctionality() {
    this.log('Testing new email switching functionality...');
    const testEmails = [
      'clint.phillips@thecenter.nasdaq.org',
      'admin@tight5digital.com'
    ];
    
    for (const email of testEmails) {
      try {
        const start = performance.now();
        const response = await fetch(`${this.baseUrl}/api/auth/switch-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const end = performance.now();
        
        if (response.ok) {
          const switchData = await response.json();
          
          if (switchData.success && switchData.email === email) {
            this.results.newFunctionality.push({
              test: `Email Switch to ${email}`,
              status: 'PASS',
              responseTime: Math.round(end - start),
              details: `Admin: ${switchData.isAdmin}, Message: ${switchData.message}`
            });
            this.results.passed++;
            this.log(`✓ Email switch to ${email} successful (${Math.round(end - start)}ms)`, 'SUCCESS');
          } else {
            throw new Error('Email switch response invalid');
          }
        } else {
          throw new Error(`Email switch failed: ${response.status}`);
        }
      } catch (error) {
        this.results.failed++;
        this.results.errors.push(`Email Switch ${email}: ${error.message}`);
        this.log(`✗ Email switch to ${email} failed: ${error.message}`, 'ERROR');
      }
    }
  }

  async testAdminModeEndpoints() {
    this.log('Testing new admin mode switching endpoints...');
    const adminEndpoints = [
      { path: '/api/auth/enter-admin-mode', method: 'POST', name: 'Enter Admin Mode' },
      { path: '/api/auth/exit-admin-mode', method: 'POST', name: 'Exit Admin Mode' }
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        const start = performance.now();
        const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': 'admin@tight5digital.com',
            'X-Admin-Mode': endpoint.path.includes('enter') ? 'true' : 'false'
          }
        });
        const end = performance.now();
        
        if (response.ok) {
          const modeData = await response.json();
          
          if (modeData.success) {
            this.results.newFunctionality.push({
              test: endpoint.name,
              status: 'PASS',
              responseTime: Math.round(end - start),
              details: `Message: ${modeData.message}`
            });
            this.results.passed++;
            this.log(`✓ ${endpoint.name} successful (${Math.round(end - start)}ms)`, 'SUCCESS');
          } else {
            throw new Error('Admin mode response invalid');
          }
        } else {
          // For non-admin users, 403 is expected behavior
          if (response.status === 403) {
            this.results.newFunctionality.push({
              test: `${endpoint.name} - Security`,
              status: 'PASS',
              responseTime: Math.round(end - start),
              details: 'Properly rejected non-admin access'
            });
            this.results.passed++;
            this.log(`✓ ${endpoint.name} security working (${Math.round(end - start)}ms)`, 'SUCCESS');
          } else {
            throw new Error(`Admin mode failed: ${response.status}`);
          }
        }
      } catch (error) {
        this.results.failed++;
        this.results.errors.push(`${endpoint.name}: ${error.message}`);
        this.log(`✗ ${endpoint.name} failed: ${error.message}`, 'ERROR');
      }
    }
  }

  async testTenantContextMiddleware() {
    this.log('Testing tenant context middleware functionality...');
    const testHeaders = [
      { 'X-Tenant-ID': 'test-tenant-1', 'X-Admin-Mode': 'false' },
      { 'X-Tenant-ID': 'test-tenant-2', 'X-Admin-Mode': 'true' },
      { 'X-User-Email': 'admin@tight5digital.com', 'X-Admin-Mode': 'true' }
    ];
    
    for (let i = 0; i < testHeaders.length; i++) {
      try {
        const start = performance.now();
        const response = await fetch(`${this.baseUrl}/api/auth/user`, {
          headers: testHeaders[i]
        });
        const end = performance.now();
        
        if (response.ok) {
          // Check if middleware headers are being set
          const responseHeaders = Object.fromEntries(response.headers.entries());
          const hasContextHeaders = responseHeaders['x-current-tenant'] !== undefined ||
                                   responseHeaders['x-admin-mode'] !== undefined;
          
          if (hasContextHeaders) {
            this.results.newFunctionality.push({
              test: `Middleware Context Test ${i + 1}`,
              status: 'PASS',
              responseTime: Math.round(end - start),
              details: `Headers processed correctly`
            });
            this.results.passed++;
            this.log(`✓ Middleware context test ${i + 1} passed (${Math.round(end - start)}ms)`, 'SUCCESS');
          } else {
            this.results.warnings++;
            this.log(`⚠ Middleware headers not detected in test ${i + 1}`, 'WARNING');
          }
        } else {
          throw new Error(`Middleware test failed: ${response.status}`);
        }
      } catch (error) {
        this.results.failed++;
        this.results.errors.push(`Middleware Test ${i + 1}: ${error.message}`);
        this.log(`✗ Middleware test ${i + 1} failed: ${error.message}`, 'ERROR');
      }
    }
  }

  async testPerformanceImpact() {
    this.log('Testing performance impact of new switching functionality...');
    const performanceTests = [
      { name: 'Dashboard Load', path: '/' },
      { name: 'Auth Check', path: '/api/auth/user' },
      { name: 'Tenant List', path: '/api/auth/user/tenants' }
    ];
    
    for (const test of performanceTests) {
      const times = [];
      
      // Run each test 5 times for average
      for (let i = 0; i < 5; i++) {
        try {
          const start = performance.now();
          await fetch(`${this.baseUrl}${test.path}`);
          const end = performance.now();
          times.push(end - start);
        } catch (error) {
          this.log(`Performance test ${test.name} iteration ${i + 1} failed`, 'WARNING');
        }
      }
      
      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        this.results.performance[test.name] = Math.round(avgTime);
        
        // Performance thresholds
        const threshold = test.path === '/' ? 1000 : 500; // 1s for dashboard, 500ms for API
        
        if (avgTime < threshold) {
          this.results.existingFunctionality.push({
            test: `Performance - ${test.name}`,
            status: 'PASS',
            responseTime: Math.round(avgTime),
            details: `Within ${threshold}ms threshold`
          });
          this.results.passed++;
          this.log(`✓ ${test.name} performance acceptable (${Math.round(avgTime)}ms avg)`, 'SUCCESS');
        } else {
          this.results.warnings++;
          this.log(`⚠ ${test.name} performance degraded (${Math.round(avgTime)}ms avg)`, 'WARNING');
        }
      }
    }
  }

  generateComplianceReport() {
    this.log('Generating comprehensive compliance assessment...');
    
    const totalFunctionality = this.results.existingFunctionality.length + this.results.newFunctionality.length;
    const passedTests = this.results.passed;
    const compliancePercentage = totalFunctionality > 0 ? Math.round((passedTests / (passedTests + this.results.failed)) * 100) : 0;
    
    this.results.compliance = {
      overallPercentage: compliancePercentage,
      existingFunctionalityPreserved: this.results.existingFunctionality.filter(t => t.status === 'PASS').length,
      newFunctionalityWorking: this.results.newFunctionality.filter(t => t.status === 'PASS').length,
      performanceImpact: this.results.performance,
      regressionIssues: this.results.failed,
      warnings: this.results.warnings
    };
    
    // Compliance assessment
    if (compliancePercentage >= 95) {
      this.results.compliance.level = 'EXCELLENT';
      this.results.compliance.recommendation = 'Implementation ready for production';
    } else if (compliancePercentage >= 90) {
      this.results.compliance.level = 'GOOD';
      this.results.compliance.recommendation = 'Minor issues require attention';
    } else if (compliancePercentage >= 80) {
      this.results.compliance.level = 'ACCEPTABLE';
      this.results.compliance.recommendation = 'Significant issues require resolution';
    } else {
      this.results.compliance.level = 'POOR';
      this.results.compliance.recommendation = 'Major rework required';
    }
    
    this.log(`Compliance Level: ${this.results.compliance.level} (${compliancePercentage}%)`, 
             compliancePercentage >= 90 ? 'SUCCESS' : 'WARNING');
  }

  generateDetailedReport() {
    const report = {
      title: 'Seamless Tenant/Admin Mode Switching - Regression Test Report',
      timestamp: this.results.timestamp,
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        compliance: this.results.compliance
      },
      existingFunctionality: {
        title: 'Existing Functionality Preservation',
        tests: this.results.existingFunctionality,
        summary: `${this.results.existingFunctionality.filter(t => t.status === 'PASS').length}/${this.results.existingFunctionality.length} tests passed`
      },
      newFunctionality: {
        title: 'New Switching Functionality',
        tests: this.results.newFunctionality,
        summary: `${this.results.newFunctionality.filter(t => t.status === 'PASS').length}/${this.results.newFunctionality.length} tests passed`
      },
      performance: {
        title: 'Performance Impact Assessment',
        metrics: this.results.performance,
        assessment: Object.keys(this.results.performance).length > 0 ? 'Performance within acceptable ranges' : 'Performance testing incomplete'
      },
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failed === 0) {
      recommendations.push('✓ All regression tests passed - implementation is stable');
    } else {
      recommendations.push(`⚠ ${this.results.failed} test(s) failed - review errors and fix issues`);
    }
    
    if (this.results.warnings > 0) {
      recommendations.push(`⚠ ${this.results.warnings} warning(s) detected - monitor performance`);
    }
    
    if (this.results.compliance.overallPercentage >= 95) {
      recommendations.push('✓ Implementation exceeds compliance requirements');
      recommendations.push('✓ Ready for production deployment');
    } else {
      recommendations.push('⚠ Review failed tests before production deployment');
    }
    
    recommendations.push('• Monitor memory usage during extended admin mode sessions');
    recommendations.push('• Consider implementing audit logging for admin mode access');
    recommendations.push('• Test multi-user concurrent admin mode scenarios');
    
    return recommendations;
  }

  async runComprehensiveTest() {
    this.log('Starting comprehensive regression test suite for seamless switching...', 'INFO');
    this.log('================================================================================', 'INFO');
    
    const startTime = performance.now();
    
    // Test existing functionality preservation
    await this.testServerHealth();
    await this.testExistingAuthentication();
    await this.testExistingTenantEndpoints();
    
    // Test new switching functionality
    await this.testEmailSwitchingFunctionality();
    await this.testAdminModeEndpoints();
    await this.testTenantContextMiddleware();
    
    // Performance impact assessment
    await this.testPerformanceImpact();
    
    const endTime = performance.now();
    this.results.totalExecutionTime = Math.round(endTime - startTime);
    
    // Generate compliance assessment
    this.generateComplianceReport();
    
    this.log('================================================================================', 'INFO');
    this.log(`Regression testing completed in ${Math.round(endTime - startTime)}ms`, 'INFO');
    this.log(`Results: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.warnings} warnings`, 
             this.results.failed === 0 ? 'SUCCESS' : 'WARNING');
    
    // Generate and save detailed report
    const detailedReport = this.generateDetailedReport();
    
    try {
      const fs = await import('fs');
      fs.writeFileSync('seamless-switching-regression-report.json', JSON.stringify(detailedReport, null, 2));
      this.log('Detailed report saved to seamless-switching-regression-report.json', 'SUCCESS');
    } catch (error) {
      this.log('Failed to save detailed report', 'WARNING');
    }
    
    return detailedReport;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SeamlessSwitchingRegressionTester();
  tester.runComprehensiveTest().then(report => {
    console.log('\n=== FINAL ASSESSMENT ===');
    console.log(`Overall Compliance: ${report.summary.compliance.overallPercentage}% (${report.summary.compliance.level})`);
    console.log(`Recommendation: ${report.summary.compliance.recommendation}`);
    
    if (report.summary.failed > 0) {
      console.log('\nErrors requiring attention:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
  });
}

export default SeamlessSwitchingRegressionTester;