import { Router } from 'express';
import { db } from '../db.js';
import { sponsors, sponsorStakeholders, sponsorTopics } from '../../shared/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Database connection guard
const checkDbConnection = () => {
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

// Enhanced sponsor endpoints with stakeholder and topic management

// Get all sponsors with stakeholder and topic counts
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const sponsorsWithMetrics = await checkDbConnection()
      .select({
        id: sponsors.id,
        name: sponsors.name,
        organization: sponsors.organization,
        domain: sponsors.domain,
        email: sponsors.email,
        type: sponsors.type,
        relationshipStrength: sponsors.relationshipStrength,
        stakeholderCount: sql<number>`count(distinct ${sponsorStakeholders.id})`,
        topicCount: sql<number>`count(distinct ${sponsorTopics.id})`,
        lastContactDate: sponsors.lastContactDate,
        createdAt: sponsors.createdAt,
      })
      .from(sponsors)
      .leftJoin(sponsorStakeholders, eq(sponsors.id, sponsorStakeholders.sponsorId))
      .leftJoin(sponsorTopics, eq(sponsors.id, sponsorTopics.sponsorId))
      .where(eq(sponsors.tenantId, tenantId))
      .groupBy(sponsors.id)
      .orderBy(desc(sponsors.lastContactDate));

    res.json(sponsorsWithMetrics);
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

// Get sponsor stakeholders with Microsoft 365 integration data
router.get('/:sponsorId/stakeholders', async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;

    const stakeholders = await checkDbConnection()
      .select()
      .from(sponsorStakeholders)
      .where(and(
        eq(sponsorStakeholders.sponsorId, sponsorId),
        eq(sponsorStakeholders.tenantId, tenantId)
      ))
      .orderBy(desc(sponsorStakeholders.influenceScore));

    res.json(stakeholders);
  } catch (error) {
    console.error('Error fetching stakeholders:', error);
    res.status(500).json({ error: 'Failed to fetch stakeholders' });
  }
});

// Get sponsor emerging topics from communication analysis
router.get('/:sponsorId/topics', async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const topics = await db
      .select()
      .from(sponsorTopics)
      .where(and(
        eq(sponsorTopics.sponsorId, sponsorId),
        eq(sponsorTopics.tenantId, tenantId)
      ))
      .orderBy(desc(sponsorTopics.relevanceScore));

    res.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// Sync stakeholders from Microsoft 365 integration
router.post('/:sponsorId/sync-stakeholders', async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const syncSchema = z.object({
      stakeholders: z.array(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        role: z.string().optional(),
        department: z.string().optional(),
        orgLevel: z.number().optional(),
        communicationFrequency: z.number().default(0),
        lastInteraction: z.string().optional(),
        influenceScore: z.number().min(0).max(1).optional(),
        relationshipStrength: z.enum(['weak', 'moderate', 'strong']).optional(),
      }))
    });

    const { stakeholders: stakeholderData } = syncSchema.parse(req.body);

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    // Insert or update stakeholders
    const insertedStakeholders = [];
    for (const stakeholder of stakeholderData) {
      const [insertedStakeholder] = await db
        .insert(sponsorStakeholders)
        .values({
          sponsorId,
          tenantId,
          email: stakeholder.email,
          name: stakeholder.name,
          role: stakeholder.role,
          department: stakeholder.department,
          orgLevel: stakeholder.orgLevel,
          communicationFrequency: stakeholder.communicationFrequency,
          lastInteraction: stakeholder.lastInteraction ? new Date(stakeholder.lastInteraction) : null,
          influenceScore: stakeholder.influenceScore?.toString(),
          relationshipStrength: stakeholder.relationshipStrength,
          sourceFeed: 'microsoft365',
        })
        .onConflictDoUpdate({
          target: [sponsorStakeholders.sponsorId, sponsorStakeholders.email],
          set: {
            name: stakeholder.name,
            role: stakeholder.role,
            department: stakeholder.department,
            orgLevel: stakeholder.orgLevel,
            communicationFrequency: stakeholder.communicationFrequency,
            lastInteraction: stakeholder.lastInteraction ? new Date(stakeholder.lastInteraction) : null,
            influenceScore: stakeholder.influenceScore?.toString(),
            relationshipStrength: stakeholder.relationshipStrength,
            updatedAt: new Date(),
          }
        })
        .returning();

      insertedStakeholders.push(insertedStakeholder);
    }

    res.json({
      success: true,
      syncedCount: insertedStakeholders.length,
      stakeholders: insertedStakeholders
    });
  } catch (error) {
    console.error('Error syncing stakeholders:', error);
    res.status(500).json({ error: 'Failed to sync stakeholders' });
  }
});

