import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  displayNameIdx: index("users_display_name_idx").on(table.displayName),
}));

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  defaultVenue: text("default_venue"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("teams_name_idx").on(table.name),
}));

// Team members table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isCoordinator: boolean("is_coordinator").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  teamIdIdx: index("team_members_team_id_idx").on(table.teamId),
  userIdIdx: index("team_members_user_id_idx").on(table.userId),
}));

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  responsibleMemberId: varchar("responsible_member_id").references(() => teamMembers.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["Open", "In-Progress", "Blocked", "Done", "Canceled"] }).notNull().default("Open"),
  priority: text("priority", { enum: ["Low", "Medium", "High"] }).notNull().default("Medium"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teamIdIdx: index("tasks_team_id_idx").on(table.teamId),
  responsibleMemberIdIdx: index("tasks_responsible_member_id_idx").on(table.responsibleMemberId),
  statusIdx: index("tasks_status_idx").on(table.status),
  updatedAtIdx: index("tasks_updated_at_idx").on(table.updatedAt),
  teamIdUpdatedAtIdx: index("tasks_team_id_updated_at_idx").on(table.teamId, sql`${table.updatedAt} desc`),
}));

// Minutes table (by team+date)
export const minutes = pgTable("minutes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // yyyy-mm-dd format
  venue: text("venue"),
  attendance: jsonb("attendance").default([]), // array of team member IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teamIdIdx: index("minutes_team_id_idx").on(table.teamId),
  dateIdx: index("minutes_date_idx").on(table.date),
  teamDateIdx: index("minutes_team_date_idx").on(table.teamId, table.date),
}));

// Snapshots table
export const snapshots = pgTable("snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  minutesId: varchar("minutes_id").notNull().references(() => minutes.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull(), // reference for linking, but task may be deleted
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // user who made the change
  changeType: text("change_type", { enum: ["Added", "Edited", "Deleted"] }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
  taskUpdatedAt: timestamp("task_updated_at").notNull(),
  payload: jsonb("payload").notNull(), // full task data at time of change
}, (table) => ({
  minutesIdIdx: index("snapshots_minutes_id_idx").on(table.minutesId),
  taskIdIdx: index("snapshots_task_id_idx").on(table.taskId),
  userIdIdx: index("snapshots_user_id_idx").on(table.userId),
  recordedAtIdx: index("snapshots_recorded_at_idx").on(table.recordedAt),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMinutesSchema = createInsertSchema(minutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
  recordedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertMinutes = z.infer<typeof insertMinutesSchema>;
export type Minutes = typeof minutes.$inferSelect;

export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshots.$inferSelect;

// Enums
export const TaskStatus = {
  OPEN: "Open",
  IN_PROGRESS: "In-Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELED: "Canceled",
} as const;

export const TaskPriority = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
} as const;

export const ChangeType = {
  ADDED: "Added",
  EDITED: "Edited",
  DELETED: "Deleted",
} as const;

// Utility types
export type UserRole = "Member" | "Coordinator" | "Admin" | "Superadmin";

export interface TeamWithMembers extends Team {
  members: (TeamMember & { user: User })[];
  coordinators: (TeamMember & { user: User })[];
}

export interface TaskWithDetails extends Task {
  team: Team;
  responsibleMember?: TeamMember & { user: User };
}

export interface MinutesWithSnapshots extends Minutes {
  snapshots: (Snapshot & { user?: User })[];
  team: Team;
}
