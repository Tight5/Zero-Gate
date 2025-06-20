#!/usr/bin/env node

/**
 * IntegrationAgent Test Suite
 * Tests Microsoft Graph integration with MSAL authentication, organizational data extraction,
 * email communication analysis, and Excel file processing
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class IntegrationAgentTester {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.tenantId = 'dev-tenant-1';
    this.testResults = [];
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type}: ${message}`;
    console.log(logMessage);
    
    this.testResults.push({
      timestamp,
      type,
      message,
      test: this.currentTest || 'general'
    });
  }

  async executeIntegrationCommand(action, data) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/integration/${action}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.tenantId,
          'Authorization': `Bearer ${this.authToken || 'dev-token'}`
        }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.data.error || error.response.statusText}`);
      }
      throw error;
    }
  }

  async testAuthentication() {
    this.currentTest = 'authentication';
    this.log('Testing Microsoft Graph authentication...', 'TEST');
    
    try {
      // Test auth endpoint
      const result = await this.executeIntegrationCommand('test-auth', {});
      
      if (result.authenticated) {
        this.log('✅ Authentication successful', 'SUCCESS');
        this.log(`Status: ${result.status}`, 'INFO');
        return true;
      } else {
        this.log('❌ Authentication failed', 'ERROR');
        this.log(`Error: ${result.error}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Authentication test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testConnectivityCheck() {
    this.currentTest = 'connectivity';
    this.log('Testing Microsoft Graph connectivity...', 'TEST');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/integration/connection-status`, {
        headers: {
          'x-tenant-id': this.tenantId,
          'Authorization': `Bearer ${this.authToken || 'dev-token'}`
        }
      });
      
      const status = response.data;
      this.log('✅ Connection status retrieved', 'SUCCESS');
      this.log(`Connected: ${status.authenticated}`, 'INFO');
      this.log(`Status: ${status.status}`, 'INFO');
      
      return status.authenticated;
    } catch (error) {
      this.log(`❌ Connectivity test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testUserExtraction() {
    this.currentTest = 'user_extraction';
    this.log('Testing organizational user extraction...', 'TEST');
    
    try {
      const result = await this.executeIntegrationCommand('extract-relationships', {
        user_limit: 10
      });
      
      if (result.status === 'success') {
        this.log('✅ User extraction successful', 'SUCCESS');
        this.log(`Total users: ${result.total_users}`, 'INFO');
        this.log(`Total relationships: ${result.total_relationships}`, 'INFO');
        
        // Validate data structure
        if (result.users && result.relationships) {
          this.log('✅ Data structure validation passed', 'SUCCESS');
          return true;
        } else {
          this.log('❌ Invalid data structure returned', 'ERROR');
          return false;
        }
      } else {
        this.log(`❌ User extraction failed: ${result.message}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ User extraction test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testEmailPatternAnalysis() {
    this.currentTest = 'email_analysis';
    this.log('Testing email communication pattern analysis...', 'TEST');
    
    try {
      const result = await this.executeIntegrationCommand('analyze-communication', {
        days: 7
      });
      
      if (result.status === 'success') {
        this.log('✅ Email analysis successful', 'SUCCESS');
        this.log(`Analysis period: ${result.analysis_period_days} days`, 'INFO');
        this.log(`Total contacts: ${result.total_contacts}`, 'INFO');
        this.log(`Messages analyzed: ${result.total_messages_analyzed}`, 'INFO');
        
        // Validate communication patterns
        if (result.communication_patterns && result.top_collaborators) {
          this.log('✅ Communication pattern analysis validated', 'SUCCESS');
          
          // Log top collaborators
          if (result.top_collaborators.length > 0) {
            this.log(`Top collaborator: ${result.top_collaborators[0].name} (score: ${result.top_collaborators[0].score})`, 'INFO');
          }
          
          return true;
        } else {
          this.log('❌ Invalid communication pattern data', 'ERROR');
          return false;
        }
      } else {
        this.log(`❌ Email analysis failed: ${result.message}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Email analysis test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testRelationshipExtraction() {
    this.currentTest = 'relationship_extraction';
    this.log('Testing organizational relationship extraction...', 'TEST');
    
    try {
      const result = await this.executeIntegrationCommand('extract-relationships', {
        user_limit: 50
      });
      
      if (result.status === 'success') {
        this.log('✅ Relationship extraction successful', 'SUCCESS');
        
        // Analyze relationship types
        const relationshipTypes = {};
        result.relationships.forEach(rel => {
          relationshipTypes[rel.type] = (relationshipTypes[rel.type] || 0) + 1;
        });
        
        this.log('Relationship type distribution:', 'INFO');
        Object.entries(relationshipTypes).forEach(([type, count]) => {
          this.log(`  ${type}: ${count}`, 'INFO');
        });
        
        return true;
      } else {
        this.log(`❌ Relationship extraction failed: ${result.message}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Relationship extraction test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testExcelProcessing() {
    this.currentTest = 'excel_processing';
    this.log('Testing Excel file processing...', 'TEST');
    
    try {
      // Create a test Excel file content
      const testData = this.createTestExcelContent();
      
      const result = await this.executeIntegrationCommand('process-excel-content', {
        file_content: testData,
        filename: 'test_dashboard_data.xlsx'
      });
      
      if (result.status === 'success') {
        this.log('✅ Excel processing successful', 'SUCCESS');
        this.log(`Worksheets processed: ${result.summary.total_worksheets}`, 'INFO');
        this.log(`KPI sheets found: ${result.summary.kpi_sheets}`, 'INFO');
        this.log(`Sponsor records: ${result.summary.sponsor_records}`, 'INFO');
        this.log(`Grant records: ${result.summary.grant_records}`, 'INFO');
        
        return true;
      } else {
        this.log(`❌ Excel processing failed: ${result.message}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Excel processing test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  createTestExcelContent() {
    // Base64 encoded minimal Excel file for testing
    return 'UEsDBBQAAAAIAMpFZFcAAAAAAAAAAAAAAAALAAAAX3JlbHMvLnJlbHONz8EKwjAMBuB7L3E32x7Ag3jRQ/HiRQpC6xsk7dJmXXu3Hd4fwYsIXkLy/R9JvlWCTLXkIr8CjqJSIYIKNyeA4DWtdEp7kKiqxOLErJYqKQUlOKJSoJJDJTgL/qeJyYL4b5XLGLJSPVDRVEGQTbJ9OwLUCROvGCtx6BJn7IayONb0cOSXU8b6jTKjPUn5AFWJ8ADrjXwsV+BBwwHCpJXHVKVR4FEyb5CnGN/4JrGBaF9xk+2e9w0AAAD//wMAUEsDBBQAAAAIANdFZFcAAAAAAAAAAAAAAAAaAAAAZG9jUHJvcHMvYXBwLnhtbE2OQU7DMBBFr2LNPWPHkqNuh6ZVC6JIaKFs3cl4mizGnokx';
  }

  async testIntegrationSummary() {
    this.currentTest = 'integration_summary';
    this.log('Testing integration agent status summary...', 'TEST');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/integration/status`, {
        headers: {
          'x-tenant-id': this.tenantId,
          'Authorization': `Bearer ${this.authToken || 'dev-token'}`
        }
      });
      
      const status = response.data;
      this.log('✅ Integration status retrieved', 'SUCCESS');
      this.log(`Agent status: ${status.integration_agent}`, 'INFO');
      this.log(`Microsoft Graph connected: ${status.microsoft_graph.connected}`, 'INFO');
      this.log(`Supported operations: ${status.supported_operations.length}`, 'INFO');
      
      // Validate capabilities
      const capabilities = status.capabilities;
      const expectedCapabilities = [
        'organizational_relationships',
        'email_communication_analysis', 
        'excel_file_processing',
        'file_upload_support'
      ];
      
      const missingCapabilities = expectedCapabilities.filter(cap => !capabilities[cap]);
      
      if (missingCapabilities.length === 0) {
        this.log('✅ All expected capabilities present', 'SUCCESS');
        return true;
      } else {
        this.log(`❌ Missing capabilities: ${missingCapabilities.join(', ')}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Integration summary test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testOrganizationSync() {
    this.currentTest = 'organization_sync';
    this.log('Testing complete organizational data synchronization...', 'TEST');
    
    try {
      // Test full organization extraction
      const orgResult = await this.executeIntegrationCommand('extract-relationships', {
        user_limit: 100
      });
      
      if (orgResult.status !== 'success') {
        this.log('❌ Organization extraction failed', 'ERROR');
        return false;
      }
      
      // Test communication analysis for multiple users
      const users = Object.keys(orgResult.users).slice(0, 3);
      let communicationResults = 0;
      
      for (const userId of users) {
        try {
          const commResult = await this.executeIntegrationCommand('analyze-communication', {
            user_id: userId,
            days: 14
          });
          
          if (commResult.status === 'success') {
            communicationResults++;
          }
        } catch (error) {
          this.log(`Communication analysis failed for user ${userId}: ${error.message}`, 'WARN');
        }
      }
      
      this.log(`✅ Organization sync completed`, 'SUCCESS');
      this.log(`Users extracted: ${orgResult.total_users}`, 'INFO');
      this.log(`Relationships mapped: ${orgResult.total_relationships}`, 'INFO');
      this.log(`Communication patterns analyzed: ${communicationResults}`, 'INFO');
      
      return true;
    } catch (error) {
      this.log(`❌ Organization sync test failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async runComprehensiveTest() {
    this.log('Starting comprehensive IntegrationAgent test suite...', 'START');
    
    const tests = [
      { name: 'Authentication', fn: () => this.testAuthentication() },
      { name: 'Connectivity Check', fn: () => this.testConnectivityCheck() },
      { name: 'User Extraction', fn: () => this.testUserExtraction() },
      { name: 'Email Pattern Analysis', fn: () => this.testEmailPatternAnalysis() },
      { name: 'Relationship Extraction', fn: () => this.testRelationshipExtraction() },
      { name: 'Excel Processing', fn: () => this.testExcelProcessing() },
      { name: 'Integration Summary', fn: () => this.testIntegrationSummary() },
      { name: 'Organization Sync', fn: () => this.testOrganizationSync() }
    ];
    
    const results = {};
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      this.log(`\n--- Running ${test.name} Test ---`, 'TEST');
      
      try {
        const result = await test.fn();
        results[test.name] = result;
        
        if (result) {
          passed++;
          this.log(`✅ ${test.name}: PASSED`, 'SUCCESS');
        } else {
          failed++;
          this.log(`❌ ${test.name}: FAILED`, 'ERROR');
        }
      } catch (error) {
        results[test.name] = false;
        failed++;
        this.log(`❌ ${test.name}: ERROR - ${error.message}`, 'ERROR');
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate final report
    this.log('\n=== INTEGRATION AGENT TEST SUMMARY ===', 'SUMMARY');
    this.log(`Total Tests: ${tests.length}`, 'SUMMARY');
    this.log(`Passed: ${passed}`, 'SUCCESS');
    this.log(`Failed: ${failed}`, 'ERROR');
    this.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`, 'SUMMARY');
    
    // Detailed results
    this.log('\n=== DETAILED RESULTS ===', 'SUMMARY');
    Object.entries(results).forEach(([testName, result]) => {
      this.log(`${testName}: ${result ? 'PASS' : 'FAIL'}`, result ? 'SUCCESS' : 'ERROR');
    });
    
    // Save test results
    const reportPath = path.join(process.cwd(), 'integration-agent-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: tests.length,
        passed,
        failed,
        successRate: Math.round((passed / tests.length) * 100)
      },
      results,
      logs: this.testResults
    }, null, 2));
    
    this.log(`\nTest report saved to: ${reportPath}`, 'INFO');
    
    return {
      success: failed === 0,
      passed,
      failed,
      total: tests.length
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationAgentTester();
  
  tester.runComprehensiveTest()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 All IntegrationAgent tests passed!');
        process.exit(0);
      } else {
        console.log(`\n❌ ${result.failed} test(s) failed out of ${result.total}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test suite execution failed:', error);
      process.exit(1);
    });
}

module.exports = IntegrationAgentTester;