// Sync emerging topics from communication analysis
router.post('/:sponsorId/sync-topics', async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const syncSchema = z.object({
      topics: z.array(z.object({
        topicName: z.string(),
        relevanceScore: z.number().min(0).max(1),
        frequency: z.number().default(1),
        firstMentioned: z.string().optional(),
        lastMentioned: z.string().optional(),
        sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
        keywords: z.array(z.string()).default([]),
        sourceEmails: z.number().default(0),
      }))
    });

    const { topics: topicData } = syncSchema.parse(req.body);

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    // Insert or update topics
    const insertedTopics = [];
    for (const topic of topicData) {
      const [insertedTopic] = await db
        .insert(sponsorTopics)
        .values({
          sponsorId,
          tenantId,
          topicName: topic.topicName,
          relevanceScore: topic.relevanceScore.toString(),
          frequency: topic.frequency,
          firstMentioned: topic.firstMentioned ? new Date(topic.firstMentioned) : null,
          lastMentioned: topic.lastMentioned ? new Date(topic.lastMentioned) : null,
          sentiment: topic.sentiment,
          keywords: topic.keywords,
          sourceEmails: topic.sourceEmails,
        })
        .onConflictDoUpdate({
          target: [sponsorTopics.sponsorId, sponsorTopics.topicName],
          set: {
            relevanceScore: topic.relevanceScore.toString(),
            frequency: topic.frequency,
            lastMentioned: topic.lastMentioned ? new Date(topic.lastMentioned) : null,
            sentiment: topic.sentiment,
            keywords: topic.keywords,
            sourceEmails: topic.sourceEmails,
            updatedAt: new Date(),
          }
        })
        .returning();

      insertedTopics.push(insertedTopic);
    }

    res.json({
      success: true,
      syncedCount: insertedTopics.length,
      topics: insertedTopics
    });
  } catch (error) {
    console.error('Error syncing topics:', error);
    res.status(500).json({ error: 'Failed to sync topics' });
  }
});

// Get sponsor analytics with stakeholder and topic insights
router.get('/:sponsorId/analytics', async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    // Get sponsor with stakeholder and topic analytics
    const [sponsor] = await db
      .select()
      .from(sponsors)
      .where(and(eq(sponsors.id, sponsorId), eq(sponsors.tenantId, tenantId)));

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    // Get stakeholder metrics (db is already checked above)
    const stakeholderMetrics = await db
      .select({
        totalStakeholders: sql<number>`count(*)`,
        averageInfluence: sql<number>`avg(${sponsorStakeholders.influenceScore})`,
        strongRelationships: sql<number>`count(*) filter (where ${sponsorStakeholders.relationshipStrength} = 'strong')`,
        recentInteractions: sql<number>`count(*) filter (where ${sponsorStakeholders.lastInteraction} > current_date - interval '30 days')`,
      })
      .from(sponsorStakeholders)
      .where(and(
        eq(sponsorStakeholders.sponsorId, sponsorId),
        eq(sponsorStakeholders.tenantId, tenantId)
      ));

    // Get topic insights (db is already checked above)
    const topicInsights = await db
      .select({
        totalTopics: sql<number>`count(*)`,
        averageRelevance: sql<number>`avg(${sponsorTopics.relevanceScore})`,
        positiveTopics: sql<number>`count(*) filter (where ${sponsorTopics.sentiment} = 'positive')`,
        recentTopics: sql<number>`count(*) filter (where ${sponsorTopics.lastMentioned} > current_date - interval '30 days')`,
      })
      .from(sponsorTopics)
      .where(and(
        eq(sponsorTopics.sponsorId, sponsorId),
        eq(sponsorTopics.tenantId, tenantId)
      ));

    res.json({
      sponsor,
      stakeholderMetrics: stakeholderMetrics[0],
      topicInsights: topicInsights[0],
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sponsor analytics:', error);
    res.status(500).json({ error: 'Failed to fetch sponsor analytics' });
  }
});

export default router;