import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  currentTenantId: varchar("current_tenant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  settings: jsonb("settings").default({}),
  planTier: varchar("plan_tier", { length: 50 }).default("basic"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant data feeds for dynamic integration
export const tenantDataFeeds = pgTable("tenant_data_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  feedType: varchar("feed_type", { length: 50 }).notNull(), // 'microsoft365', 'crm', 'custom'
  sourceConfig: jsonb("source_config").notNull(),
  classificationLevel: varchar("classification_level", { length: 20 }).notNull(), // 'public', 'internal', 'confidential'
  syncFrequency: integer("sync_frequency").default(3600), // seconds
  lastSync: timestamp("last_sync"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Tenant relationship (many-to-many)
export const userTenants = pgTable("user_tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Sponsors table
export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  domain: varchar("domain", { length: 255 }), // Added for Microsoft 365 integration
  email: varchar("email", { length: 255 }),
  type: varchar("type", { length: 100 }),
  contactInfo: jsonb("contact_info").default({}),
  relationshipManager: varchar("relationship_manager", { length: 255 }),
  lastContactDate: timestamp("last_contact_date"),
  relationshipStrength: integer("relationship_strength").default(1),
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor stakeholders from Microsoft 365 integration
export const sponsorStakeholders = pgTable("sponsor_stakeholders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id").notNull().references(() => sponsors.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 100 }),
  department: varchar("department", { length: 100 }),
  orgLevel: integer("org_level"), // management hierarchy level
  communicationFrequency: integer("communication_frequency").default(0),
  lastInteraction: timestamp("last_interaction"),
  influenceScore: decimal("influence_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  relationshipStrength: varchar("relationship_strength", { length: 20 }), // 'weak', 'moderate', 'strong'
  sourceFeed: varchar("source_feed", { length: 50 }).default("microsoft365"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Emerging topics from communication analysis
export const sponsorTopics = pgTable("sponsor_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id").notNull().references(() => sponsors.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  topicName: varchar("topic_name", { length: 255 }).notNull(),
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  frequency: integer("frequency").default(1),
  firstMentioned: timestamp("first_mentioned"),
  lastMentioned: timestamp("last_mentioned"),
  sentiment: varchar("sentiment", { length: 20 }), // 'positive', 'neutral', 'negative'
  keywords: jsonb("keywords").default([]),
  sourceEmails: integer("source_emails").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grants table
export const grants = pgTable("grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  sponsorId: uuid("sponsor_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 50 }).default("draft"),
  deadline: timestamp("deadline"),
  submissionDeadline: timestamp("submission_deadline"),
  submittedAt: timestamp("submitted_at"),
  awardedAt: timestamp("awarded_at"),
  requirements: jsonb("requirements").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grant milestones table
export const grantMilestones = pgTable("grant_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  grantId: uuid("grant_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  milestoneDate: timestamp("milestone_date").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  tasks: jsonb("tasks").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relationships table (for relationship mapping)
export const relationships = pgTable("relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  sourceId: varchar("source_id").notNull(),
  targetId: varchar("target_id").notNull(),
  sponsorId: uuid("sponsor_id"),
  personName: varchar("person_name", { length: 255 }),
  relationshipType: varchar("relationship_type", { length: 100 }),
  type: varchar("type", { length: 100 }),
  strength: integer("strength").default(1),
  verified: boolean("verified").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content calendar table
export const contentCalendar = pgTable("content_calendar", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  grantId: uuid("grant_id"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  platform: varchar("platform", { length: 100 }),
  status: varchar("status", { length: 50 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System metrics table
export const systemMetrics = pgTable("system_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata").default({}),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  userTenants: many(userTenants),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenants: many(userTenants),
  sponsors: many(sponsors),
  grants: many(grants),
  relationships: many(relationships),
  contentCalendar: many(contentCalendar),
  systemMetrics: many(systemMetrics),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
}));

export const sponsorsRelations = relations(sponsors, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sponsors.tenantId],
    references: [tenants.id],
  }),
  grants: many(grants),
  stakeholders: many(sponsorStakeholders),
  topics: many(sponsorTopics),
}));

export const sponsorStakeholdersRelations = relations(sponsorStakeholders, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [sponsorStakeholders.sponsorId],
    references: [sponsors.id],
  }),
  tenant: one(tenants, {
    fields: [sponsorStakeholders.tenantId],
    references: [tenants.id],
  }),
}));

