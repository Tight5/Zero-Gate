import {
  users,
  tenants,
  sponsors,
  grants,
  grantMilestones,
  relationships,
  contentCalendar,
  systemMetrics,
  userTenants,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type Sponsor,
  type InsertSponsor,
  type Grant,
  type InsertGrant,
  type GrantMilestone,
  type InsertGrantMilestone,
  type Relationship,
  type InsertRelationship,
  type ContentCalendar,
  type InsertContentCalendar,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getUserTenants(userId: string): Promise<Tenant[]>;
  joinTenant(userId: string, tenantId: string, role?: string): Promise<void>;
  
  // Sponsor operations
  getSponsors(tenantId: string): Promise<Sponsor[]>;
  getSponsor(id: string, tenantId: string): Promise<Sponsor | undefined>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: string, sponsor: Partial<InsertSponsor>, tenantId: string): Promise<Sponsor>;
  deleteSponsor(id: string, tenantId: string): Promise<void>;
  
  // Grant operations
  getGrants(tenantId: string): Promise<Grant[]>;
  getGrant(id: string, tenantId: string): Promise<Grant | undefined>;
  createGrant(grant: InsertGrant): Promise<Grant>;
  updateGrant(id: string, grant: Partial<InsertGrant>, tenantId: string): Promise<Grant>;
  deleteGrant(id: string, tenantId: string): Promise<void>;
  
  // Grant milestone operations
  getGrantMilestones(grantId: string, tenantId: string): Promise<GrantMilestone[]>;
  createGrantMilestone(milestone: InsertGrantMilestone): Promise<GrantMilestone>;
  updateGrantMilestone(id: string, milestone: Partial<InsertGrantMilestone>, tenantId: string): Promise<GrantMilestone>;
  
  // Relationship operations
  getRelationships(tenantId: string): Promise<Relationship[]>;
  createRelationship(relationship: InsertRelationship): Promise<Relationship>;
  findRelationshipPath(sourceId: string, targetId: string, tenantId: string): Promise<any>;
  
  // Content calendar operations
  getContentCalendar(tenantId: string): Promise<ContentCalendar[]>;
  createContentCalendarItem(item: InsertContentCalendar): Promise<ContentCalendar>;
  
  // Dashboard and metrics
  getDashboardKPIs(tenantId: string): Promise<any>;
  getSystemMetrics(tenantId?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db
      .insert(tenants)
      .values(tenant)
      .returning();
    return newTenant;
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const results = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        domain: tenants.domain,
        settings: tenants.settings,
        planTier: tenants.planTier,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, userId));
    
    return results;
  }

  async joinTenant(userId: string, tenantId: string, role = "member"): Promise<void> {
    await db
      .insert(userTenants)
      .values({
        userId,
        tenantId,
        role,
      })
      .onConflictDoNothing();
  }

  // Sponsor operations
  async getSponsors(tenantId: string): Promise<Sponsor[]> {
    return await db
      .select()
      .from(sponsors)
      .where(eq(sponsors.tenantId, tenantId))
      .orderBy(desc(sponsors.createdAt));
  }

  async getSponsor(id: string, tenantId: string): Promise<Sponsor | undefined> {
    const [sponsor] = await db
      .select()
      .from(sponsors)
      .where(and(eq(sponsors.id, id), eq(sponsors.tenantId, tenantId)));
    return sponsor;
  }

  async createSponsor(sponsor: InsertSponsor): Promise<Sponsor> {
    const [newSponsor] = await db
      .insert(sponsors)
      .values(sponsor)
      .returning();
    return newSponsor;
  }

  async updateSponsor(id: string, sponsor: Partial<InsertSponsor>, tenantId: string): Promise<Sponsor> {
    const [updatedSponsor] = await db
      .update(sponsors)
      .set({ ...sponsor, updatedAt: new Date() })
      .where(and(eq(sponsors.id, id), eq(sponsors.tenantId, tenantId)))
      .returning();
    return updatedSponsor;
  }

  async deleteSponsor(id: string, tenantId: string): Promise<void> {
    await db
      .delete(sponsors)
      .where(and(eq(sponsors.id, id), eq(sponsors.tenantId, tenantId)));
  }

  // Grant operations
  async getGrants(tenantId: string): Promise<Grant[]> {
    return await db
      .select()
      .from(grants)
      .where(eq(grants.tenantId, tenantId))
      .orderBy(desc(grants.createdAt));
  }

  async getGrant(id: string, tenantId: string): Promise<Grant | undefined> {
    const [grant] = await db
      .select()
      .from(grants)
      .where(and(eq(grants.id, id), eq(grants.tenantId, tenantId)));
    return grant;
  }

  async createGrant(grant: InsertGrant): Promise<Grant> {
    const [newGrant] = await db
      .insert(grants)
      .values(grant)
      .returning();

    // Auto-generate milestones for new grants
    if (newGrant.submissionDeadline) {
      await this.generateGrantMilestones(newGrant.id, newGrant.submissionDeadline);
    }

    return newGrant;
  }

  async updateGrant(id: string, grant: Partial<InsertGrant>, tenantId: string): Promise<Grant> {
    const [updatedGrant] = await db
      .update(grants)
      .set({ ...grant, updatedAt: new Date() })
      .where(and(eq(grants.id, id), eq(grants.tenantId, tenantId)))
      .returning();
    return updatedGrant;
  }

  async deleteGrant(id: string, tenantId: string): Promise<void> {
    await db
      .delete(grants)
      .where(and(eq(grants.id, id), eq(grants.tenantId, tenantId)));
  }

  // Grant milestone operations
  async getGrantMilestones(grantId: string, tenantId: string): Promise<GrantMilestone[]> {
    const result = await db
      .select({
        id: grantMilestones.id,
        grantId: grantMilestones.grantId,
        title: grantMilestones.title,
        description: grantMilestones.description,
        milestoneDate: grantMilestones.milestoneDate,
        status: grantMilestones.status,
        tasks: grantMilestones.tasks,
        createdAt: grantMilestones.createdAt,
        updatedAt: grantMilestones.updatedAt,
      })
      .from(grantMilestones)
      .innerJoin(grants, eq(grantMilestones.grantId, grants.id))
      .where(and(eq(grantMilestones.grantId, grantId), eq(grants.tenantId, tenantId)))
      .orderBy(grantMilestones.milestoneDate);
    return result;
  }

  async createGrantMilestone(milestone: InsertGrantMilestone): Promise<GrantMilestone> {
    const [newMilestone] = await db
      .insert(grantMilestones)
      .values(milestone)
      .returning();
    return newMilestone;
  }

  async updateGrantMilestone(id: string, milestone: Partial<InsertGrantMilestone>, tenantId: string): Promise<GrantMilestone> {
    const [updatedMilestone] = await db
      .update(grantMilestones)
      .set({ ...milestone, updatedAt: new Date() })
      .where(eq(grantMilestones.id, id))
      .returning();
    return updatedMilestone;
  }

  private async generateGrantMilestones(grantId: string, submissionDeadline: Date): Promise<void> {
    const deadline = new Date(submissionDeadline);
    
    const milestones = [
      {
        grantId,
        title: "Content Strategy & Planning (90 days out)",
        description: "Strategic planning and content audit phase",
        milestoneDate: new Date(deadline.getTime() - (90 * 24 * 60 * 60 * 1000)),
        tasks: [
          "Conduct content audit",
          "Develop content strategy",
          "Research target audience",
          "Create content calendar outline"
        ]
      },
      {
        grantId,
        title: "Content Development & Review (60 days out)",
        description: "Content creation and stakeholder review phase",
        milestoneDate: new Date(deadline.getTime() - (60 * 24 * 60 * 60 * 1000)),
        tasks: [
          "Draft initial content",
          "Internal review process",
          "Gather stakeholder feedback",
          "Revise content based on feedback"
        ]
      },
      {
        grantId,
        title: "Final Execution & Submission (30 days out)",
        description: "Final content preparation and submission",
        milestoneDate: new Date(deadline.getTime() - (30 * 24 * 60 * 60 * 1000)),
        tasks: [
          "Finalize all content",
          "Quality assurance check",
          "Prepare submission materials",
          "Schedule content publication"
        ]
      }
    ];

    for (const milestone of milestones) {
      await db.insert(grantMilestones).values(milestone);
    }
  }

  // Relationship operations
  async getRelationships(tenantId: string): Promise<Relationship[]> {
    return await db
      .select()
      .from(relationships)
      .where(eq(relationships.tenantId, tenantId))
      .orderBy(desc(relationships.createdAt));
  }

  async createRelationship(relationship: InsertRelationship): Promise<Relationship> {
    const [newRelationship] = await db
      .insert(relationships)
      .values(relationship)
      .returning();
    return newRelationship;
  }

  async findRelationshipPath(sourceId: string, targetId: string, tenantId: string): Promise<any> {
    // Simple path finding implementation
    // In a production system, this would use a graph algorithm
    const allRelationships = await this.getRelationships(tenantId);
    
    // Build adjacency list
    const graph: { [key: string]: string[] } = {};
    allRelationships.forEach(rel => {
      if (!graph[rel.sourceId]) graph[rel.sourceId] = [];
      if (!graph[rel.targetId]) graph[rel.targetId] = [];
      graph[rel.sourceId].push(rel.targetId);
      graph[rel.targetId].push(rel.sourceId);
    });

    // BFS to find shortest path
    const queue = [[sourceId]];
    const visited = new Set([sourceId]);
    
    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      
      if (current === targetId) {
        return { path, degrees: path.length - 1 };
      }
      
      if (path.length >= 8) continue; // Max 7 degrees
      
      const neighbors = graph[current] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    
    return { path: null, degrees: -1 };
  }

  // Content calendar operations
  async getContentCalendar(tenantId: string): Promise<ContentCalendar[]> {
    return await db
      .select()
      .from(contentCalendar)
      .where(eq(contentCalendar.tenantId, tenantId))
      .orderBy(contentCalendar.scheduledDate);
  }

  async createContentCalendarItem(item: InsertContentCalendar): Promise<ContentCalendar> {
    const [newItem] = await db
      .insert(contentCalendar)
      .values(item)
      .returning();
    return newItem;
  }

  // Dashboard and metrics
  async getDashboardKPIs(tenantId: string): Promise<any> {
    const [sponsorCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sponsors)
      .where(eq(sponsors.tenantId, tenantId));

    const [grantCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(grants)
      .where(eq(grants.tenantId, tenantId));

    const [relationshipCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(relationships)
      .where(eq(relationships.tenantId, tenantId));

    const [contentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentCalendar)
      .where(eq(contentCalendar.tenantId, tenantId));

    return {
      sponsors: sponsorCount.count || 0,
      grants: grantCount.count || 0,
      relationships: relationshipCount.count || 0,
      contentItems: contentCount.count || 0,
    };
  }

  async getSystemMetrics(tenantId?: string): Promise<any> {
    // Simulate system resource metrics
    const cpuUsage = Math.floor(Math.random() * 50) + 20; // 20-70%
    const memoryUsage = Math.floor(Math.random() * 40) + 40; // 40-80%
    const diskIO = Math.floor(Math.random() * 30) + 10; // 10-40%
    
    return {
      cpuUsage,
      memoryUsage,
      diskIO,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const storage = new DatabaseStorage();
