import { Router, type Request, type Response } from 'express';
import { SponsorDiscoveryAgent } from '../agents/sponsor-discovery';
import { getDb } from '../db';
import { sponsorDiscovery, agentTasks, sponsors } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Initiate smart sponsor onboarding with Microsoft 365 discovery
router.post('/discover/:sponsorId', async (req: Request, res: Response) => {
  try {
    const { sponsorId } = req.params;
    const { sponsorDomain, accessToken } = req.body;
    const tenantId = (req as any).tenantId;
    
    if (!sponsorDomain || !accessToken) {
      return res.status(400).json({ 
        error: 'Sponsor domain and Microsoft 365 access token required for discovery' 
      });
    }

    // Create agent task for tracking
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const taskResult = await db.insert(agentTasks)
      .values({
        tenantId,
        taskType: 'sponsor_discovery',
        targetId: sponsorId,
        status: 'queued',
        priority: 2,
        agentType: 'integration',
        taskData: { sponsorDomain, discoveryType: 'microsoft365' },
        createdAt: new Date()
      })
      .returning({ id: agentTasks.id });

    const taskId = taskResult[0].id;

    // Start discovery process asynchronously
    setImmediate(async () => {
      try {
        await db.update(agentTasks)
          .set({ status: 'processing', startedAt: new Date() })
          .where(eq(agentTasks.id, taskId));

        const discoveryAgent = new SponsorDiscoveryAgent(accessToken);
        await discoveryAgent.discoverSponsorOrganization(tenantId, sponsorDomain);

        await db.update(agentTasks)
          .set({ 
            status: 'completed', 
            completedAt: new Date(),
            results: { message: 'Discovery completed successfully' }
          })
          .where(eq(agentTasks.id, taskId));

      } catch (error) {
        console.error('Discovery process failed:', error);
        await db.update(agentTasks)
          .set({ 
            status: 'failed', 
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          })
          .where(eq(agentTasks.id, taskId));
      }
    });

    res.json({
      taskId,
      status: 'queued',
      message: 'Sponsor discovery initiated. Use /status endpoint to track progress.',
      tenantId
    });

  } catch (error) {
    console.error('Error initiating sponsor discovery:', error);
    res.status(500).json({ error: 'Failed to initiate sponsor discovery' });
  }
});

// Get discovery status and results
router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const task = await db.select()
      .from(agentTasks)
      .where(and(
        eq(agentTasks.id, taskId),
        eq(agentTasks.tenantId, tenantId)
      ))
      .limit(1);

    if (!task.length) {
      return res.status(404).json({ error: 'Discovery task not found' });
    }

    const taskData = task[0];
    let discoveryData = null;

    // If completed, get discovery results
    if (taskData.status === 'completed' && taskData.targetId) {
      const discovery = await db.select()
        .from(sponsorDiscovery)
        .where(and(
          eq(sponsorDiscovery.sponsorId, taskData.targetId),
          eq(sponsorDiscovery.tenantId, tenantId)
        ))
        .limit(1);

      if (discovery.length) {
        discoveryData = discovery[0];
      }
    }

    res.json({
      taskId: taskData.id,
      status: taskData.status,
      progress: getProgressPercentage(taskData.status),
      startedAt: taskData.startedAt,
      completedAt: taskData.completedAt,
      errorMessage: taskData.errorMessage,
      results: taskData.results,
      discoveryData,
      tenantId
    });

  } catch (error) {
    console.error('Error getting discovery status:', error);
    res.status(500).json({ error: 'Failed to get discovery status' });
  }
});

// Get sponsor organization intelligence
router.get('/organization/:sponsorId', async (req: Request, res: Response) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const discovery = await db.select()
      .from(sponsorDiscovery)
      .where(and(
        eq(sponsorDiscovery.sponsorId, sponsorId),
        eq(sponsorDiscovery.tenantId, tenantId)
      ))
      .limit(1);

    if (!discovery.length) {
      return res.status(404).json({ error: 'Sponsor organization data not found' });
    }

    const orgData = discovery[0];

    res.json({
      sponsorId,
      discoveryStatus: orgData.discoveryStatus,
      stakeholderPrincipals: orgData.stakeholderPrincipals,
      emergingTopics: orgData.emergingTopics,
      communicationPatterns: orgData.communicationPatterns,
      relationshipStrength: orgData.relationshipStrength,
      organizationStructure: orgData.microsoft365Data,
      lastAnalysisDate: orgData.lastAnalysisDate,
      insights: generateOrganizationInsights(orgData),
      tenantId
    });

  } catch (error) {
    console.error('Error getting sponsor organization data:', error);
    res.status(500).json({ error: 'Failed to get sponsor organization data' });
  }
});

