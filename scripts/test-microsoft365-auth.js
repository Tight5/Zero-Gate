#!/usr/bin/env node
/**
 * Microsoft 365 Authentication and Permission Testing Script
 * Direct testing of organizational data access and global admin capabilities
 */

import https from 'https';
import { URLSearchParams } from 'url';

// Microsoft Graph API endpoints
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA_URL = 'https://graph.microsoft.com/beta';

class Microsoft365Tester {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.tenantId = process.env.MICROSOFT_TENANT_ID;
    this.accessToken = null;
  }

  async getAccessToken() {
    return new Promise((resolve, reject) => {
      if (!this.clientId || !this.clientSecret || !this.tenantId) {
        reject(new Error('Missing Microsoft 365 credentials'));
        return;
      }

      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      const tokenBody = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      }).toString();

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
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200) {
              this.accessToken = response.access_token;
              resolve(response);
            } else {
              reject(new Error(`Authentication failed: ${response.error_description || response.error}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse token response: ${error.message}`));
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
      if (!this.accessToken) {
        reject(new Error('No access token available'));
        return;
      }

      const url = `${GRAPH_BASE_URL}${endpoint}`;
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({
              status: res.statusCode,
              success: res.statusCode >= 200 && res.statusCode < 300,
              data: response
            });
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async testAuthentication() {
    console.log('🔐 Testing Microsoft 365 Authentication...');
    
    try {
      const tokenResponse = await this.getAccessToken();
      console.log('✅ Authentication successful');
      console.log(`   Token Type: ${tokenResponse.token_type}`);
      console.log(`   Expires In: ${tokenResponse.expires_in} seconds`);
      console.log(`   Scope: ${tokenResponse.scope || 'Default scope'}`);
      return true;
    } catch (error) {
      console.log('❌ Authentication failed');
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }

  async testOrganizationalData() {
    console.log('\n🏢 Testing Organizational Data Access...');
    
    const tests = [
      { name: 'Organization Info', endpoint: '/organization' },
      { name: 'Users', endpoint: '/users?$top=5&$select=id,displayName,userPrincipalName,department,jobTitle' },
      { name: 'Groups', endpoint: '/groups?$top=5&$select=id,displayName,description,groupTypes' },
      { name: 'Directory Objects', endpoint: '/directoryObjects?$top=5' },
      { name: 'Applications', endpoint: '/applications?$top=5&$select=id,displayName,appId' },
      { name: 'Service Principals', endpoint: '/servicePrincipals?$top=5&$select=id,displayName,appId' }
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        console.log(`   Testing ${test.name}...`);
        const result = await this.makeGraphRequest(test.endpoint);
        
        if (result.success) {
          const count = result.data.value ? result.data.value.length : 1;
          console.log(`   ✅ ${test.name}: ${count} items retrieved`);
          results.push({ ...test, success: true, count, data: result.data });
        } else {
          console.log(`   ❌ ${test.name}: ${result.data.error?.code || 'Unknown error'}`);
          results.push({ ...test, success: false, error: result.data.error });
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
        results.push({ ...test, success: false, error: error.message });
      }
    }

    return results;
  }

  async testAdvancedPermissions() {
    console.log('\n🔒 Testing Advanced Permissions...');
    
    const advancedTests = [
      { name: 'User Management', endpoint: '/users?$top=1&$select=id,displayName,assignedLicenses' },
      { name: 'Group Membership', endpoint: '/groups?$expand=members($select=id,displayName)&$top=1' },
      { name: 'Directory Roles', endpoint: '/directoryRoles' },
      { name: 'Subscribed SKUs', endpoint: '/subscribedSkus' },
      { name: 'Domains', endpoint: '/domains' },
      { name: 'Contacts', endpoint: '/contacts?$top=5' },
      { name: 'Devices', endpoint: '/devices?$top=5' },
      { name: 'Reports Access', endpoint: '/reports/getOffice365ActiveUserDetail(period=\'D7\')' }
    ];

    const results = [];
    
    for (const test of advancedTests) {
      try {
        console.log(`   Testing ${test.name}...`);
        const result = await this.makeGraphRequest(test.endpoint);
        
        if (result.success) {
          const count = result.data.value ? result.data.value.length : 1;
          console.log(`   ✅ ${test.name}: Access granted (${count} items)`);
          results.push({ ...test, success: true, count });
        } else {
          const errorCode = result.data.error?.code || 'Unknown';
          console.log(`   ❌ ${test.name}: ${errorCode}`);
          results.push({ ...test, success: false, error: errorCode });
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
        results.push({ ...test, success: false, error: error.message });
      }
    }

    return results;
  }

  async testDataPipeline() {
    console.log('\n📊 Testing Data Pipeline Stability...');
    
    try {
      // Test organizational hierarchy extraction
      const usersResult = await this.makeGraphRequest('/users?$select=id,displayName,department,manager&$expand=manager($select=displayName)&$top=20');
      
      if (usersResult.success && usersResult.data.value) {
        const users = usersResult.data.value;
        const departments = {};
        const hierarchyMappings = [];
        
        users.forEach(user => {
          if (user.department) {
            departments[user.department] = (departments[user.department] || 0) + 1;
          }
          if (user.manager) {
            hierarchyMappings.push({
              employee: user.displayName,
              manager: user.manager.displayName,
              department: user.department
            });
          }
        });

        console.log(`   ✅ Data Pipeline: ${users.length} users processed`);
        console.log(`   📈 Departments: ${Object.keys(departments).length}`);
        console.log(`   🔗 Manager Relationships: ${hierarchyMappings.length}`);
        
        return {
          success: true,
          userCount: users.length,
          departments: Object.keys(departments).length,
          relationships: hierarchyMappings.length,
          sampleData: {
            departments: departments,
            hierarchyMappings: hierarchyMappings.slice(0, 3)
          }
        };
      } else {
        console.log('   ❌ Data Pipeline: Failed to retrieve user data');
        return { success: false, error: usersResult.data.error };
      }
    } catch (error) {
      console.log(`   ❌ Data Pipeline: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  generateReport(authResult, orgResults, advancedResults, pipelineResult) {
    console.log('\n📋 MICROSOFT 365 INTEGRATION REPORT');
    console.log('='.repeat(50));
    
    const successfulOrg = orgResults.filter(r => r.success).length;
    const successfulAdvanced = advancedResults.filter(r => r.success).length;
    
    console.log(`\n🔐 Authentication: ${authResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📊 Organizational Data: ${successfulOrg}/${orgResults.length} endpoints accessible`);
    console.log(`🔒 Advanced Permissions: ${successfulAdvanced}/${advancedResults.length} endpoints accessible`);
    console.log(`📈 Data Pipeline: ${pipelineResult.success ? '✅ STABLE' : '❌ UNSTABLE'}`);
    
    if (pipelineResult.success) {
      console.log(`\n📊 Pipeline Metrics:`);
      console.log(`   • Users: ${pipelineResult.userCount}`);
      console.log(`   • Departments: ${pipelineResult.departments}`);
      console.log(`   • Relationships: ${pipelineResult.relationships}`);
    }

    const recommendations = [];
    
    if (!authResult) {
      recommendations.push('Verify Microsoft 365 application registration and credentials');
    }
    
    if (successfulOrg < orgResults.length) {
      recommendations.push('Grant additional organizational permissions (User.Read.All, Group.Read.All)');
    }
    
    if (successfulAdvanced < advancedResults.length) {
      recommendations.push('Enable advanced permissions for full admin capabilities');
    }
    
    if (!pipelineResult.success) {
      recommendations.push('Fix data pipeline connectivity issues');
    }

    if (recommendations.length === 0) {
      console.log('\n🎉 All systems operational - Microsoft 365 integration is fully functional');
    } else {
      console.log('\n🔧 Recommendations:');
      recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\n' + '='.repeat(50));
  }

  async runComprehensiveTest() {
    console.log('Microsoft 365 Integration Testing Suite');
    console.log('Testing global admin access and organizational data pipeline\n');
    
    const authResult = await this.testAuthentication();
    
    if (!authResult) {
      console.log('\n❌ Cannot proceed - authentication failed');
      return;
    }

    const orgResults = await this.testOrganizationalData();
    const advancedResults = await this.testAdvancedPermissions();
    const pipelineResult = await this.testDataPipeline();
    
    this.generateReport(authResult, orgResults, advancedResults, pipelineResult);
  }
}

// Run the comprehensive test
const tester = new Microsoft365Tester();
tester.runComprehensiveTest().catch(console.error);