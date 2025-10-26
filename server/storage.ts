import { 
  type User, type InsertUser, type Team, type InsertTeam,
  type TeamMember, type InsertTeamMember, type Task, type InsertTask,
  type Minutes, type InsertMinutes, type Snapshot, type InsertSnapshot,
  type TeamWithMembers, type TaskWithDetails, type MinutesWithSnapshots,
  TaskStatus, ChangeType,
  users, teams, teamMembers, tasks, minutes, snapshots
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Team operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamWithMembers(id: string): Promise<TeamWithMembers | undefined>;
  getAllTeams(): Promise<Team[]>;
  getAllTeamsWithMembers(): Promise<TeamWithMembers[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team>;

  // Team member operations
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  getTeamMembersByTeam(teamId: string): Promise<(TeamMember & { user: User })[]>;
  getTeamMembersByUser(userId: string): Promise<(TeamMember & { team: Team })[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Task operations
  getTask(id: string): Promise<Task | undefined>;
  getTaskWithDetails(id: string): Promise<TaskWithDetails | undefined>;
  getTasksByTeam(teamId: string, includeCompleted?: boolean): Promise<TaskWithDetails[]>;
  getTasksByResponsibleMember(memberId: string, includeCompleted?: boolean): Promise<TaskWithDetails[]>;
  createTask(task: InsertTask, userId: string): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>, userId: string): Promise<Task>;
  deleteTask(id: string, userId: string): Promise<void>;

  // Minutes operations
  getMinutes(id: string): Promise<Minutes | undefined>;
  getMinutesByTeamAndDate(teamId: string, date: string): Promise<Minutes | undefined>;
  getMinutesByTeam(teamId: string): Promise<MinutesWithSnapshots[]>;
  createMinutes(minutes: InsertMinutes): Promise<Minutes>;
  updateMinutes(id: string, updates: Partial<Minutes>): Promise<Minutes>;

  // Snapshot operations
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  getSnapshotsByMinutes(minutesId: string): Promise<Snapshot[]>;

  // Utility operations
  getUserRole(userId: string): Promise<string>;
  isUserCoordinatorOfTeam(userId: string, teamId: string): Promise<boolean>;
  searchTasks(query: string, teamId?: string): Promise<TaskWithDetails[]>;
  searchUsers(query: string): Promise<User[]>;
  searchTeams(query: string): Promise<TeamWithMembers[]>;
}

export class DatabaseStorage implements IStorage {
  private connectionRetries: number = 0;
  private maxRetries: number = 3;
  
  constructor() {
    // Database initialization will happen asynchronously when needed
    // The schema will be created via db:push command
  }
  
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // If it's a fatal error, don't retry
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.error(`Fatal database connection error: ${error.message}`);
          throw error;
        }
        
        // If we've exhausted retries, throw the error
        if (i === this.maxRetries) {
          console.error(`Database operation failed after ${this.maxRetries} retries:`, error.message);
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, i) * 1000;
        console.warn(`Database operation failed, retrying in ${delay}ms... (${i + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return this.withRetry(async () => {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Team operations
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeamWithMembers(id: string): Promise<TeamWithMembers | undefined> {
    const team = await this.getTeam(id);
    if (!team) return undefined;

    const membersWithUsers = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id));

    const members = membersWithUsers.map(m => ({ ...m.team_members, user: m.users }));

    return {
      ...team,
      members,
      coordinators: members.filter(tm => tm.isCoordinator),
    };
  }

  async getAllTeams(): Promise<Team[]> {
    return this.withRetry(async () => {
      return await db.select().from(teams);
    });
  }

  async getAllTeamsWithMembers(): Promise<TeamWithMembers[]> {
    const allTeams = await this.getAllTeams();
    const result: TeamWithMembers[] = [];
    
    for (const team of allTeams) {
      const withMembers = await this.getTeamWithMembers(team.id);
      if (withMembers) result.push(withMembers);
    }
    
    return result;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const [team] = await db
      .update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    if (!team) throw new Error("Team not found");
    return team;
  }

  // Team member operations
  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member || undefined;
  }

  async getTeamMembersByTeam(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const result = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return result.map(r => ({ ...r.team_members, user: r.users }));
  }

  async getTeamMembersByUser(userId: string): Promise<(TeamMember & { team: Team })[]> {
    const result = await db
      .select()
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    return result.map(r => ({ ...r.team_members, team: r.teams }));
  }

  async createTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const [member] = await db
      .update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    if (!member) throw new Error("Team member not found");
    return member;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Task operations
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTaskWithDetails(id: string): Promise<TaskWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(tasks)
      .innerJoin(teams, eq(tasks.teamId, teams.id))
      .leftJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(tasks.id, id));

    if (!result) return undefined;

    const responsibleMember = result.team_members && result.users
      ? { ...result.team_members, user: result.users }
      : undefined;

    return {
      ...result.tasks,
      team: result.teams,
      responsibleMember,
    };
  }

  async getTasksByTeam(teamId: string, includeCompleted = true): Promise<TaskWithDetails[]> {
    let query;
    
    if (!includeCompleted) {
      query = db
        .select()
        .from(tasks)
        .innerJoin(teams, eq(tasks.teamId, teams.id))
        .leftJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(and(
          eq(tasks.teamId, teamId),
          or(
            eq(tasks.status, "Open"),
            eq(tasks.status, "In-Progress"),
            eq(tasks.status, "Blocked")
          )
        ));
    } else {
      query = db
        .select()
        .from(tasks)
        .innerJoin(teams, eq(tasks.teamId, teams.id))
        .leftJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(tasks.teamId, teamId));
    }

    const results = await query.orderBy(desc(tasks.updatedAt));

    return results.map(result => ({
      ...result.tasks,
      team: result.teams,
      responsibleMember: result.team_members && result.users
        ? { ...result.team_members, user: result.users }
        : undefined,
    }));
  }

  async getTasksByResponsibleMember(memberId: string, includeCompleted = true): Promise<TaskWithDetails[]> {
    let query;
    
    if (!includeCompleted) {
      query = db
        .select()
        .from(tasks)
        .innerJoin(teams, eq(tasks.teamId, teams.id))
        .innerJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(and(
          eq(tasks.responsibleMemberId, memberId),
          or(
            eq(tasks.status, "Open"),
            eq(tasks.status, "In-Progress"),
            eq(tasks.status, "Blocked")
          )
        ));
    } else {
      query = db
        .select()
        .from(tasks)
        .innerJoin(teams, eq(tasks.teamId, teams.id))
        .innerJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(tasks.responsibleMemberId, memberId));
    }

    const results = await query.orderBy(desc(tasks.updatedAt));

    return results.map(result => ({
      ...result.tasks,
      team: result.teams,
      responsibleMember: { ...result.team_members, user: result.users },
    }));
  }

  async createTask(insertTask: InsertTask, userId: string): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();

    // Create snapshot
    await this.createTaskSnapshot(task, ChangeType.ADDED, userId);

    return task;
  }

  async updateTask(id: string, updates: Partial<Task>, userId: string): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    if (!task) throw new Error("Task not found");

    // Create snapshot
    await this.createTaskSnapshot(task, ChangeType.EDITED, userId);

    return task;
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await this.getTask(id);
    if (task) {
      await this.createTaskSnapshot(task, ChangeType.DELETED, userId);
      await db.delete(tasks).where(eq(tasks.id, id));
    }
  }

  private async createTaskSnapshot(task: Task, changeType: string, userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let minutesRecord = await this.getMinutesByTeamAndDate(task.teamId, today);

    if (!minutesRecord) {
      const team = await this.getTeam(task.teamId);
      minutesRecord = await this.createMinutes({
        teamId: task.teamId,
        date: today,
        venue: team?.defaultVenue || null,
        attendance: [],
      });
    }

    await this.createSnapshot({
      minutesId: minutesRecord.id,
      taskId: task.id,
      userId,
      changeType: changeType as any,
      taskUpdatedAt: task.updatedAt || new Date(),
      payload: task,
    });
  }

  // Minutes operations
  async getMinutes(id: string): Promise<Minutes | undefined> {
    const [minute] = await db.select().from(minutes).where(eq(minutes.id, id));
    return minute || undefined;
  }

  async getMinutesByTeamAndDate(teamId: string, date: string): Promise<Minutes | undefined> {
    const [minute] = await db
      .select()
      .from(minutes)
      .where(and(eq(minutes.teamId, teamId), eq(minutes.date, date)));
    return minute || undefined;
  }

  async getMinutesByTeam(teamId: string): Promise<MinutesWithSnapshots[]> {
    const minutesResults = await db
      .select()
      .from(minutes)
      .innerJoin(teams, eq(minutes.teamId, teams.id))
      .where(eq(minutes.teamId, teamId))
      .orderBy(desc(minutes.date));

    if (minutesResults.length === 0) return [];

    // Collect all minutes IDs
    const minutesIds = minutesResults.map(m => m.minutes.id);

    // Fetch all snapshots for these minutes in one query
    const allSnapshots = await db
      .select()
      .from(snapshots)
      .leftJoin(users, eq(snapshots.userId, users.id))
      .where(inArray(snapshots.minutesId, minutesIds))
      .orderBy(desc(snapshots.recordedAt));

    // Group snapshots by minutesId
    const snapshotsByMinutesId: Record<string, (Snapshot & { user?: User })[]> = {};
    for (const snapshot of allSnapshots) {
      const snapshotWithUser = { ...snapshot.snapshots, user: snapshot.users || undefined };
      if (!snapshotsByMinutesId[snapshot.snapshots.minutesId]) {
        snapshotsByMinutesId[snapshot.snapshots.minutesId] = [];
      }
      snapshotsByMinutesId[snapshot.snapshots.minutesId].push(snapshotWithUser);
    }

    const result: MinutesWithSnapshots[] = [];
    for (const minuteResult of minutesResults) {
      result.push({
        ...minuteResult.minutes,
        team: minuteResult.teams,
        snapshots: snapshotsByMinutesId[minuteResult.minutes.id] || [],
      });
    }

    return result;
  }

  async createMinutes(insertMinutes: InsertMinutes): Promise<Minutes> {
    const [minute] = await db
      .insert(minutes)
      .values(insertMinutes)
      .returning();
    return minute;
  }

  async updateMinutes(id: string, updates: Partial<Minutes>): Promise<Minutes> {
    const [minute] = await db
      .update(minutes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(minutes.id, id))
      .returning();
    if (!minute) throw new Error("Minutes not found");
    return minute;
  }

  // Snapshot operations
  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const [snapshot] = await db
      .insert(snapshots)
      .values(insertSnapshot)
      .returning();
    return snapshot;
  }

  async getSnapshotsByMinutes(minutesId: string): Promise<Snapshot[]> {
    return await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.minutesId, minutesId))
      .orderBy(desc(snapshots.recordedAt));
  }

  // Utility operations
  async getUserRole(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (!user) return "Member";
    
    if (user.email === "asif.shakir@gmail.com" || user.email === "brocklesnar12124@gmail.com") return "Superadmin";
    if (user.isAdmin) return "Admin";
    
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.isCoordinator, true)));
    
    return member ? "Coordinator" : "Member";
  }

  async isUserCoordinatorOfTeam(userId: string, teamId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.isCoordinator, true)
      ));
    return !!member;
  }

  async searchTasks(query: string, teamId?: string): Promise<TaskWithDetails[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    let dbQuery = db
      .select()
      .from(tasks)
      .innerJoin(teams, eq(tasks.teamId, teams.id))
      .leftJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(
        or(
          ilike(tasks.title, searchTerm),
          ilike(tasks.notes, searchTerm),
          ilike(users.displayName, searchTerm)
        )
      );

    if (teamId) {
      dbQuery = db
        .select()
        .from(tasks)
        .innerJoin(teams, eq(tasks.teamId, teams.id))
        .leftJoin(teamMembers, eq(tasks.responsibleMemberId, teamMembers.id))
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(and(
          eq(tasks.teamId, teamId),
          or(
            ilike(tasks.title, searchTerm),
            ilike(tasks.notes, searchTerm),
            ilike(users.displayName, searchTerm)
          )
        ));
    }

    const results = await dbQuery.orderBy(desc(tasks.updatedAt));

    return results.map(result => ({
      ...result.tasks,
      team: result.teams,
      responsibleMember: result.team_members && result.users
        ? { ...result.team_members, user: result.users }
        : undefined,
    }));
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, searchTerm),
          ilike(users.displayName, searchTerm)
        )
      );
  }

  async searchTeams(query: string): Promise<TeamWithMembers[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const teamResults = await db
      .select()
      .from(teams)
      .where(ilike(teams.name, searchTerm));

    const result: TeamWithMembers[] = [];
    for (const team of teamResults) {
      const withMembers = await this.getTeamWithMembers(team.id);
      if (withMembers) result.push(withMembers);
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
