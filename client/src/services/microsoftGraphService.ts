/**
 * Microsoft Graph Service
 * Frontend interface for Microsoft Graph integration with comprehensive error handling
 * Implements the specification from attached asset 17
 */

import { apiService } from './apiService';

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface GraphUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
}

export interface GraphPerson {
  id: string;
  displayName: string;
  scoredEmailAddresses: Array<{
    address: string;
    relevanceScore: number;
  }>;
  jobTitle?: string;
  companyName?: string;
  department?: string;
}

export interface GraphFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  createdDateTime: string;
  file?: {
    mimeType: string;
    hashes: {
      quickXorHash?: string;
      sha1Hash?: string;
    };
  };
  folder?: {
    childCount: number;
  };
}

export interface WorkbookData {
  id: string;
  name: string;
  worksheets: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

export interface WorksheetData {
  values: any[][];
  headers: string[];
  range: string;
}

export interface RelationshipData {
  manager?: GraphPerson;
  directReports: GraphPerson[];
  colleagues: GraphPerson[];
  collaborators: GraphPerson[];
}

export interface CollaborationAnalysis {
  collaborationScore: number;
  topCollaborators: Array<{
    person: GraphPerson;
    score: number;
    interactions: number;
  }>;
  communicationPatterns: {
    emailFrequency: number;
    meetingFrequency: number;
    documentSharing: number;
  };
  meetingInsights: {
    totalMeetings: number;
    averageDuration: number;
    recurringMeetings: number;
  };
}

export interface PeopleOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FilesOptions {
  driveId?: string;
  folderId?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}

class MicrosoftGraphService {
  private endpoints = {
    authorize: '/api/integration/auth/microsoft',
    token: '/api/integration/auth/microsoft/token',
    me: '/api/integration/microsoft/me',
    files: '/api/integration/microsoft/files',
    workbooks: '/api/integration/microsoft/workbooks',
    people: '/api/integration/microsoft/people',
    relationships: '/api/integration/microsoft/relationships'
  };

