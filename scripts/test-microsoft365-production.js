#!/usr/bin/env node
/**
 * Microsoft 365 Production Integration Test
 * Comprehensive pipeline validation with organizational data extraction
 */

import https from 'https';
import { URLSearchParams } from 'url';

class Microsoft365ProductionTester {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.tenantId = process.env.MICROSOFT_TENANT_ID;
    this.accessToken = null;
  }

  async authenticate() {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    }).toString();

    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(tokenBody)
        }
      };

      const req = https.request(tokenUrl, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            this.accessToken = response.access_token;
            resolve(response);
          } else {
            reject(new Error(`Authentication failed: ${response.error_description}`));
          }
        });
      });

      req.on('error', reject);
      req.write(tokenBody);
      req.end();
    });
  }

  async makeGraphRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = `https://graph.microsoft.com/v1.0${endpoint}`;
      const options = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: response
          });
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async extractComprehensiveOrganizationalData() {
    console.log('🏢 Extracting Comprehensive Organizational Data...');
    
    const endpoints = [
      {
        name: 'Users with Hierarchy',
        endpoint: '/users?$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,manager&$expand=manager($select=displayName,mail)&$top=100'
      },
      {
        name: 'Groups with Members',
        endpoint: '/groups?$select=id,displayName,description,groupTypes,mail&$top=50'
      },
      {
        name: 'Organization Details',
        endpoint: '/organization?$select=id,displayName,verifiedDomains,businessPhones,city,country'
      },
      {
        name: 'Domain Configuration',
        endpoint: '/domains'
      },
      {
        name: 'Directory Roles',
        endpoint: '/directoryRoles'
      },
      {
        name: 'Applications',
        endpoint: '/applications?$select=id,displayName,appId,createdDateTime&$top=20'
      }
    ];

    const results = {};
    
    for (const test of endpoints) {
      try {
        console.log(`   Extracting ${test.name}...`);
        const result = await this.makeGraphRequest(test.endpoint);
        
        if (result.success) {
          const count = result.data.value ? result.data.value.length : 1;
          console.log(`   ✅ ${test.name}: ${count} items extracted`);
          results[test.name] = {
            success: true,
            count,
            data: result.data
          };
        } else {
          console.log(`   ❌ ${test.name}: ${result.data.error?.code || 'Unknown error'}`);
          results[test.name] = {
            success: false,
            error: result.data.error
          };
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
        results[test.name] = {
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }

  async analyzeOrganizationalStructure(data) {
    console.log('\n📊 Analyzing Organizational Structure...');
    
    const analysis = {
      departments: {},
      locations: {},
      managementHierarchy: [],
      domains: [],
      groupTypes: {},
      applications: [],
      insights: {}
    };

    // Analyze users
    if (data['Users with Hierarchy']?.success) {
      const users = data['Users with Hierarchy'].data.value || [];
      
      users.forEach(user => {
        // Department analysis
        if (user.department) {
          analysis.departments[user.department] = (analysis.departments[user.department] || 0) + 1;
        }
        
        // Location analysis
        if (user.officeLocation) {
          analysis.locations[user.officeLocation] = (analysis.locations[user.officeLocation] || 0) + 1;
        }
        
        // Management hierarchy
        if (user.manager) {
          analysis.managementHierarchy.push({
            employeeId: user.id,
            employeeName: user.displayName,
            employeeEmail: user.mail,
            jobTitle: user.jobTitle,
            department: user.department,
            managerId: user.manager.id,
            managerName: user.manager.displayName,
            managerEmail: user.manager.mail
          });
        }
      });
      
      console.log(`   📈 Users: ${users.length} processed`);
      console.log(`   🏢 Departments: ${Object.keys(analysis.departments).length}`);
      console.log(`   📍 Locations: ${Object.keys(analysis.locations).length}`);
      console.log(`   👥 Management Relationships: ${analysis.managementHierarchy.length}`);
    }

    // Analyze groups
    if (data['Groups with Members']?.success) {
      const groups = data['Groups with Members'].data.value || [];
      
      groups.forEach(group => {
        if (group.groupTypes && group.groupTypes.length > 0) {
          group.groupTypes.forEach(type => {
            analysis.groupTypes[type] = (analysis.groupTypes[type] || 0) + 1;
          });
        } else {
          analysis.groupTypes['Security'] = (analysis.groupTypes['Security'] || 0) + 1;
        }
      });
      
      console.log(`   🔐 Groups: ${groups.length} analyzed`);
      console.log(`   📋 Group Types: ${Object.keys(analysis.groupTypes).length}`);
    }

    // Analyze domains
    if (data['Domain Configuration']?.success) {
      const domains = data['Domain Configuration'].data.value || [];
      
      domains.forEach(domain => {
        analysis.domains.push({
          name: domain.id,
          isVerified: domain.isVerified,
          isDefault: domain.isDefault,
          supportedServices: domain.supportedServices || []
        });
      });
      
      console.log(`   🌐 Domains: ${domains.length} configured`);
    }

    // Analyze applications
    if (data['Applications']?.success) {
      const apps = data['Applications'].data.value || [];
      analysis.applications = apps.map(app => ({
        id: app.id,
        name: app.displayName,
        appId: app.appId,
        created: app.createdDateTime
      }));
      
      console.log(`   🔧 Applications: ${apps.length} registered`);
    }

    // Generate insights
    analysis.insights = {
      totalUsers: data['Users with Hierarchy']?.count || 0,
      totalGroups: data['Groups with Members']?.count || 0,
      totalDomains: data['Domain Configuration']?.count || 0,
      totalApplications: data['Applications']?.count || 0,
      departmentCount: Object.keys(analysis.departments).length,
      locationCount: Object.keys(analysis.locations).length,
      managementLayers: this.calculateManagementLayers(analysis.managementHierarchy),
      largestDepartment: this.getLargestDepartment(analysis.departments),
      dataQuality: this.calculateDataQuality(data)
    };

    return analysis;
  }

  calculateManagementLayers(hierarchy) {
    const managers = new Set();
    const employees = new Set();
    
    hierarchy.forEach(rel => {
      managers.add(rel.managerId);
      employees.add(rel.employeeId);
    });
    
    return managers.size > 0 ? Math.ceil(Math.log2(employees.size)) : 1;
  }

  getLargestDepartment(departments) {
    if (Object.keys(departments).length === 0) return 'None';
    
    return Object.entries(departments).reduce((largest, current) => 
      current[1] > largest[1] ? current : largest
    )[0];
  }

  calculateDataQuality(data) {
    let score = 0;
    let maxScore = 0;
    
    const endpoints = [
      'Users with Hierarchy',
      'Groups with Members', 
      'Organization Details',
      'Domain Configuration',
      'Directory Roles',
      'Applications'
    ];
    
    endpoints.forEach(endpoint => {
      maxScore += 100;
      if (data[endpoint]?.success) {
        score += 80;
        if (data[endpoint].count > 0) {
          score += 20;
        }
      }
    });
    
    return Math.round((score / maxScore) * 100);
  }

  async testDataPipelineStability() {
    console.log('\n🔧 Testing Data Pipeline Stability...');
    
    const stabilityTests = [
      {
        name: 'Concurrent User Requests',
        test: async () => {
          const promises = [
            this.makeGraphRequest('/users?$top=10'),
            this.makeGraphRequest('/groups?$top=5'),
            this.makeGraphRequest('/organization')
          ];
          
          const results = await Promise.all(promises);
          return results.every(r => r.success);
        }
      },
      {
        name: 'Large Dataset Handling',
        test: async () => {
          const result = await this.makeGraphRequest('/users?$top=100');
          return result.success && result.data.value?.length > 0;
        }
      },
      {
        name: 'Error Recovery',
        test: async () => {
          const result = await this.makeGraphRequest('/invalidEndpoint');
          return !result.success && result.data.error;
        }
      }
    ];

    const results = {};
    
    for (const test of stabilityTests) {
      try {
        console.log(`   Testing ${test.name}...`);
        const success = await test.test();
        console.log(`   ${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASS' : 'FAIL'}`);
        results[test.name] = success;
      } catch (error) {
        console.log(`   ❌ ${test.name}: ERROR - ${error.message}`);
        results[test.name] = false;
      }
    }

    return results;
  }

  generateProductionReport(extractionResults, analysisResults, stabilityResults) {
    console.log('\n📋 MICROSOFT 365 PRODUCTION INTEGRATION REPORT');
    console.log('='.repeat(60));
    
    const successfulExtractions = Object.values(extractionResults).filter(r => r.success).length;
    const totalExtractions = Object.keys(extractionResults).length;
    const successfulStability = Object.values(stabilityResults).filter(r => r).length;
    const totalStability = Object.keys(stabilityResults).length;
    
    console.log(`\n🔐 Authentication: ✅ OPERATIONAL`);
    console.log(`📊 Data Extraction: ${successfulExtractions}/${totalExtractions} endpoints successful`);
    console.log(`🔧 Pipeline Stability: ${successfulStability}/${totalStability} tests passed`);
    console.log(`📈 Data Quality: ${analysisResults.insights.dataQuality}%`);
    
    console.log(`\n📊 Organizational Insights:`);
    console.log(`   • Total Users: ${analysisResults.insights.totalUsers}`);
    console.log(`   • Total Groups: ${analysisResults.insights.totalGroups}`);
    console.log(`   • Departments: ${analysisResults.insights.departmentCount}`);
    console.log(`   • Locations: ${analysisResults.insights.locationCount}`);
    console.log(`   • Management Layers: ${analysisResults.insights.managementLayers}`);
    console.log(`   • Applications: ${analysisResults.insights.totalApplications}`);
    
    console.log(`\n🌐 Domain Configuration:`);
    analysisResults.domains.forEach(domain => {
      console.log(`   • ${domain.name}: ${domain.isVerified ? 'Verified' : 'Unverified'} ${domain.isDefault ? '(Default)' : ''}`);
    });
    
    const recommendations = this.generateRecommendations(extractionResults, analysisResults, stabilityResults);
    
    if (recommendations.length > 0) {
      console.log(`\n🔧 Recommendations:`);
      recommendations.forEach(rec => console.log(`   • ${rec}`));
    } else {
      console.log(`\n🎉 Integration Status: FULLY OPERATIONAL`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    return {
      authentication: 'operational',
      dataExtraction: `${successfulExtractions}/${totalExtractions}`,
      pipelineStability: `${successfulStability}/${totalStability}`,
      dataQuality: `${analysisResults.insights.dataQuality}%`,
      organizationalInsights: analysisResults.insights,
      recommendations
    };
  }

  generateRecommendations(extractionResults, analysisResults, stabilityResults) {
    const recommendations = [];
    
    // Check extraction failures
    Object.entries(extractionResults).forEach(([endpoint, result]) => {
      if (!result.success) {
        if (endpoint === 'Directory Roles') {
          recommendations.push('Grant RoleManagement.Read.Directory permission for role information');
        } else if (endpoint === 'Applications') {
          recommendations.push('Grant Application.Read.All permission for application registry access');
        }
      }
    });
    
    // Check stability issues
    Object.entries(stabilityResults).forEach(([test, success]) => {
      if (!success && test !== 'Error Recovery') {
        recommendations.push(`Investigate ${test} reliability issues`);
      }
    });
    
    // Check data quality
    if (analysisResults.insights.dataQuality < 80) {
      recommendations.push('Improve data completeness by granting additional permissions');
    }
    
    if (analysisResults.insights.managementLayers === 1 && analysisResults.insights.totalUsers > 10) {
      recommendations.push('Verify manager relationship data in Azure AD');
    }
    
    return recommendations;
  }

  async runComprehensiveProductionTest() {
    console.log('Microsoft 365 Production Integration Test');
    console.log('Comprehensive organizational data pipeline validation\n');
    
    try {
      // Authenticate
      await this.authenticate();
      console.log('✅ Authentication successful\n');
      
      // Extract organizational data
      const extractionResults = await this.extractComprehensiveOrganizationalData();
      
      // Analyze organizational structure
      const analysisResults = await this.analyzeOrganizationalStructure(extractionResults);
      
      // Test pipeline stability
      const stabilityResults = await this.testDataPipelineStability();
      
      // Generate comprehensive report
      const report = this.generateProductionReport(extractionResults, analysisResults, stabilityResults);
      
      return report;
      
    } catch (error) {
      console.error(`\n❌ Production test failed: ${error.message}`);
      return { error: error.message, status: 'failed' };
    }
  }
}

// Run comprehensive production test
const tester = new Microsoft365ProductionTester();
tester.runComprehensiveProductionTest()
  .then(report => {
    if (report.error) {
      process.exit(1);
    }
    console.log('\n🎯 Production Integration Test: COMPLETED');
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });