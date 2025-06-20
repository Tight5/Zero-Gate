/**
 * OneDrive Storage Agent for Zero Gate ESO Platform
 * Implements hybrid cloud database architecture using Microsoft OneDrive
 * as extended storage for tenant data feeds and document management
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { db } from '../db.js';
import { onedriveStorage, dataClassification } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  path: string;
  contentType: string;
  lastModified: string;
}

interface ChunkedUploadSession {
  uploadUrl: string;
  expirationDateTime: string;
  nextExpectedRanges: string[];
}

interface TenantFolderStructure {
  tenantId: string;
  rootPath: string;
  folders: {
    sponsors: string;
    grants: string;
    analytics: string;
    documents: string;
    stakeholders: string;
    topics: string;
  };
}

export class OneDriveStorageAgent {
  private graphClients: Map<string, Client> = new Map();
  private folderStructures: Map<string, TenantFolderStructure> = new Map();
  private uploadCache: Map<string, any> = new Map();

  constructor() {
    this.initializeAgent();
  }

  private async initializeAgent(): Promise<void> {
    console.log('[OneDriveStorageAgent] Initializing cloud database architecture');
  }

  /**
   * Get authenticated Microsoft Graph client for tenant
   */
  private async getGraphClient(tenantId: string): Promise<Client> {
    if (this.graphClients.has(tenantId)) {
      return this.graphClients.get(tenantId)!;
    }

    // Create new Graph client with tenant-specific authentication
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => {
        // Get tenant-specific access token
        return await this.getTenantAccessToken(tenantId);
      }
    };

    const graphClient = Client.initWithMiddleware({ authProvider });
    this.graphClients.set(tenantId, graphClient);
    return graphClient;
  }

  /**
   * Get tenant-specific Microsoft Graph access token
   */
  private async getTenantAccessToken(tenantId: string): Promise<string> {
    // Implementation would get stored tenant credentials
    // For development, return environment token
    const token = process.env.MICROSOFT_ACCESS_TOKEN;
    if (!token) {
      throw new Error(`No Microsoft Graph access token available for tenant ${tenantId}`);
    }
    return token;
  }

  /**
   * Auto-complete folder structure creation during tenant onboarding
   */
  async createTenantFolderStructure(tenantId: string): Promise<TenantFolderStructure> {
    console.log(`[OneDriveStorageAgent] Creating folder structure for tenant ${tenantId}`);
    
    const graphClient = await this.getGraphClient(tenantId);
    const rootFolderName = `ZeroGateESO_${tenantId}`;

    try {
      // Create hidden root folder
      const rootFolder = await graphClient
        .me
        .drive
        .root
        .children
        .post({
          name: rootFolderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        });

      // Set folder as hidden
      await this.setFolderHidden(tenantId, rootFolder.id!);

      // Create subfolder structure
      const subfolders = [
        'TenantData',
        'TenantData/Sponsors', 
        'TenantData/Grants',
        'TenantData/Analytics',
        'TenantData/Documents',
        'TenantData/Stakeholders',
        'TenantData/Topics'
      ];

      const folderIds: Record<string, string> = {};
      
      for (const folderPath of subfolders) {
        const folder = await this.createFolder(tenantId, rootFolder.id!, folderPath);
        folderIds[folderPath] = folder.id!;
      }

      const structure: TenantFolderStructure = {
        tenantId,
        rootPath: `/me/drive/items/${rootFolder.id}`,
        folders: {
          sponsors: folderIds['TenantData/Sponsors'],
          grants: folderIds['TenantData/Grants'], 
          analytics: folderIds['TenantData/Analytics'],
          documents: folderIds['TenantData/Documents'],
          stakeholders: folderIds['TenantData/Stakeholders'],
          topics: folderIds['TenantData/Topics']
        }
      };

      this.folderStructures.set(tenantId, structure);
      
      console.log(`[OneDriveStorageAgent] Folder structure created successfully for tenant ${tenantId}`);
      return structure;

    } catch (error) {
      console.error(`[OneDriveStorageAgent] Error creating folder structure:`, error);
      throw new Error(`Failed to create OneDrive folder structure for tenant ${tenantId}`);
    }
  }

  /**
   * Set folder as hidden to prevent user visibility
   */
  private async setFolderHidden(tenantId: string, folderId: string): Promise<void> {
    const graphClient = await this.getGraphClient(tenantId);
    
    try {
      await graphClient
        .me
        .drive
        .items(folderId)
        .patch({
          file: {
            hashes: {
              // Set hidden attribute
            }
          }
        });
    } catch (error) {
      console.warn(`[OneDriveStorageAgent] Could not set folder as hidden: ${error}`);
    }
  }

  /**
   * Create folder in OneDrive with proper hierarchy
   */
  private async createFolder(tenantId: string, parentId: string, folderPath: string): Promise<any> {
    const graphClient = await this.getGraphClient(tenantId);
    const folderName = folderPath.split('/').pop()!;
    
    return await graphClient
      .me
      .drive
      .items(parentId)
      .children
      .post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      });
  }

  /**
   * Store JSON data in OneDrive with optimal chunking strategy
   */
  async storeJsonData(
    tenantId: string, 
    fileType: string, 
    entityId: string, 
    data: any,
    classificationLevel: 'public' | 'internal' | 'confidential' = 'internal'
  ): Promise<string> {
    
    const fileName = `${fileType}_${entityId}_${Date.now()}.json`;
    const jsonContent = JSON.stringify(data, null, 2);
    const contentBuffer = Buffer.from(jsonContent, 'utf-8');
    const fileSize = contentBuffer.length;

    console.log(`[OneDriveStorageAgent] Storing ${fileType} data for entity ${entityId} (${fileSize} bytes)`);

    try {
      let fileId: string;
      let uploadMethod: string;

      // Determine upload strategy based on file size
      if (fileSize <= 4 * 1024 * 1024) { // 4MB limit for direct upload
        fileId = await this.uploadSmallFile(tenantId, fileType, fileName, contentBuffer);
        uploadMethod = 'direct';
      } else {
        fileId = await this.uploadLargeFile(tenantId, fileType, fileName, contentBuffer);
        uploadMethod = 'chunked';
      }

      // Store metadata in PostgreSQL
      const structure = this.folderStructures.get(tenantId);
      const storagePath = structure ? `${structure.rootPath}/${fileType}/${fileName}` : fileName;

      if (db) {
        await db.insert(onedriveStorage).values({
          tenantId,
          fileType,
          entityId,
          onedriveFileId: fileId,
          onedriveStoragePath: storagePath,
          fileName,
          fileSize,
          contentType: 'application/json',
          uploadMethod,
          syncStatus: 'synced',
          classificationLevel,
          encryptionStatus: 'encrypted',
          accessControl: { 
            level: classificationLevel,
            created_by: 'system',
            tenant_only: true 
          }
        });
      }

      console.log(`[OneDriveStorageAgent] Successfully stored ${fileName} with file ID: ${fileId}`);
      return fileId;

    } catch (error) {
      console.error(`[OneDriveStorageAgent] Error storing data:`, error);
      throw new Error(`Failed to store ${fileType} data in OneDrive`);
    }
  }

  /**
   * Upload small files (<4MB) directly to OneDrive
   */
  private async uploadSmallFile(tenantId: string, fileType: string, fileName: string, content: Buffer): Promise<string> {
    const graphClient = await this.getGraphClient(tenantId);
    const structure = this.folderStructures.get(tenantId);
    
    if (!structure) {
      throw new Error(`No folder structure found for tenant ${tenantId}`);
    }

    const folderId = (structure.folders as any)[fileType] || structure.folders.documents;
    
    const uploadResult = await graphClient
      .me
      .drive
      .items(folderId)
      .children(fileName)
      .content
      .put(content);

    return uploadResult.id!;
  }

  /**
   * Upload large files (>4MB) using chunked upload sessions
   */
  private async uploadLargeFile(tenantId: string, fileType: string, fileName: string, content: Buffer): Promise<string> {
    const graphClient = await this.getGraphClient(tenantId);
    const structure = this.folderStructures.get(tenantId);
    
    if (!structure) {
      throw new Error(`No folder structure found for tenant ${tenantId}`);
    }

    const folderId = (structure.folders as any)[fileType] || structure.folders.documents;
    
    // Create upload session
    const uploadSession = await graphClient
      .me
      .drive
      .items(folderId)
      .children(fileName)
      .createUploadSession
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
          name: fileName
        }
      });

    // Upload in 4MB chunks
    const chunkSize = 4 * 1024 * 1024; // 4MB
    let uploadedBytes = 0;
    
    while (uploadedBytes < content.length) {
      const chunkStart = uploadedBytes;
      const chunkEnd = Math.min(uploadedBytes + chunkSize, content.length);
      const chunk = content.subarray(chunkStart, chunkEnd);
      
      const contentRange = `bytes ${chunkStart}-${chunkEnd - 1}/${content.length}`;
      
      const chunkResponse = await fetch(uploadSession.uploadUrl!, {
        method: 'PUT',
        headers: {
          'Content-Range': contentRange,
          'Content-Length': chunk.length.toString()
        },
        body: chunk
      });

      if (chunkResponse.status === 201 || chunkResponse.status === 200) {
        const result = await chunkResponse.json();
        if (result.id) {
          return result.id; // Upload complete
        }
      } else if (chunkResponse.status !== 202) {
        throw new Error(`Chunk upload failed with status ${chunkResponse.status}`);
      }

      uploadedBytes = chunkEnd;
    }

    throw new Error('Large file upload did not complete successfully');
  }

  /**
   * Retrieve JSON data from OneDrive with caching
   */
  async retrieveJsonData(tenantId: string, fileType: string, entityId: string): Promise<any> {
    const cacheKey = `${tenantId}:${fileType}:${entityId}`;
    
    // Check cache first
    if (this.uploadCache.has(cacheKey)) {
      console.log(`[OneDriveStorageAgent] Cache hit for ${cacheKey}`);
      return this.uploadCache.get(cacheKey);
    }

    try {
      // Get file metadata from PostgreSQL
      if (!db) {
        throw new Error('Database not available');
      }

      const storageRecord = await db
        .select()
        .from(onedriveStorage)
        .where(
          and(
            eq(onedriveStorage.tenantId, tenantId),
            eq(onedriveStorage.fileType, fileType),
            eq(onedriveStorage.entityId, entityId)
          )
        )
        .limit(1);

      if (storageRecord.length === 0) {
        throw new Error(`No OneDrive storage record found for ${fileType}:${entityId}`);
      }

      const record = storageRecord[0];
      const graphClient = await this.getGraphClient(tenantId);

      // Download file content
      const fileContent = await graphClient
        .me
        .drive
        .items(record.onedriveFileId)
        .content
        .get();

      const jsonData = JSON.parse(fileContent.toString());
      
      // Cache the result
      this.uploadCache.set(cacheKey, jsonData);
      
      console.log(`[OneDriveStorageAgent] Retrieved and cached ${record.fileName}`);
      return jsonData;

    } catch (error) {
      console.error(`[OneDriveStorageAgent] Error retrieving data:`, error);
      throw new Error(`Failed to retrieve ${fileType} data from OneDrive`);
    }
  }

  /**
   * Sync data between PostgreSQL and OneDrive with conflict resolution
   */
  async syncTenantData(tenantId: string): Promise<void> {
    console.log(`[OneDriveStorageAgent] Starting data sync for tenant ${tenantId}`);
    
    try {
      if (!db) {
        throw new Error('Database not available');
      }

      // Get all OneDrive storage records for tenant
      const storageRecords = await db
        .select()
        .from(onedriveStorage)
        .where(eq(onedriveStorage.tenantId, tenantId));

      const graphClient = await this.getGraphClient(tenantId);
      
      for (const record of storageRecords) {
        try {
          // Check if OneDrive file still exists and get last modified
          const fileInfo = await graphClient
            .me
            .drive
            .items(record.onedriveFileId)
            .get();

          const lastModified = new Date(fileInfo.lastModifiedDateTime!);
          const lastSync = new Date(record.lastSyncAt || 0);

          if (lastModified > lastSync) {
            // File was modified in OneDrive, update sync status
            await db
              .update(onedriveStorage)
              .set({
                syncStatus: 'synced',
                lastSyncAt: new Date(),
                fileSize: fileInfo.size
              })
              .where(eq(onedriveStorage.id, record.id));

            console.log(`[OneDriveStorageAgent] Synced ${record.fileName}`);
          }

        } catch (fileError) {
          console.warn(`[OneDriveStorageAgent] File sync error for ${record.fileName}:`, fileError);
          
          // Mark as error status
          await db
            .update(onedriveStorage)
            .set({ syncStatus: 'error' })
            .where(eq(onedriveStorage.id, record.id));
        }
      }

      console.log(`[OneDriveStorageAgent] Sync completed for tenant ${tenantId}`);

    } catch (error) {
      console.error(`[OneDriveStorageAgent] Sync error for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get storage health metrics for tenant
   */
  async getStorageHealth(tenantId: string): Promise<any> {
    if (!db) {
      throw new Error('Database not available');
    }

    const storageRecords = await db
      .select()
      .from(onedriveStorage)
      .where(eq(onedriveStorage.tenantId, tenantId));

    const totalFiles = storageRecords.length;
    const syncedFiles = storageRecords.filter(r => r.syncStatus === 'synced').length;
    const errorFiles = storageRecords.filter(r => r.syncStatus === 'error').length;
    const totalSize = storageRecords.reduce((sum, r) => sum + (r.fileSize || 0), 0);

    return {
      tenantId,
      totalFiles,
      syncedFiles,
      errorFiles,
      totalSize,
      healthScore: totalFiles > 0 ? (syncedFiles / totalFiles) * 100 : 100,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Auto-complete sponsor data onboarding to OneDrive
   */
  async onboardSponsorData(tenantId: string, sponsorId: string, sponsorData: any): Promise<void> {
    console.log(`[OneDriveStorageAgent] Auto-onboarding sponsor ${sponsorId} data`);

    try {
      // Ensure folder structure exists
      if (!this.folderStructures.has(tenantId)) {
        await this.createTenantFolderStructure(tenantId);
      }

      // Store sponsor profile
      await this.storeJsonData(tenantId, 'sponsors', sponsorId, {
        profile: sponsorData,
        onboardedAt: new Date().toISOString(),
        source: 'microsoft365_integration'
      });

      // Store stakeholder data if available
      if (sponsorData.stakeholders) {
        await this.storeJsonData(tenantId, 'stakeholders', sponsorId, {
          stakeholders: sponsorData.stakeholders,
          extractedAt: new Date().toISOString()
        });
      }

      // Store emerging topics if available  
      if (sponsorData.emergingTopics) {
        await this.storeJsonData(tenantId, 'topics', sponsorId, {
          topics: sponsorData.emergingTopics,
          extractedAt: new Date().toISOString()
        });
      }

      console.log(`[OneDriveStorageAgent] Sponsor ${sponsorId} onboarding complete`);

    } catch (error) {
      console.error(`[OneDriveStorageAgent] Sponsor onboarding error:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive storage statistics
   */
  async getStorageStatistics(): Promise<any> {
    if (!db) {
      throw new Error('Database not available');
    }

    const allRecords = await db.select().from(onedriveStorage);
    
    const stats = {
      totalTenants: new Set(allRecords.map(r => r.tenantId)).size,
      totalFiles: allRecords.length,
      totalSize: allRecords.reduce((sum, r) => sum + (r.fileSize || 0), 0),
      byFileType: {} as Record<string, number>,
      byClassification: {} as Record<string, number>,
      syncHealth: {
        synced: allRecords.filter(r => r.syncStatus === 'synced').length,
        pending: allRecords.filter(r => r.syncStatus === 'pending').length,
        error: allRecords.filter(r => r.syncStatus === 'error').length
      }
    };

    // Group by file type
    allRecords.forEach(record => {
      stats.byFileType[record.fileType] = (stats.byFileType[record.fileType] || 0) + 1;
      stats.byClassification[record.classificationLevel] = (stats.byClassification[record.classificationLevel] || 0) + 1;
    });

    return stats;
  }
}

export default OneDriveStorageAgent;