export const sponsorTopicsRelations = relations(sponsorTopics, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [sponsorTopics.sponsorId],
    references: [sponsors.id],
  }),
  tenant: one(tenants, {
    fields: [sponsorTopics.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantDataFeedsRelations = relations(tenantDataFeeds, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantDataFeeds.tenantId],
    references: [tenants.id],
  }),
}));

// OneDrive Storage Management Table
export const onedriveStorage = pgTable('onedrive_storage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  fileType: text('file_type').notNull(), // 'sponsor_profile', 'stakeholder_data', 'analytics', 'documents'
  entityId: uuid('entity_id').notNull(), // Reference to sponsor, grant, etc.
  onedriveFileId: text('onedrive_file_id').notNull(),
  onedriveStoragePath: text('onedrive_storage_path').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  contentType: text('content_type').default('application/json'),
  uploadMethod: text('upload_method').notNull().default('direct'), // 'direct', 'chunked', 'session'
  syncStatus: text('sync_status').notNull().default('synced'),
  lastSyncAt: timestamp('last_sync_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // Data classification for security
  classificationLevel: text('classification_level').notNull().default('internal'), // 'public', 'internal', 'confidential'
  encryptionStatus: text('encryption_status').notNull().default('encrypted'),
  accessControl: jsonb('access_control') // Store access control metadata
});

// Data Classification Schema
export const dataClassification = pgTable('data_classification', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dataType: text('data_type').notNull(), // 'sponsor_data', 'stakeholder_info', 'analytics'
  sensitivityLevel: text('sensitivity_level').notNull(), // 'public', 'internal', 'confidential', 'restricted'
  retentionPeriod: integer('retention_period').notNull(), // Days
  accessControl: jsonb('access_control'),
  storageLocation: text('storage_location').notNull().default('postgresql'), // 'postgresql', 'onedrive', 'hybrid'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const onedriveStorageRelations = relations(onedriveStorage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [onedriveStorage.tenantId],
    references: [tenants.id],
  }),
}));

export const dataClassificationRelations = relations(dataClassification, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dataClassification.tenantId],
    references: [tenants.id],
  }),
}));

export const grantsRelations = relations(grants, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [grants.tenantId],
    references: [tenants.id],
  }),
  sponsor: one(sponsors, {
    fields: [grants.sponsorId],
    references: [sponsors.id],
  }),
  milestones: many(grantMilestones),
  contentCalendar: many(contentCalendar),
}));

export const grantMilestonesRelations = relations(grantMilestones, ({ one }) => ({
  grant: one(grants, {
    fields: [grantMilestones.grantId],
    references: [grants.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  tenant: one(tenants, {
    fields: [relationships.tenantId],
    references: [tenants.id],
  }),
}));

export const contentCalendarRelations = relations(contentCalendar, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contentCalendar.tenantId],
    references: [tenants.id],
  }),
  grant: one(grants, {
    fields: [contentCalendar.grantId],
    references: [grants.id],
  }),
}));

export const systemMetricsRelations = relations(systemMetrics, ({ one }) => ({
  tenant: one(tenants, {
    fields: [systemMetrics.tenantId],
    references: [tenants.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGrantSchema = createInsertSchema(grants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGrantMilestoneSchema = createInsertSchema(grantMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRelationshipSchema = createInsertSchema(relationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantDataFeedSchema = createInsertSchema(tenantDataFeeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorStakeholderSchema = createInsertSchema(sponsorStakeholders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorTopicSchema = createInsertSchema(sponsorTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentCalendarSchema = createInsertSchema(contentCalendar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type Sponsor = typeof sponsors.$inferSelect;
export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type Grant = typeof grants.$inferSelect;
export type InsertGrantMilestone = z.infer<typeof insertGrantMilestoneSchema>;
export type GrantMilestone = typeof grantMilestones.$inferSelect;
export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;
export type Relationship = typeof relationships.$inferSelect;
export type InsertContentCalendar = z.infer<typeof insertContentCalendarSchema>;
export type ContentCalendar = typeof contentCalendar.$inferSelect;
