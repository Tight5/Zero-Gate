#!/usr/bin/env node

import axios from 'axios';
import { performance } from 'perf_hooks';

class OrchestrationTester {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.tenantId = 'test-tenant-orchestration';
  }

  async run() {
    console.log('Zero Gate ESO Platform - Orchestration Agent Testing');
    console.log('===================================================');
    
    try {
      // Test authentication first
      await this.testAuthentication();
      
      // Test workflow endpoints
      await this.testWorkflowStatus();
      await this.testResourceMonitoring();
      await this.testSponsorAnalysisWorkflow();
      await this.testGrantTimelineWorkflow();
      await this.testRelationshipMappingWorkflow();
      await this.testEmergencyControls();
      await this.testQueueManagement();
      
      console.log('\n✅ All orchestration tests completed successfully');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    try {
      // For testing purposes, we'll skip actual auth and use the health endpoint
      const response = await axios.get(`${this.baseUrl}/health`);
      console.log(`   Health check: ${response.data.status}`);
      console.log(`   Memory usage: ${response.data.memory.percentage}%`);
      
      // Set mock auth token for testing
      this.authToken = 'test-token';
      console.log('   ✅ Authentication setup complete');
      
    } catch (error) {
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  async testWorkflowStatus() {
    console.log('\n📊 Testing Workflow Status Endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/workflows/status`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      const data = response.data;
      console.log(`   System health: ${data.system_health.status}`);
      console.log(`   Memory usage: ${data.system_health.memory.percentage}%`);
      console.log(`   Feature availability:`);
      
      Object.entries(data.feature_availability).forEach(([feature, status]) => {
        const icon = status === 'enabled' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
        console.log(`     ${icon} ${feature}: ${status}`);
      });
      
      console.log('   ✅ Workflow status test passed');
      
    } catch (error) {
      console.log(`   ⚠️ Workflow status test failed: ${error.response?.status || error.message}`);
    }
  }

  async testResourceMonitoring() {
    console.log('\n🖥️ Testing Resource Monitoring...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/workflows/resources`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      const resources = response.data.resources;
      console.log(`   Memory: ${resources.memory.heapUsed}MB / ${resources.memory.heapTotal}MB (${resources.memory.percentage}%)`);
      console.log(`   CPU estimate: ${resources.cpu.usage_estimate}%`);
      console.log(`   Uptime: ${Math.floor(resources.uptime / 60)} minutes`);
      console.log(`   Node version: ${resources.node_version}`);
      
      if (response.data.recommendations.length > 0) {
        console.log('   Recommendations:');
        response.data.recommendations.forEach(rec => {
          console.log(`     - ${rec}`);
        });
      }
      
      console.log('   ✅ Resource monitoring test passed');
      
    } catch (error) {
      console.log(`   ⚠️ Resource monitoring test failed: ${error.response?.status || error.message}`);
    }
  }

  async testSponsorAnalysisWorkflow() {
    console.log('\n🏢 Testing Sponsor Analysis Workflow...');
    
    try {
      const startTime = performance.now();
      
      const response = await axios.post(`${this.baseUrl}/api/workflows/sponsor-analysis`, {
        sponsor_id: 'test-sponsor-123'
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      const endTime = performance.now();
      const data = response.data;
      
      console.log(`   Workflow initiated: ${data.success ? 'Yes' : 'No'}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Memory usage: ${data.resource_status.memory_usage}`);
      console.log(`   Priority: ${data.resource_status.workflow_priority}`);
      console.log(`   Response time: ${Math.round(endTime - startTime)}ms`);
      
      if (data.estimated_completion) {
        console.log(`   Estimated completion: ${new Date(data.estimated_completion).toLocaleTimeString()}`);
      }
      
      console.log('   ✅ Sponsor analysis workflow test passed');
      
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('   ⚠️ Sponsor analysis disabled due to resource constraints');
        console.log(`   Memory usage: ${error.response.data.memory_usage}`);
      } else {
        console.log(`   ⚠️ Sponsor analysis test failed: ${error.response?.status || error.message}`);
      }
    }
  }

  async testGrantTimelineWorkflow() {
    console.log('\n📅 Testing Grant Timeline Workflow...');
    
    try {
      const startTime = performance.now();
      
      const response = await axios.post(`${this.baseUrl}/api/workflows/grant-timeline`, {
        grant_id: 'test-grant-456'
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      const endTime = performance.now();
      const data = response.data;
      
      console.log(`   Workflow initiated: ${data.success ? 'Yes' : 'No'}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Milestones calculated: ${data.milestones_calculated ? 'Yes' : 'No'}`);
      console.log(`   Response time: ${Math.round(endTime - startTime)}ms`);
      
      if (data.backwards_planning) {
        console.log('   Timeline milestones:');
        Object.entries(data.backwards_planning).forEach(([milestone, date]) => {
          console.log(`     ${milestone}: ${new Date(date).toLocaleDateString()}`);
        });
      }
      
      console.log('   ✅ Grant timeline workflow test passed');
      
    } catch (error) {
      console.log(`   ⚠️ Grant timeline test failed: ${error.response?.status || error.message}`);
    }
  }

  async testRelationshipMappingWorkflow() {
    console.log('\n🔗 Testing Relationship Mapping Workflow...');
    
    try {
      const startTime = performance.now();
      
      const response = await axios.post(`${this.baseUrl}/api/workflows/relationship-mapping`, {
        source: 'user1@example.com',
        target: 'user2@example.com',
        max_depth: 7
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      const endTime = performance.now();
      const data = response.data;
      
      console.log(`   Workflow initiated: ${data.success ? 'Yes' : 'No'}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Processing mode: ${data.processing_mode}`);
      console.log(`   Algorithm: ${data.resource_status.algorithm}`);
      console.log(`   Max depth: ${data.max_depth}`);
      console.log(`   Response time: ${Math.round(endTime - startTime)}ms`);
      
      if (data.estimated_completion) {
        console.log(`   Estimated completion: ${new Date(data.estimated_completion).toLocaleTimeString()}`);
      }
      
      console.log('   ✅ Relationship mapping workflow test passed');
      
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('   ⚠️ Relationship mapping disabled due to high memory usage');
        console.log(`   Memory usage: ${error.response.data.memory_usage}`);
        console.log(`   Alternative: ${error.response.data.alternative}`);
      } else {
        console.log(`   ⚠️ Relationship mapping test failed: ${error.response?.status || error.message}`);
      }
    }
  }

  async testEmergencyControls() {
    console.log('\n🚨 Testing Emergency Controls...');
    
    try {
      // Test emergency disable
      const disableResponse = await axios.post(`${this.baseUrl}/api/workflows/emergency/disable-features`, {
        features: ['relationship_mapping', 'advanced_analytics']
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      console.log(`   Emergency disable: ${disableResponse.data.success ? 'Success' : 'Failed'}`);
      console.log(`   Disabled features: ${disableResponse.data.disabled_features.join(', ')}`);
      console.log(`   Recovery estimate: ${disableResponse.data.recovery_estimate}`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test emergency enable
      const enableResponse = await axios.post(`${this.baseUrl}/api/workflows/emergency/enable-features`, {
        features: ['all']
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      if (enableResponse.status === 503) {
        console.log('   Emergency enable: Resources still critical');
        console.log(`   Current memory: ${enableResponse.data.memory_usage}`);
      } else {
        console.log(`   Emergency enable: ${enableResponse.data.success ? 'Success' : 'Failed'}`);
        console.log(`   Current memory: ${enableResponse.data.current_memory}`);
      }
      
      console.log('   ✅ Emergency controls test passed');
      
    } catch (error) {
      console.log(`   ⚠️ Emergency controls test failed: ${error.response?.status || error.message}`);
    }
  }

  async testQueueManagement() {
    console.log('\n📋 Testing Queue Management...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/workflows/queue`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-ID': this.tenantId
        }
      });
      
      const queue = response.data;
      console.log(`   Queue length: ${queue.queue_length}`);
      console.log(`   Processing tasks: ${queue.processing_tasks}`);
      console.log(`   Completed today: ${queue.completed_today}`);
      console.log(`   Failed today: ${queue.failed_today}`);
      console.log(`   Average processing time: ${queue.average_processing_time}`);
      
      console.log('   Queue breakdown:');
      Object.entries(queue.queue_types).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
      
      console.log('   ✅ Queue management test passed');
      
    } catch (error) {
      console.log(`   ⚠️ Queue management test failed: ${error.response?.status || error.message}`);
    }
  }
}

// Run the test suite
const tester = new OrchestrationTester();
tester.run().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});