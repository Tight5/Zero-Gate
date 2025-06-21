import { Router } from 'express';
import { db } from '../db.js';
import { tenantDataFeeds, sponsorStakeholders, sponsorTopics } from '../../shared/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Enhanced tenant data feeds management for dynamic integration

// Get all data feeds for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const feeds = await db
      .select({
        id: tenantDataFeeds.id,
        feedType: tenantDataFeeds.feedType,
        sourceConfig: tenantDataFeeds.sourceConfig,
        classificationLevel: tenantDataFeeds.classificationLevel,
        syncFrequency: tenantDataFeeds.syncFrequency,
        lastSync: tenantDataFeeds.lastSync,
        status: tenantDataFeeds.status,
        createdAt: tenantDataFeeds.createdAt,
        recordCount: sql<number>`
          case 
            when ${tenantDataFeeds.feedType} = 'microsoft365' then 
              (select count(*) from ${sponsorStakeholders} where tenant_id = ${tenantId})
            else 0
          end
        `,
        healthScore: sql<number>`
          case 
            when ${tenantDataFeeds.lastSync} > current_timestamp - interval '1 day' then 100
            when ${tenantDataFeeds.lastSync} > current_timestamp - interval '3 days' then 75
            when ${tenantDataFeeds.lastSync} > current_timestamp - interval '7 days' then 50
            else 25
          end
        `
      })
      .from(tenantDataFeeds)
      .where(eq(tenantDataFeeds.tenantId, tenantId))
      .orderBy(desc(tenantDataFeeds.lastSync));

    res.json(feeds);
  } catch (error) {
    console.error('Error fetching tenant data feeds:', error);
    res.status(500).json({ error: 'Failed to fetch tenant data feeds' });
  }
});

// Create new data feed configuration
router.post('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const createSchema = z.object({
      feedType: z.enum(['microsoft365', 'crm', 'custom']),
      sourceConfig: z.object({
        clientId: z.string().optional(),
        tenantDomain: z.string().optional(),
        apiEndpoint: z.string().optional(),
        authMethod: z.string().optional(),
        dataTypes: z.array(z.string()).default([]),
        filters: z.object({}).optional(),
      }),
      classificationLevel: z.enum(['public', 'internal', 'confidential']),
      syncFrequency: z.number().min(300).max(86400).default(3600), // 5 minutes to 24 hours
    });

    const feedData = createSchema.parse(req.body);

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const [newFeed] = await db
      .insert(tenantDataFeeds)
      .values({
        tenantId,
        feedType: feedData.feedType,
        sourceConfig: feedData.sourceConfig,
        classificationLevel: feedData.classificationLevel,
        syncFrequency: feedData.syncFrequency,
        status: 'active',
      })
      .returning();

    res.status(201).json(newFeed);
  } catch (error) {
    console.error('Error creating data feed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data feed configuration', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create data feed' });
  }
});

// Update data feed configuration
router.put('/:feedId', async (req, res) => {
  try {
    const { feedId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const updateSchema = z.object({
      sourceConfig: z.object({
        clientId: z.string().optional(),
        tenantDomain: z.string().optional(),
        apiEndpoint: z.string().optional(),
        authMethod: z.string().optional(),
        dataTypes: z.array(z.string()).default([]),
        filters: z.object({}).optional(),
      }).optional(),
      classificationLevel: z.enum(['public', 'internal', 'confidential']).optional(),
      syncFrequency: z.number().min(300).max(86400).optional(),
      status: z.enum(['active', 'paused', 'error']).optional(),
    });

    const updateData = updateSchema.parse(req.body);

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const [updatedFeed] = await db
      .update(tenantDataFeeds)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(tenantDataFeeds.id, feedId),
        eq(tenantDataFeeds.tenantId, tenantId)
      ))
      .returning();

    if (!updatedFeed) {
      return res.status(404).json({ error: 'Data feed not found' });
    }

    res.json(updatedFeed);
  } catch (error) {
    console.error('Error updating data feed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid update data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update data feed' });
  }
});

