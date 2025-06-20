/**
 * OneDrive Storage API Routes for Zero Gate ESO Platform
 * Implements cloud database architecture endpoints for dynamic tenant data feeds
 */

import { Router } from 'express';
import { db } from '../db.js';
import { onedriveStorage, dataClassification, sponsors } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import OneDriveStorageAgent from '../agents/onedrive-storage.js';

const router = Router();
const storageAgent = new OneDriveStorageAgent();

// Database connection guard
const checkDbConnection = () => {
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Validation schemas
const storeDataSchema = z.object({
  fileType: z.enum(['sponsor_profile', 'stakeholder_data', 'analytics', 'documents', 'topics']),
  entityId: z.string().uuid(),
  data: z.any(),
  classificationLevel: z.enum(['public', 'internal', 'confidential']).optional()
});

const onboardSponsorSchema = z.object({
  sponsorId: z.string().uuid(),
  sponsorData: z.object({
    profile: z.any(),
    stakeholders: z.any().optional(),
    emergingTopics: z.any().optional()
  })
});

/**
 * Initialize OneDrive folder structure for tenant
 * POST /api/onedrive-storage/initialize
 */
router.post('/initialize', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tenant ID required' 
      });
    }

    console.log(`[OneDriveStorage] Initializing folder structure for tenant ${tenantId}`);
    
    const folderStructure = await storageAgent.createTenantFolderStructure(tenantId);
    
    res.json({
      success: true,
      tenantId,
      folderStructure,
      message: 'OneDrive folder structure created successfully'
    });

  } catch (error) {
    console.error('[OneDriveStorage] Initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize OneDrive storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store data in OneDrive with automatic classification
 * POST /api/onedrive-storage/store
 */
router.post('/store', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const validatedData = storeDataSchema.parse(req.body);
    
    console.log(`[OneDriveStorage] Storing ${validatedData.fileType} data for entity ${validatedData.entityId}`);
    
    const fileId = await storageAgent.storeJsonData(
      tenantId,
      validatedData.fileType,
      validatedData.entityId,
      validatedData.data,
      validatedData.classificationLevel || 'internal'
    );

    res.json({
      success: true,
      tenantId,
      fileId,
      fileType: validatedData.fileType,
      entityId: validatedData.entityId,
      message: 'Data stored successfully in OneDrive'
    });

  } catch (error) {
    console.error('[OneDriveStorage] Store error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store data in OneDrive',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Retrieve data from OneDrive
 * GET /api/onedrive-storage/:fileType/:entityId
 */
router.get('/:fileType/:entityId', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { fileType, entityId } = req.params;

    console.log(`[OneDriveStorage] Retrieving ${fileType} data for entity ${entityId}`);
    
    const data = await storageAgent.retrieveJsonData(tenantId, fileType, entityId);
    
    res.json({
      success: true,
      tenantId,
      fileType,
      entityId,
      data,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Retrieve error:', error);
    res.status(404).json({
      success: false,
      error: 'Data not found in OneDrive storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Auto-complete sponsor onboarding with OneDrive integration
 * POST /api/onedrive-storage/onboard-sponsor
 */
router.post('/onboard-sponsor', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const validatedData = onboardSponsorSchema.parse(req.body);
    
    console.log(`[OneDriveStorage] Auto-onboarding sponsor ${validatedData.sponsorId}`);
    
    // Auto-complete sponsor data onboarding
    await storageAgent.onboardSponsorData(
      tenantId,
      validatedData.sponsorId,
      validatedData.sponsorData
    );

    // Update sponsor record with OneDrive integration flag
    await checkDbConnection()
      .update(sponsors)
      .set({
        updatedAt: new Date()
      })
      .where(
        and(
          eq(sponsors.id, validatedData.sponsorId),
          eq(sponsors.tenantId, tenantId)
        )
      );

    res.json({
      success: true,
      tenantId,
      sponsorId: validatedData.sponsorId,
      message: 'Sponsor auto-onboarding completed successfully',
      onboardedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Sponsor onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to onboard sponsor to OneDrive',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Sync tenant data between PostgreSQL and OneDrive
 * POST /api/onedrive-storage/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    console.log(`[OneDriveStorage] Starting data sync for tenant ${tenantId}`);
    
    await storageAgent.syncTenantData(tenantId);
    
    res.json({
      success: true,
      tenantId,
      message: 'Data synchronization completed successfully',
      syncedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync tenant data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get OneDrive storage health metrics for tenant
 * GET /api/onedrive-storage/health
 */
router.get('/health', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const healthMetrics = await storageAgent.getStorageHealth(tenantId);
    
    res.json({
      success: true,
      tenantId,
      health: healthMetrics,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage health metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all OneDrive storage records for tenant
 * GET /api/onedrive-storage/records
 */
router.get('/records', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const records = await checkDbConnection()
      .select()
      .from(onedriveStorage)
      .where(eq(onedriveStorage.tenantId, tenantId))
      .orderBy(desc(onedriveStorage.createdAt));

    res.json({
      success: true,
      tenantId,
      records,
      totalRecords: records.length,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Records retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve storage records',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get data classification rules for tenant
 * GET /api/onedrive-storage/classification
 */
router.get('/classification', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const classifications = await checkDbConnection()
      .select()
      .from(dataClassification)
      .where(eq(dataClassification.tenantId, tenantId))
      .orderBy(desc(dataClassification.createdAt));

    res.json({
      success: true,
      tenantId,
      classifications,
      totalRules: classifications.length,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Classification retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve classification rules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Admin-only: Get comprehensive storage statistics
 * GET /api/onedrive-storage/admin/statistics
 */
router.get('/admin/statistics', async (req, res) => {
  try {
    const isAdmin = (req as any).isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const statistics = await storageAgent.getStorageStatistics();
    
    res.json({
      success: true,
      statistics,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate storage statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create data classification rule
 * POST /api/onedrive-storage/classification
 */
router.post('/classification', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { dataType, sensitivityLevel, retentionPeriod, accessControl, storageLocation } = req.body;

    const newClassification = await checkDbConnection()
      .insert(dataClassification)
      .values({
        tenantId,
        dataType,
        sensitivityLevel,
        retentionPeriod,
        accessControl,
        storageLocation: storageLocation || 'postgresql'
      })
      .returning();

    res.json({
      success: true,
      tenantId,
      classification: newClassification[0],
      message: 'Data classification rule created successfully'
    });

  } catch (error) {
    console.error('[OneDriveStorage] Classification creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create classification rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test OneDrive connectivity for tenant
 * GET /api/onedrive-storage/test-connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    // Test by attempting to access tenant's OneDrive
    const testData = { test: true, timestamp: new Date().toISOString() };
    const testEntityId = `test-${Date.now()}`;
    
    // Store test file
    const fileId = await storageAgent.storeJsonData(
      tenantId,
      'documents',
      testEntityId,
      testData,
      'internal'
    );
    
    // Retrieve test file to verify connectivity
    const retrievedData = await storageAgent.retrieveJsonData(
      tenantId,
      'documents', 
      testEntityId
    );
    
    const connectionValid = retrievedData.test === true;
    
    res.json({
      success: true,
      tenantId,
      connectionValid,
      testFileId: fileId,
      message: connectionValid ? 'OneDrive connection successful' : 'OneDrive connection test failed',
      testedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OneDriveStorage] Connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'OneDrive connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;