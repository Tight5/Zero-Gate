const { performance } = require('perf_hooks');

class PerformanceBenchmark {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runLoadTest() {
    console.log('Starting Zero Gate ESO Platform Load Test...');
    
    const scenarios = [
      { name: 'Authentication', concurrent: 10, iterations: 100 },
      { name: 'Dashboard Load', concurrent: 5, iterations: 50 },
      { name: 'Relationship Discovery', concurrent: 3, iterations: 20 },
      { name: 'Grant Management', concurrent: 8, iterations: 40 }
    ];

    for (const scenario of scenarios) {
      await this.runScenario(scenario);
    }

    this.generateReport();
  }

  async runScenario(scenario) {
    console.log(`\nRunning scenario: ${scenario.name}`);
    console.log(`Concurrent users: ${scenario.concurrent}, Iterations: ${scenario.iterations}`);
    
    const results = [];
    const promises = [];

    for (let i = 0; i < scenario.concurrent; i++) {
      promises.push(this.runUserSession(scenario, results));
    }

    await Promise.all(promises);
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    
    this.results.push({
      scenario: scenario.name,
      avgResponseTime,
      successRate,
      totalRequests: results.length
    });
  }

  async runUserSession(scenario, results) {
    for (let i = 0; i < scenario.iterations; i++) {
      const startTime = performance.now();
      
      try {
        switch (scenario.name) {
          case 'Authentication':
            await this.testAuthentication();
            break;
          case 'Dashboard Load':
            await this.testDashboardLoad();
            break;
          case 'Relationship Discovery':
            await this.testRelationshipDiscovery();
            break;
          case 'Grant Management':
            await this.testGrantManagement();
            break;
        }
        
        const endTime = performance.now();
        results.push({
          success: true,
          responseTime: endTime - startTime
        });
        
      } catch (error) {
        const endTime = performance.now();
        results.push({
          success: false,
          responseTime: endTime - startTime,
          error: error.message
        });
      }
      
      // Add small delay between requests
      await this.sleep(Math.random() * 100);
    }
  }

  async testAuthentication() {
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Expect 401 for unauthenticated requests
    if (response.status !== 401) {
      throw new Error(`Unexpected auth response: ${response.status}`);
    }
    
    return 'unauthenticated';
  }

  async testDashboardLoad() {
    // Test multiple dashboard endpoints
    const requests = [
      fetch(`${this.baseUrl}/api/dashboard/kpis`, {
        headers: { 
          'X-Tenant-ID': 'test-tenant'
        }
      }),
      fetch(`${this.baseUrl}/api/sponsors`, {
        headers: { 
          'X-Tenant-ID': 'test-tenant'
        }
      }),
      fetch(`${this.baseUrl}/api/grants`, {
        headers: { 
          'X-Tenant-ID': 'test-tenant'
        }
      })
    ];
    
    const responses = await Promise.all(requests);
    
    // Check if any requests failed unexpectedly
    for (const response of responses) {
      if (!response.ok && response.status !== 401) {
        throw new Error(`Dashboard request failed: ${response.status}`);
      }
    }
  }

  async testRelationshipDiscovery() {
    const response = await fetch(`${this.baseUrl}/api/relationships`, {
      method: 'GET',
      headers: { 
        'X-Tenant-ID': 'test-tenant'
      }
    });
    
    if (!response.ok && response.status !== 401) {
      throw new Error(`Relationship discovery failed: ${response.status}`);
    }
  }

  async testGrantManagement() {
    // Test getting grants list
    const response = await fetch(`${this.baseUrl}/api/grants`, {
      method: 'GET',
      headers: { 
        'X-Tenant-ID': 'test-tenant'
      }
    });
    
    if (!response.ok && response.status !== 401) {
      throw new Error(`Grant management failed: ${response.status}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('ZERO GATE ESO PLATFORM - PERFORMANCE REPORT');
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      console.log(`\n${result.scenario}:`);
      console.log(`  Average Response Time: ${result.avgResponseTime.toFixed(2)}ms`);
      console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
      console.log(`  Total Requests: ${result.totalRequests}`);
      
      // Performance thresholds
      const responseTimeThreshold = 2000; // 2 seconds
      const successRateThreshold = 95; // 95%
      
      if (result.avgResponseTime > responseTimeThreshold) {
        console.log(`  ⚠️  WARNING: Response time exceeds ${responseTimeThreshold}ms threshold`);
      }
      
      if (result.successRate < successRateThreshold) {
        console.log(`  ⚠️  WARNING: Success rate below ${successRateThreshold}% threshold`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    // Overall system health
    const overallResponseTime = this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    const overallSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;
    
    console.log('OVERALL SYSTEM PERFORMANCE:');
    console.log(`Average Response Time: ${overallResponseTime.toFixed(2)}ms`);
    console.log(`Average Success Rate: ${overallSuccessRate.toFixed(2)}%`);
    
    if (overallResponseTime < 1000 && overallSuccessRate > 95) {
      console.log('✅ System performance is EXCELLENT');
    } else if (overallResponseTime < 2000 && overallSuccessRate > 90) {
      console.log('✅ System performance is GOOD');
    } else {
      console.log('⚠️ System performance needs OPTIMIZATION');
    }
    
    console.log('='.repeat(60));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the load test
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runLoadTest().catch(console.error);
}

module.exports = PerformanceBenchmark;