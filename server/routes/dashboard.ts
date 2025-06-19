/**
 * Dashboard API Routes
 * Provides comprehensive dashboard data endpoints for KPI cards, relationships, grants, and activity
 * Based on attached asset specifications with authentic data sources
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { db } from '../db';
import { 
  sponsors, 
  grants, 
  relationships, 
  users,
  contentCalendar
} from '../../shared/schema';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';

const router = Router();

// KPI Cards endpoint
router.get('/kpis', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get current date ranges for calculations
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Active sponsors count (using relationshipStrength as proxy for active status)
    const activeSponsorsResult = await db
      .select({ count: count() })
      .from(sponsors)
      .where(gte(sponsors.relationshipStrength, 3));
    
    const activeSponsors = activeSponsorsResult[0]?.count || 0;
    
    // Previous period active sponsors for change calculation
    const previousActiveSponsorsResult = await db
      .select({ count: count() })
      .from(sponsors)
      .where(and(
        gte(sponsors.relationshipStrength, 3),
        lte(sponsors.createdAt, thirtyDaysAgo)
      ));
    
    const previousActiveSponsors = previousActiveSponsorsResult[0]?.count || 0;
    const sponsorsChange = previousActiveSponsors > 0 
      ? Math.round(((activeSponsors - previousActiveSponsors) / previousActiveSponsors) * 100)
      : 0;

    // Total grants count
    const totalGrantsResult = await db
      .select({ count: count() })
      .from(grants);
    
    const totalGrants = totalGrantsResult[0]?.count || 0;
    
    // Previous period grants for change calculation
    const previousGrantsResult = await db
      .select({ count: count() })
      .from(grants)
      .where(lte(grants.createdAt, thirtyDaysAgo));
    
    const previousGrants = previousGrantsResult[0]?.count || 0;
    const grantsChange = previousGrants > 0 
      ? Math.round(((totalGrants - previousGrants) / previousGrants) * 100)
      : 0;

    // Funding secured (sum of awarded grants)
    const fundingSecuredResult = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${grants.amount}), 0)` 
      })
      .from(grants)
      .where(eq(grants.status, 'awarded'));
    
    const fundingSecured = fundingSecuredResult[0]?.total || 0;
    
    // Previous period funding for change calculation
    const previousFundingResult = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${grants.amount}), 0)` 
      })
      .from(grants)
      .where(and(
        eq(grants.status, 'awarded'),
        lte(grants.createdAt, thirtyDaysAgo)
      ));
    
    const previousFunding = previousFundingResult[0]?.total || 0;
    const fundingChange = previousFunding > 0 
      ? Math.round(((fundingSecured - previousFunding) / previousFunding) * 100)
      : 0;

    // Upcoming deadlines (grants due in next 30 days using submissionDeadline)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingDeadlinesResult = await db
      .select({ count: count() })
      .from(grants)
      .where(and(
        gte(grants.submissionDeadline, now),
        lte(grants.submissionDeadline, thirtyDaysFromNow),
        eq(grants.status, 'draft')
      ));
    
    const upcomingDeadlines = upcomingDeadlinesResult[0]?.count || 0;
    
    // Previous period deadlines for change calculation
    const previousDeadlinesResult = await db
      .select({ count: count() })
      .from(grants)
      .where(and(
        gte(grants.submissionDeadline, thirtyDaysAgo),
        lte(grants.submissionDeadline, now),
        eq(grants.status, 'draft')
      ));
    
    const previousDeadlines = previousDeadlinesResult[0]?.count || 0;
    const deadlinesChange = previousDeadlines > 0 
      ? Math.round(((upcomingDeadlines - previousDeadlines) / previousDeadlines) * 100)
      : 0;

    // Additional metrics
    const awardedGrantsResult = await db
      .select({ count: count() })
      .from(grants)
      .where(eq(grants.status, 'awarded'));
    
    const submittedGrantsResult = await db
      .select({ count: count() })
      .from(grants)
      .where(eq(grants.status, 'submitted'));
    
    const awardedGrants = awardedGrantsResult[0]?.count || 0;
    const submittedGrants = submittedGrantsResult[0]?.count || 0;
    const successRate = submittedGrants > 0 ? Math.round((awardedGrants / submittedGrants) * 100) : 0;
    
    const avgGrantAmountResult = await db
      .select({ 
        avg: sql<number>`COALESCE(AVG(${grants.amount}), 0)` 
      })
      .from(grants)
      .where(eq(grants.status, 'awarded'));
    
    const avgGrantAmount = Math.round(avgGrantAmountResult[0]?.avg || 0);

    res.json({
      active_sponsors: activeSponsors,
      total_grants: totalGrants,
      funding_secured: fundingSecured,
      upcoming_deadlines: upcomingDeadlines,
      sponsors_change: sponsorsChange,
      grants_change: grantsChange,
      funding_change: fundingChange,
      deadlines_change: deadlinesChange,
      success_rate: successRate,
      avg_grant_amount: avgGrantAmount
    });

  } catch (error) {
    console.error('KPI data fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch KPI data' });
  }
});

// Relationship data endpoint
router.get('/relationships', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get relationship statistics
    const totalRelationshipsResult = await db
      .select({ count: count() })
      .from(relationships);
    
    const strongConnectionsResult = await db
      .select({ count: count() })
      .from(relationships)
      .where(gte(relationships.strength, 80));
    
    const avgStrengthResult = await db
      .select({ 
        avg: sql<number>`COALESCE(AVG(${relationships.strength}), 0)` 
      })
      .from(relationships);
    
    const totalRelationships = totalRelationshipsResult[0]?.count || 0;
    const strongConnections = strongConnectionsResult[0]?.count || 0;
    const averageStrength = Math.round(avgStrengthResult[0]?.avg || 0);

    // Get strength distribution data
    const strengthDistributionResult = await db
      .select({
        id: relationships.id,
        name: sql<string>`COALESCE(${relationships.personName}, 'Unknown')`,
        strength: relationships.strength,
        type: relationships.type
      })
      .from(relationships)
      .orderBy(desc(relationships.strength))
      .limit(10);

    const strengthDistribution = strengthDistributionResult.map((rel, index) => ({
      id: rel.id,
      name: rel.name,
      strength: rel.strength,
      type: rel.type || 'professional',
      value: rel.strength,
      fill: `hsl(${220 - (index * 20)}, 70%, 50%)`
    }));

    // Get type distribution
    const typeDistributionResult = await db
      .select({
        type: relationships.type,
        count: count()
      })
      .from(relationships)
      .groupBy(relationships.type);

    const typeColors = {
      direct: '#3366FF',
      indirect: '#10B981',
      professional: '#8B5CF6',
      personal: '#F59E0B',
      organizational: '#EF4444'
    };

    const typeDistribution = typeDistributionResult.map(item => ({
      type: item.type || 'professional',
      count: item.count,
      percentage: Math.round((item.count / totalRelationships) * 100),
      color: typeColors[item.type as keyof typeof typeColors] || '#6B7280'
    }));

    // Get top connectors (sponsors with highest relationship counts)
    const topConnectorsResult = await db
      .select({
        name: sponsors.name,
        connections: count(relationships.id),
        strength: sql<number>`COALESCE(AVG(${relationships.strength}), 0)`
      })
      .from(sponsors)
      .leftJoin(relationships, eq(sponsors.id, relationships.sponsorId))
      .groupBy(sponsors.id, sponsors.name)
      .orderBy(desc(count(relationships.id)))
      .limit(6);

    const topConnectors = topConnectorsResult.map(connector => ({
      name: connector.name,
      connections: connector.connections,
      strength: Math.round(connector.strength)
    }));

    res.json({
      totalRelationships,
      strongConnections,
      averageStrength,
      topConnectors,
      strengthDistribution,
      typeDistribution
    });

  } catch (error) {
    console.error('Relationship data fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch relationship data' });
  }
});

// Grant timeline endpoint
router.get('/grants', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get grant statistics
    const totalGrantsResult = await db
      .select({ count: count() })
      .from(grants);
    
    const activeGrantsResult = await db
      .select({ count: count() })
      .from(grants)
      .where(eq(grants.status, 'in-progress'));
    
    const now = new Date();
    const overdueGrantsResult = await db
      .select({ count: count() })
      .from(grants)
      .where(and(
        lte(grants.deadline, now),
        eq(grants.status, 'in-progress')
      ));
    
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingDeadlinesResult = await db
      .select({ count: count() })
      .from(grants)
      .where(and(
        gte(grants.deadline, now),
        lte(grants.deadline, thirtyDaysFromNow),
        eq(grants.status, 'in-progress')
      ));

    // Get detailed grant data with milestones
    const grantsResult = await db
      .select({
        id: grants.id,
        title: grants.title,
        organization: grants.organization,
        amount: grants.amount,
        deadline: grants.deadline,
        status: grants.status,
        createdAt: grants.createdAt
      })
      .from(grants)
      .orderBy(desc(grants.deadline))
      .limit(20);

    const grantsWithMilestones = grantsResult.map(grant => {
      const deadline = new Date(grant.deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Generate backward planning milestones
      const milestones = [
        {
          id: `${grant.id}-90`,
          title: 'Initial Planning',
          dueDate: new Date(deadline.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          completed: daysRemaining < 90,
          type: '90-day' as const,
          description: 'Research requirements and begin preparation'
        },
        {
          id: `${grant.id}-60`,
          title: 'Draft Preparation',
          dueDate: new Date(deadline.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          completed: daysRemaining < 60,
          type: '60-day' as const,
          description: 'Complete first draft and gather supporting documents'
        },
        {
          id: `${grant.id}-30`,
          title: 'Final Review',
          dueDate: new Date(deadline.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          completed: daysRemaining < 30,
          type: '30-day' as const,
          description: 'Final review, proofreading, and quality check'
        },
        {
          id: `${grant.id}-submission`,
          title: 'Submission',
          dueDate: grant.deadline,
          completed: grant.status === 'submitted' || grant.status === 'awarded',
          type: 'submission' as const,
          description: 'Submit complete application'
        }
      ];

      const completedMilestones = milestones.filter(m => m.completed).length;
      const progress = Math.round((completedMilestones / milestones.length) * 100);
      
      const riskLevel = daysRemaining < 0 ? 'high' : 
                       daysRemaining < 15 ? 'high' :
                       daysRemaining < 30 ? 'medium' : 'low';

      return {
        id: grant.id,
        title: grant.title,
        organization: grant.organization,
        amount: grant.amount,
        deadline: grant.deadline,
        status: grant.status,
        progress,
        milestones,
        daysRemaining,
        riskLevel
      };
    });

    res.json({
      grants: grantsWithMilestones,
      totalGrants: totalGrantsResult[0]?.count || 0,
      activeGrants: activeGrantsResult[0]?.count || 0,
      overdueGrants: overdueGrantsResult[0]?.count || 0,
      upcomingDeadlines: upcomingDeadlinesResult[0]?.count || 0
    });

  } catch (error) {
    console.error('Grant timeline fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch grant timeline data' });
  }
});

// Recent activity endpoint
router.get('/activity', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get recent activity from multiple sources
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Combine activities from different sources
    const activities = [];

    // Recent grants
    const recentGrants = await db
      .select({
        id: grants.id,
        title: grants.title,
        status: grants.status,
        amount: grants.amount,
        createdAt: grants.createdAt,
        updatedAt: grants.updatedAt
      })
      .from(grants)
      .where(gte(grants.updatedAt, weekStart))
      .orderBy(desc(grants.updatedAt))
      .limit(10);

    recentGrants.forEach(grant => {
      activities.push({
        id: `grant-${grant.id}`,
        type: 'grant' as const,
        action: 'updated' as const,
        title: `Grant Application: ${grant.title}`,
        description: `Status updated to ${grant.status}`,
        timestamp: grant.updatedAt.toISOString(),
        user: {
          id: userId,
          name: 'System User',
          avatar: undefined
        },
        metadata: {
          entityId: grant.id,
          entityType: 'grant',
          amount: grant.amount,
          status: grant.status,
          priority: grant.status === 'in-progress' ? 'medium' as const : 'low' as const
        }
      });
    });

    // Recent sponsors
    const recentSponsors = await db
      .select({
        id: sponsors.id,
        name: sponsors.name,
        status: sponsors.status,
        createdAt: sponsors.createdAt,
        updatedAt: sponsors.updatedAt
      })
      .from(sponsors)
      .where(gte(sponsors.updatedAt, weekStart))
      .orderBy(desc(sponsors.updatedAt))
      .limit(5);

    recentSponsors.forEach(sponsor => {
      activities.push({
        id: `sponsor-${sponsor.id}`,
        type: 'sponsor' as const,
        action: 'updated' as const,
        title: `Sponsor: ${sponsor.name}`,
        description: `Sponsor profile updated`,
        timestamp: sponsor.updatedAt.toISOString(),
        user: {
          id: userId,
          name: 'System User',
          avatar: undefined
        },
        metadata: {
          entityId: sponsor.id,
          entityType: 'sponsor',
          status: sponsor.status,
          priority: 'low' as const
        }
      });
    });

    // Recent relationships
    const recentRelationships = await db
      .select({
        id: relationships.id,
        personName: relationships.personName,
        strength: relationships.strength,
        createdAt: relationships.createdAt,
        updatedAt: relationships.updatedAt
      })
      .from(relationships)
      .where(gte(relationships.updatedAt, weekStart))
      .orderBy(desc(relationships.updatedAt))
      .limit(5);

    recentRelationships.forEach(relationship => {
      activities.push({
        id: `relationship-${relationship.id}`,
        type: 'relationship' as const,
        action: 'updated' as const,
        title: `Relationship: ${relationship.personName}`,
        description: `Relationship strength updated to ${relationship.strength}%`,
        timestamp: relationship.updatedAt.toISOString(),
        user: {
          id: userId,
          name: 'System User',
          avatar: undefined
        },
        metadata: {
          entityId: relationship.id,
          entityType: 'relationship',
          priority: relationship.strength >= 80 ? 'high' as const : 'medium' as const
        }
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate counts
    const todayCount = activities.filter(a => 
      new Date(a.timestamp) >= todayStart
    ).length;

    const weekCount = activities.length;

    res.json({
      activities: activities.slice(0, 20), // Return top 20 activities
      totalCount: activities.length,
      todayCount,
      weekCount
    });

  } catch (error) {
    console.error('Activity data fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch activity data' });
  }
});

export default router;