import { Client } from '@microsoft/microsoft-graph-client';
import { getDb } from '../db';
import { sponsorDiscovery, sponsorOrganization, agentTasks, dataClassification } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

interface Microsoft365User {
  id: string;
  displayName: string;
  mail: string;
  jobTitle?: string;
  department?: string;
  manager?: {
    id: string;
    displayName: string;
  };
}

interface StakeholderPrincipal {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  influenceScore: number;
  communicationFrequency: number;
  decisionMakingLevel: 'C-level' | 'VP' | 'Director' | 'Manager' | 'Individual';
}

interface EmergingTopic {
  topic: string;
  relevanceScore: number;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPhrases: string[];
  lastMentioned: string;
}

export class SponsorDiscoveryAgent {
  private graphClient: Client;
  
  constructor(accessToken: string) {
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  async discoverSponsorOrganization(tenantId: string, sponsorDomain: string): Promise<void> {
    const db = getDb();
    if (!db) throw new Error('Database connection not available');

    try {
      // Create discovery record
      const discoveryId = await this.createDiscoveryRecord(tenantId, sponsorDomain);
      
      // Extract organizational data from Microsoft 365
      const organizationalData = await this.extractOrganizationalData(sponsorDomain);
      
      // Identify stakeholder principals
      const stakeholderPrincipals = await this.identifyStakeholderPrincipals(organizationalData.users);
      
      // Analyze emerging topics from communications
      const emergingTopics = await this.analyzeEmergingTopics(organizationalData.users, 60); // Last 60 days
      
      // Calculate relationship strength patterns
      const relationshipPatterns = await this.calculateRelationshipPatterns(organizationalData.users);
      
      // Update discovery record with results
      await db.update(sponsorDiscovery)
        .set({
          discoveryStatus: 'completed',
          microsoft365Data: organizationalData,
          stakeholderPrincipals,
          emergingTopics,
          communicationPatterns: relationshipPatterns,
          relationshipStrength: this.calculateOverallRelationshipStrength(relationshipPatterns),
          lastAnalysisDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(sponsorDiscovery.id, discoveryId));

      // Create sponsor organization intelligence record
      await this.createSponsorOrganizationRecord(tenantId, discoveryId, organizationalData, stakeholderPrincipals);
      
      // Create data classification records for discovered data
      await this.classifyDiscoveredData(tenantId, discoveryId);

    } catch (error) {
      console.error('Sponsor discovery failed:', error);
      throw error;
    }
  }

  private async createDiscoveryRecord(tenantId: string, sponsorDomain: string): Promise<string> {
    const db = getDb();
    if (!db) throw new Error('Database connection not available');

    const result = await db.insert(sponsorDiscovery)
      .values({
        tenantId,
        discoveryStatus: 'processing',
        microsoft365Data: { sponsorDomain },
        createdAt: new Date()
      })
      .returning({ id: sponsorDiscovery.id });

    return result[0].id;
  }

  private async extractOrganizationalData(sponsorDomain: string): Promise<{
    users: Microsoft365User[];
    departments: string[];
    organizationStructure: any;
  }> {
    try {
      // Get all users in the organization
      const users = await this.graphClient
        .api('/users')
        .select('id,displayName,mail,jobTitle,department,manager')
        .filter(`endswith(mail,'@${sponsorDomain}')`)
        .top(999)
        .get();

      // Extract unique departments
      const departments = [...new Set(users.value
        .map((user: any) => user.department)
        .filter(Boolean))];

      // Build organization structure
      const organizationStructure = this.buildOrganizationStructure(users.value);

      return {
        users: users.value,
        departments,
        organizationStructure
      };
    } catch (error) {
      console.error('Error extracting organizational data:', error);
      throw error;
    }
  }

  private async identifyStakeholderPrincipals(users: Microsoft365User[]): Promise<StakeholderPrincipal[]> {
    const stakeholders: StakeholderPrincipal[] = [];

    for (const user of users) {
      if (!user.jobTitle) continue;

      const decisionLevel = this.determineDecisionMakingLevel(user.jobTitle);
      const influenceScore = this.calculateInfluenceScore(user, users);
      
      // Only include users with significant influence
      if (influenceScore > 0.3) {
        stakeholders.push({
          id: user.id,
          name: user.displayName,
          email: user.mail,
          title: user.jobTitle,
          department: user.department || 'Unknown',
          influenceScore,
          communicationFrequency: await this.calculateCommunicationFrequency(user.id),
          decisionMakingLevel: decisionLevel
        });
      }
    }

    return stakeholders.sort((a, b) => b.influenceScore - a.influenceScore);
  }

  private async analyzeEmergingTopics(users: Microsoft365User[], daysPast: number): Promise<EmergingTopic[]> {
    const topics: EmergingTopic[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysPast);

    try {
      // Analyze email communications for topics
      for (const user of users.slice(0, 10)) { // Limit to prevent API throttling
        const messages = await this.getUserMessages(user.id, cutoffDate);
        const userTopics = this.extractTopicsFromMessages(messages);
        
        // Merge topics
        for (const topic of userTopics) {
          const existingTopic = topics.find(t => t.topic === topic.topic);
          if (existingTopic) {
            existingTopic.frequency += topic.frequency;
            existingTopic.relevanceScore = Math.max(existingTopic.relevanceScore, topic.relevanceScore);
          } else {
            topics.push(topic);
          }
        }
      }

      return topics
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5); // Top 5 emerging topics
        
    } catch (error) {
      console.error('Error analyzing emerging topics:', error);
      return [];
    }
  }

  private async calculateRelationshipPatterns(users: Microsoft365User[]): Promise<any> {
    return {
      totalUsers: users.length,
      departmentDistribution: this.calculateDepartmentDistribution(users),
      hierarchyDepth: this.calculateHierarchyDepth(users),
      communicationDensity: await this.calculateCommunicationDensity(users),
      collaborationScore: this.calculateCollaborationScore(users)
    };
  }

  private buildOrganizationStructure(users: Microsoft365User[]): any {
    const structure: any = {};
    
    for (const user of users) {
      const dept = user.department || 'Unknown';
      if (!structure[dept]) {
        structure[dept] = {
          users: [],
          managers: [],
          totalCount: 0
        };
      }
      
      structure[dept].users.push({
        id: user.id,
        name: user.displayName,
        title: user.jobTitle,
        isManager: this.isManagerRole(user.jobTitle)
      });
      
      if (this.isManagerRole(user.jobTitle)) {
        structure[dept].managers.push(user.id);
      }
      
      structure[dept].totalCount++;
    }

    return structure;
  }

  private determineDecisionMakingLevel(jobTitle: string): 'C-level' | 'VP' | 'Director' | 'Manager' | 'Individual' {
    const title = jobTitle.toLowerCase();
    
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || title.includes('chief')) {
      return 'C-level';
    }
    if (title.includes('vp') || title.includes('vice president')) {
      return 'VP';
    }
    if (title.includes('director')) {
      return 'Director';
    }
    if (title.includes('manager') || title.includes('lead') || title.includes('head')) {
      return 'Manager';
    }
    return 'Individual';
  }

