import { 
  type User, type InsertUser, type Team, type InsertTeam,
  type TeamMember, type InsertTeamMember, type Task, type InsertTask,
  type Minutes, type InsertMinutes, type Snapshot, type InsertSnapshot,
  type TeamWithMembers, type TaskWithDetails, type MinutesWithSnapshots,
  TaskStatus, ChangeType
} from "@shared/schema";
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
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private teamMembers: Map<string, TeamMember> = new Map();
  private tasks: Map<string, Task> = new Map();
  private minutes: Map<string, Minutes> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize superadmin
    const superadminId = randomUUID();
    const superadmin: User = {
      id: superadminId,
      email: "asif.shakir@gmail.com",
      displayName: "Asif Shakir",
      photoUrl: null,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(superadminId, superadmin);

    // Create initial teams
    const teamNames = ["Creative", "CC", "NCF", "SS", "Research", "Marketing", "Gems", "Tech", "Finance", "Gifts", "HR", "Strategy", "Coordinators"];
    teamNames.forEach(name => {
      const team: Team = {
        id: randomUUID(),
        name,
        defaultVenue: `${name} Meeting Room`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.teams.set(team.id, team);
    });

    // Add Abbas to Strategy team
    const abbassId = randomUUID();
    const abbas: User = {
      id: abbassId,
      email: "abbas.naheed@gmail.com",
      displayName: "Abbas Naheed",
      photoUrl: null,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(abbassId, abbas);

    const strategyTeam = Array.from(this.teams.values()).find(t => t.name === "Strategy");
    if (strategyTeam) {
      // Add superadmin as member
      const superadminMember: TeamMember = {
        id: randomUUID(),
        teamId: strategyTeam.id,
        userId: superadminId,
        isCoordinator: false,
        createdAt: new Date(),
      };
      this.teamMembers.set(superadminMember.id, superadminMember);

      // Add Abbas as coordinator
      const abbasMember: TeamMember = {
        id: randomUUID(),
        teamId: strategyTeam.id,
        userId: abbassId,
        isCoordinator: true,
        createdAt: new Date(),
      };
      this.teamMembers.set(abbasMember.id, abbasMember);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      displayName: insertUser.displayName || null,
      photoUrl: insertUser.photoUrl || null,
      isAdmin: insertUser.isAdmin || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Team operations
  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamWithMembers(id: string): Promise<TeamWithMembers | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;

    const teamMembers = Array.from(this.teamMembers.values())
      .filter(tm => tm.teamId === id)
      .map(tm => ({ ...tm, user: this.users.get(tm.userId)! }));

    return {
      ...team,
      members: teamMembers,
      coordinators: teamMembers.filter(tm => tm.isCoordinator),
    };
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getAllTeamsWithMembers(): Promise<TeamWithMembers[]> {
    const teams = await this.getAllTeams();
    const result: TeamWithMembers[] = [];
    
    for (const team of teams) {
      const withMembers = await this.getTeamWithMembers(team.id);
      if (withMembers) result.push(withMembers);
    }
    
    return result;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const team: Team = {
      ...insertTeam,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const team = this.teams.get(id);
    if (!team) throw new Error("Team not found");
    
    const updated = { ...team, ...updates, updatedAt: new Date() };
    this.teams.set(id, updated);
    return updated;
  }

  // Team member operations
  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async getTeamMembersByTeam(teamId: string): Promise<(TeamMember & { user: User })[]> {
    return Array.from(this.teamMembers.values())
      .filter(tm => tm.teamId === teamId)
      .map(tm => ({ ...tm, user: this.users.get(tm.userId)! }));
  }

  async getTeamMembersByUser(userId: string): Promise<(TeamMember & { team: Team })[]> {
    return Array.from(this.teamMembers.values())
      .filter(tm => tm.userId === userId)
      .map(tm => ({ ...tm, team: this.teams.get(tm.teamId)! }));
  }

  async createTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const id = randomUUID();
    const member: TeamMember = {
      ...insertMember,
      id,
      createdAt: new Date(),
    };
    this.teamMembers.set(id, member);
    return member;
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const member = this.teamMembers.get(id);
    if (!member) throw new Error("Team member not found");
    
    const updated = { ...member, ...updates };
    this.teamMembers.set(id, updated);
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    this.teamMembers.delete(id);
  }

  // Task operations
  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTaskWithDetails(id: string): Promise<TaskWithDetails | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const team = this.teams.get(task.teamId)!;
    let responsibleMember;
    if (task.responsibleMemberId) {
      const member = this.teamMembers.get(task.responsibleMemberId);
      if (member) {
        responsibleMember = { ...member, user: this.users.get(member.userId)! };
      }
    }

    return { ...task, team, responsibleMember };
  }

  async getTasksByTeam(teamId: string, includeCompleted = false): Promise<TaskWithDetails[]> {
    const tasks = Array.from(this.tasks.values())
      .filter(task => {
        if (task.teamId !== teamId) return false;
        if (includeCompleted) return true;
        return task.status === TaskStatus.OPEN || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.BLOCKED;
      });

    const result: TaskWithDetails[] = [];
    for (const task of tasks) {
      const withDetails = await this.getTaskWithDetails(task.id);
      if (withDetails) result.push(withDetails);
    }

    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getTasksByResponsibleMember(memberId: string, includeCompleted = false): Promise<TaskWithDetails[]> {
    const tasks = Array.from(this.tasks.values())
      .filter(task => {
        if (task.responsibleMemberId !== memberId) return false;
        if (includeCompleted) return true;
        return task.status === TaskStatus.OPEN || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.BLOCKED;
      });

    const result: TaskWithDetails[] = [];
    for (const task of tasks) {
      const withDetails = await this.getTaskWithDetails(task.id);
      if (withDetails) result.push(withDetails);
    }

    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);

    // Create snapshot
    await this.createTaskSnapshot(task, ChangeType.ADDED);

    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    
    const updated = { ...task, ...updates, updatedAt: new Date() };
    this.tasks.set(id, updated);

    // Create snapshot
    await this.createTaskSnapshot(updated, ChangeType.EDITED);

    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      await this.createTaskSnapshot(task, ChangeType.DELETED);
      this.tasks.delete(id);
    }
  }

  private async createTaskSnapshot(task: Task, changeType: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let minutes = await this.getMinutesByTeamAndDate(task.teamId, today);
    
    if (!minutes) {
      minutes = await this.createMinutes({
        teamId: task.teamId,
        date: today,
        venue: this.teams.get(task.teamId)?.defaultVenue || null,
        attendance: [],
      });
    }

    await this.createSnapshot({
      minutesId: minutes.id,
      taskId: task.id,
      changeType: changeType as any,
      taskUpdatedAt: task.updatedAt,
      payload: task,
    });
  }

  // Minutes operations
  async getMinutes(id: string): Promise<Minutes | undefined> {
    return this.minutes.get(id);
  }

  async getMinutesByTeamAndDate(teamId: string, date: string): Promise<Minutes | undefined> {
    return Array.from(this.minutes.values())
      .find(m => m.teamId === teamId && m.date === date);
  }

  async getMinutesByTeam(teamId: string): Promise<MinutesWithSnapshots[]> {
    const teamMinutes = Array.from(this.minutes.values())
      .filter(m => m.teamId === teamId)
      .sort((a, b) => b.date.localeCompare(a.date));

    const result: MinutesWithSnapshots[] = [];
    for (const minute of teamMinutes) {
      const snapshots = await this.getSnapshotsByMinutes(minute.id);
      const team = this.teams.get(minute.teamId)!;
      result.push({ ...minute, snapshots, team });
    }

    return result;
  }

  async createMinutes(insertMinutes: InsertMinutes): Promise<Minutes> {
    const id = randomUUID();
    const minutes: Minutes = {
      ...insertMinutes,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.minutes.set(id, minutes);
    return minutes;
  }

  async updateMinutes(id: string, updates: Partial<Minutes>): Promise<Minutes> {
    const minutes = this.minutes.get(id);
    if (!minutes) throw new Error("Minutes not found");
    
    const updated = { ...minutes, ...updates, updatedAt: new Date() };
    this.minutes.set(id, updated);
    return updated;
  }

  // Snapshot operations
  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const id = randomUUID();
    const snapshot: Snapshot = {
      ...insertSnapshot,
      id,
      recordedAt: new Date(),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  async getSnapshotsByMinutes(minutesId: string): Promise<Snapshot[]> {
    return Array.from(this.snapshots.values())
      .filter(s => s.minutesId === minutesId)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  // Utility operations
  async getUserRole(userId: string): Promise<string> {
    const user = this.users.get(userId);
    if (!user) return "Member";
    
    if (user.email === "asif.shakir@gmail.com") return "Superadmin";
    if (user.isAdmin) return "Admin";
    
    const isCoordinator = Array.from(this.teamMembers.values())
      .some(tm => tm.userId === userId && tm.isCoordinator);
    
    return isCoordinator ? "Coordinator" : "Member";
  }

  async isUserCoordinatorOfTeam(userId: string, teamId: string): Promise<boolean> {
    return Array.from(this.teamMembers.values())
      .some(tm => tm.userId === userId && tm.teamId === teamId && tm.isCoordinator);
  }

  async searchTasks(query: string, teamId?: string): Promise<TaskWithDetails[]> {
    const searchTerm = query.toLowerCase();
    const tasks = Array.from(this.tasks.values())
      .filter(task => {
        if (teamId && task.teamId !== teamId) return false;
        
        const titleMatch = task.title.toLowerCase().includes(searchTerm);
        const notesMatch = task.notes?.toLowerCase().includes(searchTerm);
        
        // Search responsible member name
        let memberMatch = false;
        if (task.responsibleMemberId) {
          const member = this.teamMembers.get(task.responsibleMemberId);
          if (member) {
            const user = this.users.get(member.userId);
            if (user && user.displayName?.toLowerCase().includes(searchTerm)) {
              memberMatch = true;
            }
          }
        }
        
        return titleMatch || notesMatch || memberMatch;
      });

    const result: TaskWithDetails[] = [];
    for (const task of tasks) {
      const withDetails = await this.getTaskWithDetails(task.id);
      if (withDetails) result.push(withDetails);
    }

    return result;
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.users.values())
      .filter(user => {
        const nameMatch = user.displayName?.toLowerCase().includes(searchTerm);
        const emailMatch = user.email.toLowerCase().includes(searchTerm);
        return nameMatch || emailMatch;
      });
  }

  async searchTeams(query: string): Promise<TeamWithMembers[]> {
    const searchTerm = query.toLowerCase();
    const teams = await this.getAllTeamsWithMembers();
    
    return teams.filter(team => {
      const nameMatch = team.name.toLowerCase().includes(searchTerm);
      const memberMatch = team.members.some(member => 
        member.user.displayName?.toLowerCase().includes(searchTerm) ||
        member.user.email.toLowerCase().includes(searchTerm)
      );
      return nameMatch || memberMatch;
    });
  }
}

export const storage = new MemStorage();
