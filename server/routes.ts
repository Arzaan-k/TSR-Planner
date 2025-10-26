import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertTeamSchema, insertTeamMemberSchema, 
  insertTaskSchema, insertMinutesSchema, TaskStatus 
} from "@shared/schema";

// Helper to extract auth context from headers
function getAuthFromHeaders(req: any) {
  const userId = req.headers["x-user-id"] as string | undefined;
  const role = (req.headers["x-user-role"] as string | undefined) || "Member";
  return { userId, role };
}

async function isUserMemberOfTeam(userId: string, teamId: string): Promise<boolean> {
  const memberships = await storage.getTeamMembersByUser(userId);
  return memberships.some(m => m.team.id === teamId);
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('📍 Starting route registration...');
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, displayName, photoUrl } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      let user = await storage.getUserByEmail(email);
      
      // Check if this is a superadmin email
      const isSuperadmin = email === "asif.shakir@gmail.com" || email === "brocklesnar12124@gmail.com";
      
      if (!user) {
        user = await storage.createUser({
          email,
          displayName,
          photoUrl,
          isAdmin: isSuperadmin,
        });
      } else if (isSuperadmin && !user.isAdmin) {
        user = await storage.updateUser(user.id, { isAdmin: true });
      }
      
      const role = await storage.getUserRole(user.id);
      res.json({ user, role });
    } catch (error) {
      console.error("Auth login error:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
          res.status(503).json({ 
            message: "Database temporarily unavailable. Please try again in a moment.",
            retryable: true 
          });
        } else if (error.message.includes("duplicate key")) {
          res.status(409).json({ 
            message: "User already exists. Please try signing in again.",
            retryable: true 
          });
        } else {
          res.status(500).json({ 
            message: "Login failed. Please try again.",
            retryable: true 
          });
        }
      } else {
        res.status(500).json({ 
          message: "Login failed. Please try again.",
          retryable: true 
        });
      }
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithRoles = await Promise.all(
        users.map(async (user) => ({
          ...user,
          role: await storage.getUserRole(user.id),
        }))
      );
      res.json(usersWithRoles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Query parameter required" });
      }
      
      const users = await storage.searchUsers(q);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.patch("/api/users/:id/admin", async (req, res) => {
    try {
      const { id } = req.params;
      const { isAdmin } = req.body;
      
      const user = await storage.updateUser(id, { isAdmin });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update admin status" });
    }
  });


  // Team routes
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeamsWithMembers();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Query parameter required" });
      }
      
      const teams = await storage.searchTeams(q);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      console.error("Team creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: `Invalid team data: ${error.message}` });
      } else {
        res.status(400).json({ message: "Invalid team data" });
      }
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const team = await storage.updateTeam(id, updates);
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // Team member routes
  app.post("/api/team-members", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(memberData);
      res.json(member);
    } catch (error) {
      res.status(400).json({ message: "Invalid member data" });
    }
  });

  app.patch("/api/team-members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const member = await storage.updateTeamMember(id, updates);
      res.json(member);
    } catch (error) {
      console.error("Team member update error:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: `Failed to update member: ${error.message}` });
      } else {
        res.status(500).json({ message: "Failed to update member" });
      }
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTeamMember(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const { teamId, memberId } = req.query;
      console.log("Fetching tasks with params:", { teamId, memberId });
      
      let tasks;
      if (memberId && typeof memberId === "string") {
        console.log("Fetching tasks by member ID:", memberId);
        tasks = await storage.getTasksByResponsibleMember(memberId);
      } else if (teamId && typeof teamId === "string") {
        console.log("Fetching tasks by team ID:", teamId);
        tasks = await storage.getTasksByTeam(teamId);
      } else {
        console.log("Missing required parameters");
        return res.status(400).json({ message: "teamId or memberId required" });
      }
      
      console.log("Returning tasks count:", tasks.length);
      res.json(tasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      res.status(500).json({ 
        message: "Failed to fetch tasks",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/tasks/search", async (req, res) => {
    try {
      const { q, teamId } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Query parameter required" });
      }
      
      const tasks = await storage.searchTasks(q, typeof teamId === "string" ? teamId : undefined);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const { userId, role } = getAuthFromHeaders(req);
      
      // Process the request body to convert dueDate string to Date object
      const processedBody = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
      };
      
      // Handle case where dueDate is an empty string
      if (processedBody.dueDate && isNaN(processedBody.dueDate.getTime())) {
        delete processedBody.dueDate;
      }
      
      console.log("Processing task data:", processedBody);
      const taskData = insertTaskSchema.parse(processedBody);

      // Validate assignee belongs to the same team if provided
      if (taskData.responsibleMemberId) {
        const member = await storage.getTeamMember(taskData.responsibleMemberId);
        if (!member || member.teamId !== taskData.teamId) {
          return res.status(400).json({ message: "Responsible member must belong to the same team" });
        }
      }

       // Permission: Superadmin/Admin can create for any team
       if (role === "Superadmin" || role === "Admin") {
         const task = await storage.createTask(taskData, userId!);
         return res.json(task);
       }

       // Coordinators can create for their own team
       if (userId && role === "Coordinator") {
         const isCoordinator = await storage.isUserCoordinatorOfTeam(userId, taskData.teamId);
         if (isCoordinator) {
           const task = await storage.createTask(taskData, userId);
           return res.json(task);
         }
       }

      return res.status(403).json({ message: "Not authorized to create tasks for this team" });
    } catch (error) {
      console.error("Task creation error:", error);
      if (error instanceof Error) {
        if (error.name === "ZodError") {
          return res.status(400).json({ 
            message: "Invalid task data format", 
            details: error.message 
          });
        }
      }
      return res.status(400).json({ 
        message: "Invalid task data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { userId, role } = getAuthFromHeaders(req);
      
      console.log(`Updating task ${id} with updates:`, updates);
      console.log(`User ID: ${userId}, Role: ${role}`);

      const existing = await storage.getTask(id);
      if (!existing) {
        console.log(`Task ${id} not found`);
        return res.status(404).json({ message: "Task not found" });
      }
      
      console.log(`Existing task:`, existing);

       // Superadmin/Admin can update all fields
       if (role === "Superadmin" || role === "Admin") {
         console.log(`User has Superadmin/Admin role, updating task`);
         const task = await storage.updateTask(id, updates, userId!);
         return res.json(task);
       }

       // Coordinator of the team can update all fields for their team
       if (userId && role === "Coordinator") {
         const isCoordinator = await storage.isUserCoordinatorOfTeam(userId, existing.teamId);
         if (isCoordinator) {
           console.log(`User is coordinator, updating task`);
           const task = await storage.updateTask(id, updates, userId);
           return res.json(task);
         }
       }

      // Team members: only notes (description) and status; must be a member of the task's team
      if (userId && (role === "Member")) {
        const memberOfTeam = await isUserMemberOfTeam(userId, existing.teamId);
        if (!memberOfTeam) {
          console.log(`User is not member of task's team`);
          return res.status(403).json({ message: "Not authorized to update this task" });
        }

        const allowed: Record<string, any> = {};
        if (typeof updates.notes !== "undefined") allowed.notes = updates.notes;
        if (typeof updates.status !== "undefined") {
          // Optional: restrict status transitions to valid values
          const valid = ["Open", "In-Progress", "Blocked", "Done", "Canceled"];
          if (!valid.includes(updates.status)) {
            console.log(`Invalid status: ${updates.status}`);
            return res.status(400).json({ message: "Invalid status" });
          }
          allowed.status = updates.status;
        }

        if (Object.keys(allowed).length === 0) {
          console.log(`No allowed fields to update`);
          return res.status(403).json({ message: "Members can only update description and status" });
        }

         console.log(`Updating task with allowed fields:`, allowed);
         const task = await storage.updateTask(id, allowed, userId);
         return res.json(task);
      }

      console.log(`User not authorized to update task`);
      return res.status(403).json({ message: "Not authorized to update this task" });
    } catch (error) {
      console.error("Task update error:", error);
      return res.status(500).json({ 
        message: "Failed to update task",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = getAuthFromHeaders(req);
      await storage.deleteTask(id, userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Minutes routes
  app.get("/api/minutes", async (req, res) => {
    try {
      const { teamId } = req.query;
      if (!teamId || typeof teamId !== "string") {
        return res.status(400).json({ message: "teamId required" });
      }
      
      const minutes = await storage.getMinutesByTeam(teamId);
      res.json(minutes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch minutes" });
    }
  });

  // Get minutes by team and date
  app.get("/api/minutes/by-team-and-date", async (req, res) => {
    try {
      const { teamId, date } = req.query as { teamId?: string; date?: string };
      if (!teamId || !date) {
        return res.status(400).json({ message: "teamId and date are required" });
      }

      const record = await storage.getMinutesByTeamAndDate(teamId, date);
      if (!record) return res.status(404).json({ message: "Not found" });
      return res.json(record);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch minutes" });
    }
  });

  app.post("/api/minutes", async (req, res) => {
    try {
      const minutesData = insertMinutesSchema.parse(req.body);
      const minutes = await storage.createMinutes(minutesData);
      res.json(minutes);
    } catch (error) {
      res.status(400).json({ message: "Invalid minutes data" });
    }
  });

  app.patch("/api/minutes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const minutes = await storage.updateMinutes(id, updates);
      res.json(minutes);
    } catch (error) {
      res.status(500).json({ message: "Failed to update minutes" });
    }
  });

  console.log('✅ Route registration completed');
  
  const httpServer = createServer(app);
  return httpServer;
}