  async getAuthorizationUrl(tenantId: string, redirectUri: string): Promise<string> {
    try {
      const response = await apiService.post(this.endpoints.authorize, {
        tenantId,
        redirectUri,
        scopes: [
          'User.Read',
          'People.Read',
          'Files.Read',
          'Sites.Read.All',
          'Calendars.Read',
          'Mail.Read'
        ]
      });

      if (response.success) {
        return response.data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error: any) {
      console.error('Get authorization URL error:', error);
      throw new Error(error.message || 'Failed to initiate Microsoft authorization');
    }
  }

  async exchangeCodeForToken(code: string, state: string): Promise<AuthTokenResponse> {
    try {
      const response = await apiService.post(this.endpoints.token, {
        code,
        state
      });

      if (response.success) {
        // Store connection status
        this.setConnectedStatus(true);
        
        return {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresAt: response.data.expiresAt
        };
      } else {
        throw new Error('Token exchange failed');
      }
    } catch (error: any) {
      console.error('Token exchange error:', error);
      throw new Error(error.message || 'Failed to exchange authorization code');
    }
  }

  async getCurrentUser(): Promise<GraphUser> {
    try {
      const response = await apiService.get(this.endpoints.me);
      
      if (response.success) {
        return response.data.user;
      } else {
        throw new Error('Failed to get current user');
      }
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw new Error(error.message || 'Failed to retrieve user information');
    }
  }

  async getPeople(options: PeopleOptions = {}): Promise<{
    people: GraphPerson[];
    hasMore: boolean;
    total: number;
  }> {
    try {
      const queryParams = new URLSearchParams({
        search: options.search || '',
        top: (options.limit || 50).toString(),
        skip: (options.offset || 0).toString()
      });

      const response = await apiService.get(`${this.endpoints.people}?${queryParams}`);
      
      if (response.success) {
        return {
          people: response.data.people || [],
          hasMore: response.data.hasMore || false,
          total: response.data.total || 0
        };
      } else {
        throw new Error('Failed to get people');
      }
    } catch (error: any) {
      console.error('Get people error:', error);
      throw new Error(error.message || 'Failed to retrieve people from Microsoft Graph');
    }
  }

  async getFiles(options: FilesOptions = {}): Promise<{
    files: GraphFile[];
    hasMore: boolean;
    total: number;
  }> {
    try {
      const queryParams = new URLSearchParams({
        driveId: options.driveId || '',
        folderId: options.folderId || '',
        fileType: options.fileType || '',
        top: (options.limit || 50).toString(),
        skip: (options.offset || 0).toString()
      });

      const response = await apiService.get(`${this.endpoints.files}?${queryParams}`);
      
      if (response.success) {
        return {
          files: response.data.files || [],
          hasMore: response.data.hasMore || false,
          total: response.data.total || 0
        };
      } else {
        throw new Error('Failed to get files');
      }
    } catch (error: any) {
      console.error('Get files error:', error);
      throw new Error(error.message || 'Failed to retrieve files from OneDrive');
    }
  }

  async getWorkbook(fileId: string, driveId?: string): Promise<WorkbookData> {
    try {
      const params = driveId ? `?driveId=${driveId}` : '';
      const response = await apiService.get(`${this.endpoints.workbooks}/${fileId}${params}`);
      
      if (response.success) {
        return response.data.workbook;
      } else {
        throw new Error('Failed to get workbook');
      }
    } catch (error: any) {
      console.error('Get workbook error:', error);
      throw new Error(error.message || 'Failed to retrieve Excel workbook');
    }
  }

  async getWorksheetData(
    fileId: string, 
    worksheetId: string, 
    range?: string, 
    driveId?: string
  ): Promise<WorksheetData> {
    try {
      const queryParams = new URLSearchParams();
      if (driveId) queryParams.set('driveId', driveId);
      if (range) queryParams.set('range', range);

      const response = await apiService.get(
        `${this.endpoints.workbooks}/${fileId}/worksheets/${worksheetId}/data?${queryParams}`
      );
      
      if (response.success) {
        return {
          values: response.data.values || [],
          headers: response.data.headers || [],
          range: response.data.range || ''
        };
      } else {
        throw new Error('Failed to get worksheet data');
      }
    } catch (error: any) {
      console.error('Get worksheet data error:', error);
      throw new Error(error.message || 'Failed to retrieve worksheet data');
    }
  }

  async extractRelationships(userId: string = 'me'): Promise<RelationshipData> {
    try {
      const response = await apiService.get(`${this.endpoints.relationships}/${userId}`);
      
      if (response.success) {
        return {
          manager: response.data.manager,
          directReports: response.data.directReports || [],
          colleagues: response.data.colleagues || [],
          collaborators: response.data.collaborators || []
        };
      } else {
        throw new Error('Failed to extract relationships');
      }
    } catch (error: any) {
      console.error('Extract relationships error:', error);
      throw new Error(error.message || 'Failed to extract relationship data');
    }
  }

  async analyzeCollaboration(
    userId: string = 'me', 
    timeframe: string = '30days'
  ): Promise<CollaborationAnalysis> {
    try {
      const response = await apiService.get(
        `${this.endpoints.relationships}/${userId}/collaboration?timeframe=${timeframe}`
      );
      
      if (response.success) {
        return {
          collaborationScore: response.data.collaborationScore || 0,
          topCollaborators: response.data.topCollaborators || [],
          communicationPatterns: response.data.communicationPatterns || {},
          meetingInsights: response.data.meetingInsights || {}
        };
      } else {
        throw new Error('Failed to analyze collaboration');
      }
    } catch (error: any) {
      console.error('Analyze collaboration error:', error);
      throw new Error(error.message || 'Failed to analyze collaboration patterns');
    }
  }

  async disconnectAccount(): Promise<boolean> {
    try {
      const response = await apiService.delete(this.endpoints.token);
      
      if (response.success) {
        this.setConnectedStatus(false);
        localStorage.removeItem('msGraphLastSync');
        localStorage.removeItem('msGraphPermissions');
        return true;
      } else {
        throw new Error('Failed to disconnect account');
      }
    } catch (error: any) {
      console.error('Disconnect account error:', error);
      throw new Error(error.message || 'Failed to disconnect Microsoft account');
    }
  }

  // Utility methods
  isConnected(): boolean {
    return localStorage.getItem('msGraphConnected') === 'true';
  }

  setConnectedStatus(connected: boolean): void {
    localStorage.setItem('msGraphConnected', connected.toString());
    if (connected) {
      localStorage.setItem('msGraphLastSync', new Date().toISOString());
    }
  }

  getConnectionStatus(): {
    connected: boolean;
    lastSync: string | null;
    permissions: string[];
  } {
    return {
      connected: this.isConnected(),
      lastSync: localStorage.getItem('msGraphLastSync'),
      permissions: JSON.parse(localStorage.getItem('msGraphPermissions') || '[]')
    };
  }

  setPermissions(permissions: string[]): void {
    localStorage.setItem('msGraphPermissions', JSON.stringify(permissions));
  }
}

export const microsoftGraphService = new MicrosoftGraphService();
export default microsoftGraphService;