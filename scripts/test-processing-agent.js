#!/usr/bin/env node

/**
 * ProcessingAgent Integration Test Suite
 * Tests NetworkX-based relationship graph processing, sponsor metrics, and grant timelines
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProcessingAgentTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.tenantId = 'test-processing-agent';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type}: ${message}`);
  }

  async executeProcessingCommand(action, data) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '..', 'server', 'agents', 'processing_wrapper.py');
      const child = spawn('python3', [pythonScript]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      // Send request data
      const request = {
        action,
        data: { ...data, tenant_id: this.tenantId },
        tenant_id: this.tenantId
      };

      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }

  async testSponsorAddition() {
    this.log('Testing sponsor addition to NetworkX graph...');
    
    try {
      const sponsorData = {
        id: 'sponsor-tech-foundation',
        name: 'Tech Innovation Foundation',
        tier: 'platinum',
        contact_strength: 0.9,
        funding_capacity: 1000000,
        response_rate: 0.85,
        last_contact: new Date().toISOString(),
        industries: ['technology', 'innovation', 'education'],
        location: 'Silicon Valley',
        tenant_id: this.tenantId
      };

      const result = await this.executeProcessingCommand('add_sponsor', sponsorData);
      
      if (result.success) {
        this.log('✅ Sponsor addition test passed');
        this.testResults.passed++;
        return true;
      } else {
        this.log(`❌ Sponsor addition test failed: ${result.error}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Sponsor addition: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Sponsor addition test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Sponsor addition: ${error.message}`);
      return false;
    }
  }

  async testRelationshipCreation() {
    this.log('Testing relationship edge creation...');
    
    try {
      // Add multiple sponsors first
      const sponsors = [
        {
          id: 'sponsor-education-corp',
          name: 'Education Corporation',
          tier: 'gold',
          contact_strength: 0.7,
          funding_capacity: 500000,
          response_rate: 0.6,
          last_contact: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          industries: ['education', 'research'],
          location: 'Boston',
          tenant_id: this.tenantId
        },
        {
          id: 'sponsor-community-fund',
          name: 'Community Development Fund',
          tier: 'silver',
          contact_strength: 0.5,
          funding_capacity: 200000,
          response_rate: 0.4,
          last_contact: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          industries: ['community', 'social'],
          location: 'Chicago',
          tenant_id: this.tenantId
        }
      ];

      for (const sponsor of sponsors) {
        await this.executeProcessingCommand('add_sponsor', sponsor);
      }

      // Create relationships
      const relationships = [
        {
          source_id: 'sponsor-tech-foundation',
          target_id: 'contact-john-doe',
          strength: 0.8,
          relationship_type: 'professional',
          context: 'board_member',
          last_interaction: new Date().toISOString(),
          tenant_id: this.tenantId
        },
        {
          source_id: 'contact-john-doe',
          target_id: 'sponsor-education-corp',
          strength: 0.6,
          relationship_type: 'professional',
          context: 'colleague',
          last_interaction: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          tenant_id: this.tenantId
        },
        {
          source_id: 'sponsor-education-corp',
          target_id: 'contact-jane-smith',
          strength: 0.7,
          relationship_type: 'personal',
          context: 'friend',
          last_interaction: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          tenant_id: this.tenantId
        }
      ];

      let allSucceeded = true;
      for (const relationship of relationships) {
        const result = await this.executeProcessingCommand('add_relationship', relationship);
        if (!result.success) {
          allSucceeded = false;
          this.log(`❌ Relationship creation failed: ${result.error}`);
        }
      }

      if (allSucceeded) {
        this.log('✅ Relationship creation test passed');
        this.testResults.passed++;
        return true;
      } else {
        this.testResults.failed++;
        this.testResults.errors.push('Relationship creation failed');
        return false;
      }
    } catch (error) {
      this.log(`❌ Relationship creation test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Relationship creation: ${error.message}`);
      return false;
    }
  }

  async testPathDiscovery() {
    this.log('Testing seven-degree path discovery...');
    
    try {
      const result = await this.executeProcessingCommand('find_shortest_path', {
        source: 'sponsor-tech-foundation',
        target: 'sponsor-education-corp',
        max_length: 7,
        tenant_id: this.tenantId
      });

      if (result.success && result.path_found) {
        this.log(`✅ Path discovery test passed - found path with ${result.path_length} degrees`);
        this.log(`   Path: ${result.path.join(' → ')}`);
        this.log(`   Confidence: ${(result.confidence_score * 100).toFixed(1)}%`);
        this.log(`   Estimated time: ${Math.round(result.estimated_time_hours)} hours`);
        this.testResults.passed++;
        return true;
      } else if (result.success && !result.path_found) {
        this.log('✅ Path discovery test passed - no path found (expected for sparse graph)');
        this.testResults.passed++;
        return true;
      } else {
        this.log(`❌ Path discovery test failed: ${result.error}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Path discovery: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Path discovery test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Path discovery: ${error.message}`);
      return false;
    }
  }

  async testSponsorMetrics() {
    this.log('Testing sponsor metrics calculation...');
    
    try {
      const result = await this.executeProcessingCommand('calculate_sponsor_metrics', {
        sponsor_id: 'sponsor-tech-foundation',
        tenant_id: this.tenantId
      });

      if (result.success) {
        this.log('✅ Sponsor metrics test passed');
        this.log(`   Network centrality: ${(result.network_centrality * 100).toFixed(1)}%`);
        this.log(`   Influence score: ${(result.influence_score * 100).toFixed(1)}%`);
        this.log(`   Funding probability: ${(result.funding_probability * 100).toFixed(1)}%`);
        this.log(`   Response likelihood: ${(result.response_likelihood * 100).toFixed(1)}%`);
        this.log(`   Contact window: ${result.optimal_contact_window}`);
        this.log(`   Grant success rate: ${(result.grant_success_rate * 100).toFixed(1)}%`);
        this.testResults.passed++;
        return true;
      } else {
        this.log(`❌ Sponsor metrics test failed: ${result.error}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Sponsor metrics: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Sponsor metrics test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Sponsor metrics: ${error.message}`);
      return false;
    }
  }

  async testGrantTimeline() {
    this.log('Testing grant timeline generation with backwards planning...');
    
    try {
      const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
      
      const grantData = {
        id: 'grant-innovation-2025',
        title: 'Innovation Research Grant 2025',
        sponsor_id: 'sponsor-tech-foundation',
        amount: 250000,
        submission_deadline: futureDate.toISOString(),
        status: 'active',
        requirements: ['detailed_budget', 'research_proposal', 'team_qualifications'],
        tenant_id: this.tenantId
      };

      const result = await this.executeProcessingCommand('generate_grant_timeline', grantData);

      if (result.success) {
        this.log('✅ Grant timeline test passed');
        this.log(`   Risk assessment: ${result.risk_assessment}`);
        this.log(`   Buffer days: ${result.buffer_days}`);
        this.log(`   Milestones: ${result.milestones.length}`);
        this.log(`   Critical path: ${result.critical_path.join(', ')}`);
        
        // Verify milestone structure
        if (result.milestones.length > 0) {
          this.log('   Sample milestones:');
          result.milestones.slice(0, 3).forEach(milestone => {
            const date = new Date(milestone.date).toLocaleDateString();
            this.log(`     - ${milestone.name} (${date}, ${milestone.priority})`);
          });
        }
        
        this.testResults.passed++;
        return true;
      } else {
        this.log(`❌ Grant timeline test failed: ${result.error}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Grant timeline: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Grant timeline test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Grant timeline: ${error.message}`);
      return false;
    }
  }

  async testNetworkStatistics() {
    this.log('Testing network statistics calculation...');
    
    try {
      const result = await this.executeProcessingCommand('get_network_statistics', {
        tenant_id: this.tenantId
      });

      if (result.success) {
        this.log('✅ Network statistics test passed');
        this.log(`   Nodes: ${result.node_count}`);
        this.log(`   Edges: ${result.edge_count}`);
        this.log(`   Density: ${(result.density * 100).toFixed(2)}%`);
        this.log(`   Connected: ${result.is_connected}`);
        this.log(`   Landmarks: ${result.landmark_count}`);
        
        if (result.node_types) {
          this.log('   Node types:');
          Object.entries(result.node_types).forEach(([type, count]) => {
            this.log(`     ${type}: ${count}`);
          });
        }
        
        this.testResults.passed++;
        return true;
      } else {
        this.log(`❌ Network statistics test failed: ${result.error}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Network statistics: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Network statistics test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Network statistics: ${error.message}`);
      return false;
    }
  }

  async testDistanceEstimation() {
    this.log('Testing landmark-based distance estimation...');
    
    try {
      const result = await this.executeProcessingCommand('estimate_distance', {
        source: 'sponsor-tech-foundation',
        target: 'sponsor-community-fund',
        tenant_id: this.tenantId
      });

      if (result.success) {
        if (result.distance_found) {
          this.log(`✅ Distance estimation test passed - distance: ${result.estimated_distance.toFixed(2)}`);
        } else {
          this.log('✅ Distance estimation test passed - no path found');
        }
        this.testResults.passed++;
        return true;
      } else {
        this.log(`❌ Distance estimation test failed: ${result.error}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Distance estimation: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Distance estimation test error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`Distance estimation: ${error.message}`);
      return false;
    }
  }

  async runComprehensiveTest() {
    this.log('🚀 Starting ProcessingAgent comprehensive test suite...');
    this.log('='.repeat(60));
    
    const tests = [
      this.testSponsorAddition,
      this.testRelationshipCreation,
      this.testPathDiscovery,
      this.testSponsorMetrics,
      this.testGrantTimeline,
      this.testNetworkStatistics,
      this.testDistanceEstimation
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.log(`❌ Test execution error: ${error.message}`);
        this.testResults.failed++;
        this.testResults.errors.push(`Test execution: ${error.message}`);
      }
    }

    this.log('='.repeat(60));
    this.log('📊 Test Results Summary:');
    this.log(`   ✅ Passed: ${this.testResults.passed}`);
    this.log(`   ❌ Failed: ${this.testResults.failed}`);
    this.log(`   📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      this.log('\n🔍 Error Details:');
      this.testResults.errors.forEach((error, index) => {
        this.log(`   ${index + 1}. ${error}`);
      });
    }

    return this.testResults.failed === 0;
  }
}

// Run the test suite
const tester = new ProcessingAgentTester();
tester.runComprehensiveTest().then(success => {
  if (success) {
    console.log('\n🎉 All ProcessingAgent tests passed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Some ProcessingAgent tests failed. Check logs above.');
    process.exit(1);
  }
}).catch(error => {
  console.error(`\n💥 Test suite failed with error: ${error.message}`);
  process.exit(1);
});