// Get stakeholder principals for sponsor
router.get('/stakeholders/:sponsorId', async (req: Request, res: Response) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const discovery = await db.select({
      stakeholderPrincipals: sponsorDiscovery.stakeholderPrincipals,
      emergingTopics: sponsorDiscovery.emergingTopics,
      communicationPatterns: sponsorDiscovery.communicationPatterns
    })
      .from(sponsorDiscovery)
      .where(and(
        eq(sponsorDiscovery.sponsorId, sponsorId),
        eq(sponsorDiscovery.tenantId, tenantId)
      ))
      .limit(1);

    if (!discovery.length) {
      return res.status(404).json({ error: 'Stakeholder data not found' });
    }

    const data = discovery[0];
    const stakeholders = data.stakeholderPrincipals as any[] || [];

    res.json({
      sponsorId,
      stakeholders: stakeholders.map(stakeholder => ({
        ...stakeholder,
        engagementStrategy: generateEngagementStrategy(stakeholder),
        topicRelevance: calculateTopicRelevance(stakeholder, data.emergingTopics as any[])
      })),
      emergingTopics: data.emergingTopics,
      communicationInsights: data.communicationPatterns,
      tenantId
    });

  } catch (error) {
    console.error('Error getting stakeholder data:', error);
    res.status(500).json({ error: 'Failed to get stakeholder data' });
  }
});

// Get emerging topics analysis
router.get('/topics/:sponsorId', async (req: Request, res: Response) => {
  try {
    const { sponsorId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const discovery = await db.select({
      emergingTopics: sponsorDiscovery.emergingTopics,
      stakeholderPrincipals: sponsorDiscovery.stakeholderPrincipals,
      lastAnalysisDate: sponsorDiscovery.lastAnalysisDate
    })
      .from(sponsorDiscovery)
      .where(and(
        eq(sponsorDiscovery.sponsorId, sponsorId),
        eq(sponsorDiscovery.tenantId, tenantId)
      ))
      .limit(1);

    if (!discovery.length) {
      return res.status(404).json({ error: 'Topics analysis not found' });
    }

    const data = discovery[0];
    const topics = data.emergingTopics as any[] || [];

    res.json({
      sponsorId,
      topics: topics.map(topic => ({
        ...topic,
        stakeholderRelevance: calculateStakeholderRelevance(topic, data.stakeholderPrincipals as any[]),
        contentSuggestions: generateContentSuggestions(topic),
        engagementOpportunities: generateEngagementOpportunities(topic)
      })),
      analysisDate: data.lastAnalysisDate,
      totalTopics: topics.length,
      topicsDistribution: analyzeTopicsDistribution(topics),
      tenantId
    });

  } catch (error) {
    console.error('Error getting topics analysis:', error);
    res.status(500).json({ error: 'Failed to get topics analysis' });
  }
});

// Trigger re-analysis of sponsor organization
router.post('/reanalyze/:sponsorId', async (req: Request, res: Response) => {
  try {
    const { sponsorId } = req.params;
    const { accessToken } = req.body;
    const tenantId = (req as any).tenantId;
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Microsoft 365 access token required for re-analysis' 
      });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get existing discovery record to extract domain
    const existing = await db.select()
      .from(sponsorDiscovery)
      .where(and(
        eq(sponsorDiscovery.sponsorId, sponsorId),
        eq(sponsorDiscovery.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'No existing discovery record found' });
    }

    const microsoft365Data = existing[0].microsoft365Data as any;
    const sponsorDomain = microsoft365Data?.sponsorDomain;

    if (!sponsorDomain) {
      return res.status(400).json({ error: 'Sponsor domain not found in existing record' });
    }

    // Update status to processing
    await db.update(sponsorDiscovery)
      .set({ 
        discoveryStatus: 'processing',
        updatedAt: new Date()
      })
      .where(eq(sponsorDiscovery.id, existing[0].id));

    // Start re-analysis process
    setImmediate(async () => {
      try {
        const discoveryAgent = new SponsorDiscoveryAgent(accessToken);
        await discoveryAgent.discoverSponsorOrganization(tenantId, sponsorDomain);
      } catch (error) {
        console.error('Re-analysis failed:', error);
        await db.update(sponsorDiscovery)
          .set({ 
            discoveryStatus: 'failed',
            updatedAt: new Date()
          })
          .where(eq(sponsorDiscovery.id, existing[0].id));
      }
    });

    res.json({
      sponsorId,
      status: 'processing',
      message: 'Re-analysis initiated successfully',
      tenantId
    });

  } catch (error) {
    console.error('Error initiating re-analysis:', error);
    res.status(500).json({ error: 'Failed to initiate re-analysis' });
  }
});

