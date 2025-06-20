/**
 * Microsoft 365 Integration Production Routes
 * Stable data pipeline for organizational data extraction
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

// Execute Python integration agent
async function executePythonAgent(script: string, args: string[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [script, ...args], {
      cwd: process.cwd(),
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          resolve({ success: true, output: stdout, raw: true });
        }
      } else {
        reject(new Error(`Python process failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Health check for Microsoft 365 integration
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Direct authentication test
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    const healthStatus = {
      credentials: {
        client_id: !!clientId,
        client_secret: !!clientSecret,
        tenant_id: !!tenantId
      },
      authentication: { status: 'unknown' },
      permissions: { accessible_endpoints: 0, total_tested: 6 },
      data_pipeline: { status: 'unknown' },
      timestamp: new Date().toISOString()
    };

    if (!clientId || !clientSecret || !tenantId) {
      return res.json({
        success: false,
        overall_status: 'configuration_error',
        health_status: healthStatus,
        recommendations: ['Configure Microsoft 365 credentials in environment variables']
      });
    }

    // Test authentication
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      healthStatus.authentication = { status: 'healthy' };

      // Test key endpoints
      const endpointTests = [
        '/organization',
        '/users?$top=1',
        '/groups?$top=1',
        '/applications?$top=1',
        '/servicePrincipals?$top=1',
        '/domains'
      ];

      let accessibleCount = 0;
      const endpointResults = [];

      for (const endpoint of endpointTests) {
        try {
          const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          const accessible = response.ok;
          if (accessible) accessibleCount++;
          
          endpointResults.push({
            endpoint,
            accessible,
            status: response.status
          });
        } catch (error) {
          endpointResults.push({
            endpoint,
            accessible: false,
            error: 'Request failed'
          });
        }
      }

      healthStatus.permissions = {
        accessible_endpoints: accessibleCount,
        total_tested: endpointTests.length
      };

      // Test data pipeline with small sample
      try {
        const usersResponse = await fetch('https://graph.microsoft.com/v1.0/users?$top=5&$select=id,displayName,department', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          healthStatus.data_pipeline = {
            status: 'healthy'
          };
        } else {
          healthStatus.data_pipeline = {
            status: 'degraded'
          };
        }
      } catch (error) {
        healthStatus.data_pipeline = {
          status: 'unhealthy'
        };
      }
    } else {
      const errorData = await tokenResponse.json();
      healthStatus.authentication = {
        status: 'unhealthy'
      };
    }

    // Overall assessment
    const isHealthy = healthStatus.authentication.status === 'healthy' &&
                     healthStatus.permissions.accessible_endpoints >= 4 &&
                     healthStatus.data_pipeline.status === 'healthy';

    res.json({
      success: true,
      overall_status: isHealthy ? 'healthy' : 'degraded',
      health_status: healthStatus,
      recommendations: generateHealthRecommendations(healthStatus)
    });

  } catch (error: any) {
    console.error('Microsoft 365 health check error:', error);
    res.status(500).json({
      success: false,
      overall_status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Extract organizational data
router.get('/data/organizational/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId && userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const msftTenantId = process.env.MICROSOFT_TENANT_ID;

    if (!clientId || !clientSecret || !msftTenantId) {
      return res.status(400).json({
        success: false,
        error: 'Microsoft 365 credentials not configured'
      });
    }

    // Authenticate and extract organizational data
    const tokenUrl = `https://login.microsoftonline.com/${msftTenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Parallel requests for comprehensive organizational data
    const [usersResponse, groupsResponse, orgResponse, domainsResponse] = await Promise.all([
      fetch('https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,manager&$expand=manager($select=displayName,mail)&$top=100', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch('https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,groupTypes,mail&$top=50', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch('https://graph.microsoft.com/v1.0/organization?$select=id,displayName,verifiedDomains,businessPhones,city,country', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch('https://graph.microsoft.com/v1.0/domains', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    const [users, groups, organization, domains] = await Promise.all([
      usersResponse.ok ? usersResponse.json() : { error: await usersResponse.json() },
      groupsResponse.ok ? groupsResponse.json() : { error: await groupsResponse.json() },
      orgResponse.ok ? orgResponse.json() : { error: await orgResponse.json() },
      domainsResponse.ok ? domainsResponse.json() : { error: await domainsResponse.json() }
    ]);

    // Process and analyze organizational structure
    const organizationalData = {
      tenant_id: tenantId,
      users: {
        success: usersResponse.ok,
        count: users.value?.length || 0,
        data: users.value || []
      },
      groups: {
        success: groupsResponse.ok,
        count: groups.value?.length || 0,
        data: groups.value || []
      },
      organization: {
        success: orgResponse.ok,
        data: organization.value?.[0] || organization
      },
      domains: {
        success: domainsResponse.ok,
        count: domains.value?.length || 0,
        data: domains.value || []
      },
      analysis: {
        departments: {},
        locations: {},
        management_hierarchy: [],
        domain_analysis: {},
        group_types: {}
      },
      extraction_timestamp: new Date().toISOString()
    };

    // Analyze user data for organizational insights
    if (users.value) {
      const departments: Record<string, number> = {};
      const locations: Record<string, number> = {};
      const managementHierarchy: any[] = [];

      users.value.forEach((user: any) => {
        // Department analysis
        if (user.department) {
          departments[user.department] = (departments[user.department] || 0) + 1;
        }

        // Location analysis
        if (user.officeLocation) {
          locations[user.officeLocation] = (locations[user.officeLocation] || 0) + 1;
        }

        // Management hierarchy
        if (user.manager) {
          managementHierarchy.push({
            employee_id: user.id,
            employee_name: user.displayName,
            employee_email: user.mail,
            manager_name: user.manager.displayName,
            manager_email: user.manager.mail,
            department: user.department,
            job_title: user.jobTitle
          });
        }
      });

      organizationalData.analysis.departments = departments;
      organizationalData.analysis.locations = locations;
      organizationalData.analysis.management_hierarchy = managementHierarchy;
    }

    // Analyze groups
    if (groups.value) {
      const groupTypes = {};
      groups.value.forEach((group: any) => {
        if (group.groupTypes && group.groupTypes.length > 0) {
          group.groupTypes.forEach((type: string) => {
            groupTypes[type] = (groupTypes[type] || 0) + 1;
          });
        } else {
          groupTypes['Security'] = (groupTypes['Security'] || 0) + 1;
        }
      });
      organizationalData.analysis.group_types = groupTypes;
    }

    // Analyze domains
    if (domains.value) {
      const domainAnalysis = {};
      domains.value.forEach((domain: any) => {
        domainAnalysis[domain.id] = {
          is_verified: domain.isVerified,
          is_default: domain.isDefault,
          supported_services: domain.supportedServices || []
        };
      });
      organizationalData.analysis.domain_analysis = domainAnalysis;
    }

    // Generate insights summary
    organizationalData.insights = {
      total_users: organizationalData.users.count,
      total_groups: organizationalData.groups.count,
      total_domains: organizationalData.domains.count,
      department_count: Object.keys(organizationalData.analysis.departments).length,
      location_count: Object.keys(organizationalData.analysis.locations).length,
      management_relationships: organizationalData.analysis.management_hierarchy.length,
      largest_department: organizationalData.analysis.departments ? 
        Object.entries(organizationalData.analysis.departments).reduce((a, b) => a[1] > b[1] ? a : b, ['None', 0])[0] : 'None',
      data_quality: calculateDataQuality(organizationalData)
    };

    res.json({
      success: true,
      data: organizationalData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Organizational data extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract organizational data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test specific permissions
router.get('/permissions/verify', async (req: Request, res: Response) => {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Microsoft 365 credentials not configured'
      });
    }

    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });

    if (!tokenResponse.ok) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Comprehensive permission testing
    const permissionTests = [
      { name: 'Organization Read', endpoint: '/organization', scope: 'Organization.Read.All' },
      { name: 'Users Read', endpoint: '/users?$top=1', scope: 'User.Read.All' },
      { name: 'Groups Read', endpoint: '/groups?$top=1', scope: 'Group.Read.All' },
      { name: 'Directory Read', endpoint: '/directoryObjects?$top=1', scope: 'Directory.Read.All' },
      { name: 'Applications Read', endpoint: '/applications?$top=1', scope: 'Application.Read.All' },
      { name: 'Service Principals Read', endpoint: '/servicePrincipals?$top=1', scope: 'Application.Read.All' },
      { name: 'Domains Read', endpoint: '/domains', scope: 'Domain.Read.All' },
      { name: 'Directory Roles Read', endpoint: '/directoryRoles', scope: 'RoleManagement.Read.Directory' },
      { name: 'Subscribed SKUs Read', endpoint: '/subscribedSkus', scope: 'Organization.Read.All' },
      { name: 'Devices Read', endpoint: '/devices?$top=1', scope: 'Device.Read.All' }
    ];

    const results = await Promise.all(
      permissionTests.map(async (test) => {
        try {
          const response = await fetch(`https://graph.microsoft.com/v1.0${test.endpoint}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          const data = await response.json();
          
          return {
            name: test.name,
            endpoint: test.endpoint,
            scope: test.scope,
            status: response.status,
            success: response.ok,
            data_count: data.value ? data.value.length : (response.ok ? 1 : 0),
            error: !response.ok ? data.error : null
          };
        } catch (error: any) {
          return {
            name: test.name,
            endpoint: test.endpoint,
            scope: test.scope,
            status: 0,
            success: false,
            error: error.message
          };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      summary: {
        total_permissions_tested: results.length,
        successful_permissions: successful.length,
        failed_permissions: failed.length,
        success_rate: `${Math.round((successful.length / results.length) * 100)}%`
      },
      permissions: {
        granted: successful,
        denied: failed
      },
      recommendations: generatePermissionRecommendations(failed),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Permission verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Permission verification failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions
function generateHealthRecommendations(healthStatus: any): string[] {
  const recommendations = [];

  if (!healthStatus.credentials.client_id) {
    recommendations.push('Configure MICROSOFT_CLIENT_ID environment variable');
  }
  if (!healthStatus.credentials.client_secret) {
    recommendations.push('Configure MICROSOFT_CLIENT_SECRET environment variable');
  }
  if (!healthStatus.credentials.tenant_id) {
    recommendations.push('Configure MICROSOFT_TENANT_ID environment variable');
  }
  if (healthStatus.authentication.status === 'unhealthy') {
    recommendations.push('Verify Microsoft 365 application registration and credentials');
  }
  if (healthStatus.permissions.accessible_endpoints < 4) {
    recommendations.push('Grant additional Graph API permissions in Azure AD');
  }
  if (healthStatus.data_pipeline.status !== 'healthy') {
    recommendations.push('Verify organizational data access permissions');
  }

  if (recommendations.length === 0) {
    recommendations.push('Microsoft 365 integration is fully operational');
  }

  return recommendations;
}

function generatePermissionRecommendations(failedPermissions: any[]): string[] {
  const recommendations = [];
  
  const scopeMap = {
    'Organization.Read.All': 'Grant Organization.Read.All permission for tenant information',
    'User.Read.All': 'Grant User.Read.All permission for user directory access',
    'Group.Read.All': 'Grant Group.Read.All permission for group information',
    'Directory.Read.All': 'Grant Directory.Read.All permission for full directory access',
    'Application.Read.All': 'Grant Application.Read.All permission for application data',
    'Domain.Read.All': 'Grant Domain.Read.All permission for domain information',
    'RoleManagement.Read.Directory': 'Grant RoleManagement.Read.Directory for role information',
    'Device.Read.All': 'Grant Device.Read.All permission for device management'
  };

  const uniqueScopes = [...new Set(failedPermissions.map(p => p.scope))];
  
  uniqueScopes.forEach(scope => {
    if (scopeMap[scope]) {
      recommendations.push(scopeMap[scope]);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('All tested permissions are properly granted');
  }

  return recommendations;
}

function calculateDataQuality(data: any): number {
  let qualityScore = 0;
  let totalChecks = 0;

  // Check users data quality
  if (data.users.success) {
    qualityScore += 25;
    if (data.users.count > 0) qualityScore += 15;
    if (data.analysis.departments && Object.keys(data.analysis.departments).length > 0) qualityScore += 10;
    if (data.analysis.management_hierarchy.length > 0) qualityScore += 10;
  }
  totalChecks += 60;

  // Check groups data quality
  if (data.groups.success) {
    qualityScore += 15;
    if (data.groups.count > 0) qualityScore += 10;
  }
  totalChecks += 25;

  // Check organization data quality
  if (data.organization.success) {
    qualityScore += 15;
  }
  totalChecks += 15;

  return Math.round((qualityScore / totalChecks) * 100);
}

export default router;