  private calculateInfluenceScore(user: Microsoft365User, allUsers: Microsoft365User[]): number {
    let score = 0;
    
    // Title-based scoring
    const level = this.determineDecisionMakingLevel(user.jobTitle || '');
    switch (level) {
      case 'C-level': score += 0.5; break;
      case 'VP': score += 0.4; break;
      case 'Director': score += 0.3; break;
      case 'Manager': score += 0.2; break;
      default: score += 0.1;
    }
    
    // Department influence (larger departments = more influence)
    const deptSize = allUsers.filter(u => u.department === user.department).length;
    score += Math.min(deptSize / 50, 0.3); // Cap at 0.3
    
    // Manager status
    if (this.isManagerRole(user.jobTitle || '')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private async calculateCommunicationFrequency(userId: string): Promise<number> {
    try {
      const messages = await this.getUserMessages(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      return messages.length / 30; // Messages per day over last 30 days
    } catch (error) {
      return 0;
    }
  }

  private async getUserMessages(userId: string, since: Date): Promise<any[]> {
    try {
      const messages = await this.graphClient
        .api(`/users/${userId}/messages`)
        .filter(`receivedDateTime ge ${since.toISOString()}`)
        .select('subject,bodyPreview,receivedDateTime')
        .top(100)
        .get();
      
      return messages.value || [];
    } catch (error) {
      return [];
    }
  }

  private extractTopicsFromMessages(messages: any[]): EmergingTopic[] {
    const topicMap = new Map<string, EmergingTopic>();
    
    for (const message of messages) {
      const keywords = this.extractKeywords(message.subject + ' ' + message.bodyPreview);
      
      for (const keyword of keywords) {
        if (topicMap.has(keyword)) {
          const topic = topicMap.get(keyword)!;
          topic.frequency++;
          topic.lastMentioned = message.receivedDateTime;
        } else {
          topicMap.set(keyword, {
            topic: keyword,
            relevanceScore: 0.5,
            frequency: 1,
            sentiment: 'neutral',
            keyPhrases: [keyword],
            lastMentioned: message.receivedDateTime
          });
        }
      }
    }

    return Array.from(topicMap.values());
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP library
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(words)].slice(0, 10);
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other'];
    return stopWords.includes(word);
  }

  private calculateDepartmentDistribution(users: Microsoft365User[]): any {
    const distribution: any = {};
    for (const user of users) {
      const dept = user.department || 'Unknown';
      distribution[dept] = (distribution[dept] || 0) + 1;
    }
    return distribution;
  }

  private calculateHierarchyDepth(users: Microsoft365User[]): number {
    // Simple hierarchy depth calculation
    const levels = new Set(users.map(u => this.determineDecisionMakingLevel(u.jobTitle || '')));
    return levels.size;
  }

  private async calculateCommunicationDensity(users: Microsoft365User[]): Promise<number> {
    // Simplified communication density - number of active communicators
    let activeCommunicators = 0;
    for (const user of users.slice(0, 20)) { // Limit for performance
      const frequency = await this.calculateCommunicationFrequency(user.id);
      if (frequency > 1) activeCommunicators++;
    }
    return activeCommunicators / Math.min(users.length, 20);
  }

  private calculateCollaborationScore(users: Microsoft365User[]): number {
    // Based on department diversity and manager presence
    const departments = new Set(users.map(u => u.department).filter(Boolean));
    const managers = users.filter(u => this.isManagerRole(u.jobTitle || ''));
    
    return Math.min((departments.size * 0.1) + (managers.length / users.length), 1.0);
  }

  private calculateOverallRelationshipStrength(patterns: any): number {
    return (patterns.communicationDensity * 0.4) + (patterns.collaborationScore * 0.6);
  }

  private isManagerRole(jobTitle: string): boolean {
    const title = jobTitle.toLowerCase();
    return title.includes('manager') || title.includes('director') || title.includes('lead') || 
           title.includes('head') || title.includes('chief') || title.includes('vp');
  }

  private async createSponsorOrganizationRecord(
    tenantId: string, 
    discoveryId: string, 
    orgData: any, 
    stakeholders: StakeholderPrincipal[]
  ): Promise<void> {
    const db = getDb();
    if (!db) throw new Error('Database connection not available');

    await db.insert(sponsorOrganization)
      .values({
        sponsorId: discoveryId,
        tenantId,
        organizationStructure: orgData.organizationStructure,
        keyStakeholders: stakeholders,
        departmentHierarchy: orgData.departments,
        decisionMakers: stakeholders.filter(s => ['C-level', 'VP', 'Director'].includes(s.decisionMakingLevel)),
        influenceMap: this.createInfluenceMap(stakeholders),
        collaborationHistory: [],
        lastUpdated: new Date()
      });
  }

  private createInfluenceMap(stakeholders: StakeholderPrincipal[]): any {
    return stakeholders.reduce((map, stakeholder) => {
      map[stakeholder.id] = {
        name: stakeholder.name,
        influence: stakeholder.influenceScore,
        level: stakeholder.decisionMakingLevel,
        department: stakeholder.department
      };
      return map;
    }, {} as any);
  }

  private async classifyDiscoveredData(tenantId: string, discoveryId: string): Promise<void> {
    const db = getDb();
    if (!db) throw new Error('Database connection not available');

    const classifications = [
      {
        tenantId,
        dataType: 'sponsor_organizational_data',
        sensitivityLevel: 'internal',
        retentionPeriod: 730, // 2 years
        accessControl: { discoveryId, roles: ['manager', 'admin'] },
        encryptionRequired: true
      },
      {
        tenantId,
        dataType: 'stakeholder_principals',
        sensitivityLevel: 'confidential',
        retentionPeriod: 365, // 1 year
        accessControl: { discoveryId, roles: ['admin'] },
        encryptionRequired: true
      },
      {
        tenantId,
        dataType: 'emerging_topics',
        sensitivityLevel: 'internal',
        retentionPeriod: 180, // 6 months
        accessControl: { discoveryId, roles: ['user', 'manager', 'admin'] },
        encryptionRequired: false
      }
    ];

    await db.insert(dataClassification).values(classifications);
  }
}