// Helper functions
function getProgressPercentage(status: string): number {
  switch (status) {
    case 'queued': return 0;
    case 'processing': return 50;
    case 'completed': return 100;
    case 'failed': return 0;
    default: return 0;
  }
}

function generateOrganizationInsights(orgData: any): any {
  const stakeholders = orgData.stakeholderPrincipals as any[] || [];
  const topics = orgData.emergingTopics as any[] || [];
  
  return {
    keyDecisionMakers: stakeholders.filter(s => ['C-level', 'VP', 'Director'].includes(s.decisionMakingLevel)).length,
    departmentDiversity: new Set(stakeholders.map(s => s.department)).size,
    communicationActivity: orgData.communicationPatterns?.communicationDensity || 0,
    emergingTopicsCount: topics.length,
    relationshipStrength: orgData.relationshipStrength || 0,
    lastUpdated: orgData.lastAnalysisDate
  };
}

function generateEngagementStrategy(stakeholder: any): any {
  return {
    primaryChannel: stakeholder.communicationFrequency > 5 ? 'email' : 'meeting',
    frequency: stakeholder.communicationFrequency > 10 ? 'weekly' : 'monthly',
    approach: stakeholder.decisionMakingLevel === 'C-level' ? 'executive-summary' : 'detailed-analysis',
    priority: stakeholder.influenceScore > 0.7 ? 'high' : stakeholder.influenceScore > 0.4 ? 'medium' : 'low'
  };
}

function calculateTopicRelevance(stakeholder: any, topics: any[]): any {
  return topics.slice(0, 3).map(topic => ({
    topic: topic.topic,
    relevance: Math.min(topic.relevanceScore * stakeholder.influenceScore, 1.0),
    actionable: topic.relevanceScore > 0.6
  }));
}

function calculateStakeholderRelevance(topic: any, stakeholders: any[]): any {
  return stakeholders
    .filter(s => s.influenceScore > 0.3)
    .slice(0, 3)
    .map(stakeholder => ({
      name: stakeholder.name,
      relevance: topic.relevanceScore * stakeholder.influenceScore,
      department: stakeholder.department
    }));
}

function generateContentSuggestions(topic: any): string[] {
  return [
    `Create thought leadership content on ${topic.topic}`,
    `Schedule stakeholder discussion about ${topic.topic} trends`,
    `Develop case study highlighting ${topic.topic} success`
  ];
}

function generateEngagementOpportunities(topic: any): any[] {
  return [
    {
      type: 'meeting',
      description: `Host roundtable discussion on ${topic.topic}`,
      timeline: 'next-2-weeks'
    },
    {
      type: 'content',
      description: `Publish insights paper on ${topic.topic} implications`,
      timeline: 'next-month'
    }
  ];
}

function analyzeTopicsDistribution(topics: any[]): any {
  const sentimentCounts = topics.reduce((acc, topic) => {
    acc[topic.sentiment] = (acc[topic.sentiment] || 0) + 1;
    return acc;
  }, {});

  return {
    total: topics.length,
    bysentiment: sentimentCounts,
    highRelevance: topics.filter(t => t.relevanceScore > 0.7).length,
    recentActivity: topics.filter(t => {
      const lastMentioned = new Date(t.lastMentioned);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastMentioned > weekAgo;
    }).length
  };
}

export default router;