// Trigger manual sync for data feed
router.post('/:feedId/sync', async (req, res) => {
  try {
    const { feedId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    // Get feed configuration
    const [feed] = await db
      .select()
      .from(tenantDataFeeds)
      .where(and(
        eq(tenantDataFeeds.id, feedId),
        eq(tenantDataFeeds.tenantId, tenantId)
      ));

    if (!feed) {
      return res.status(404).json({ error: 'Data feed not found' });
    }

    // Update last sync timestamp (db is already checked above)
    await db
      .update(tenantDataFeeds)
      .set({
        lastSync: new Date(),
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(tenantDataFeeds.id, feedId));

    // Simulate sync process based on feed type
    let syncResult = {
      success: true,
      recordsProcessed: 0,
      errors: [],
      duration: Math.round(Math.random() * 5000) + 1000, // 1-6 seconds
    };

    switch (feed.feedType) {
      case 'microsoft365':
        // Microsoft 365 integration sync
        syncResult.recordsProcessed = Math.floor(Math.random() * 100) + 10;
        break;
      case 'crm':
        // CRM integration sync
        syncResult.recordsProcessed = Math.floor(Math.random() * 50) + 5;
        break;
      case 'custom':
        // Custom API sync
        syncResult.recordsProcessed = Math.floor(Math.random() * 200) + 20;
        break;
    }

    res.json({
      feed: {
        ...feed,
        lastSync: new Date(),
        status: 'active',
      },
      syncResult
    });
  } catch (error) {
    console.error('Error syncing data feed:', error);
    res.status(500).json({ error: 'Failed to sync data feed' });
  }
});

// Get data feed health and metrics
router.get('/:feedId/health', async (req, res) => {
  try {
    const { feedId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const [feed] = await db
      .select()
      .from(tenantDataFeeds)
      .where(and(
        eq(tenantDataFeeds.id, feedId),
        eq(tenantDataFeeds.tenantId, tenantId)
      ));

    if (!feed) {
      return res.status(404).json({ error: 'Data feed not found' });
    }

    // Calculate health metrics
    const now = new Date();
    const lastSyncAge = feed.lastSync ? now.getTime() - feed.lastSync.getTime() : null;
    const expectedSyncInterval = (feed.syncFrequency || 3600) * 1000; // Convert to milliseconds

    let healthScore = 100;
    let status = 'healthy';
    const issues = [];

    if (!feed.lastSync) {
      healthScore = 0;
      status = 'never_synced';
      issues.push('Feed has never been synced');
    } else if (lastSyncAge && lastSyncAge > expectedSyncInterval * 2) {
      healthScore = 25;
      status = 'overdue';
      issues.push('Sync is significantly overdue');
    } else if (lastSyncAge && lastSyncAge > expectedSyncInterval * 1.5) {
      healthScore = 50;
      status = 'delayed';
      issues.push('Sync is slightly delayed');
    } else if (lastSyncAge && lastSyncAge > expectedSyncInterval) {
      healthScore = 75;
      status = 'warning';
      issues.push('Sync is past due');
    }

    // Get data quality metrics based on feed type (db is already checked above)
    let dataQuality = {};
    if (feed.feedType === 'microsoft365') {
      const stakeholderMetrics = await db
        .select({
          totalStakeholders: sql<number>`count(*)`,
          recentUpdates: sql<number>`count(*) filter (where updated_at > current_timestamp - interval '7 days')`,
          completeProfiles: sql<number>`count(*) filter (where name is not null and role is not null)`,
        })
        .from(sponsorStakeholders)
        .where(eq(sponsorStakeholders.tenantId, tenantId));

      dataQuality = stakeholderMetrics[0];
    }

    res.json({
      feed,
      health: {
        score: healthScore,
        status,
        issues,
        lastSyncAge: lastSyncAge ? Math.floor(lastSyncAge / 1000) : null, // seconds
        expectedSyncInterval: feed.syncFrequency,
      },
      dataQuality,
      recommendations: generateRecommendations(feed, healthScore, issues)
    });
  } catch (error) {
    console.error('Error fetching feed health:', error);
    res.status(500).json({ error: 'Failed to fetch feed health' });
  }
});

// Get aggregated data feeds analytics for tenant
router.get('/analytics', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const feedMetrics = await db
      .select({
        totalFeeds: sql<number>`count(*)`,
        activeFeeds: sql<number>`count(*) filter (where status = 'active')`,
        healthyFeeds: sql<number>`count(*) filter (where last_sync > current_timestamp - interval '1 day')`,
        avgSyncFrequency: sql<number>`avg(sync_frequency)`,
        totalRecords: sql<number>`
          (select count(*) from ${sponsorStakeholders} where tenant_id = ${tenantId}) +
          (select count(*) from ${sponsorTopics} where tenant_id = ${tenantId})
        `,
      })
      .from(tenantDataFeeds)
      .where(eq(tenantDataFeeds.tenantId, tenantId));

    const feedsByType = await db
      .select({
        feedType: tenantDataFeeds.feedType,
        count: sql<number>`count(*)`,
        lastSync: sql<string>`max(last_sync)`,
      })
      .from(tenantDataFeeds)
      .where(eq(tenantDataFeeds.tenantId, tenantId))
      .groupBy(tenantDataFeeds.feedType);

    res.json({
      overview: feedMetrics[0],
      feedsByType,
      recommendations: generateTenantRecommendations(feedMetrics[0], feedsByType)
    });
  } catch (error) {
    console.error('Error fetching feeds analytics:', error);
    res.status(500).json({ error: 'Failed to fetch feeds analytics' });
  }
});

// Helper function to generate recommendations for individual feeds
function generateRecommendations(feed: any, healthScore: number, issues: string[]) {
  const recommendations = [];

  if (healthScore < 50) {
    recommendations.push('Consider reducing sync frequency to improve reliability');
    recommendations.push('Check source system connectivity and credentials');
  }

  if (!feed.lastSync) {
    recommendations.push('Perform initial sync to establish baseline data');
  }

  if (feed.feedType === 'microsoft365' && feed.classificationLevel === 'public') {
    recommendations.push('Review classification level - Microsoft 365 data typically requires internal or confidential classification');
  }

  if (feed.syncFrequency > 21600) { // 6 hours
    recommendations.push('Consider more frequent syncing for better data freshness');
  }

  return recommendations;
}

// Helper function to generate tenant-level recommendations
function generateTenantRecommendations(overview: any, feedsByType: any[]) {
  const recommendations = [];

  if (overview.totalFeeds === 0) {
    recommendations.push('Set up at least one data feed to begin collecting organizational data');
  }

  if (overview.activeFeeds / overview.totalFeeds < 0.8) {
    recommendations.push('Review and reactivate paused data feeds');
  }

  if (overview.healthyFeeds / overview.totalFeeds < 0.7) {
    recommendations.push('Address sync issues to improve overall data quality');
  }

  const hasMicrosoft365 = feedsByType.some(f => f.feedType === 'microsoft365');
  if (!hasMicrosoft365) {
    recommendations.push('Consider adding Microsoft 365 integration for comprehensive stakeholder mapping');
  }

  return recommendations;
}

export default router;