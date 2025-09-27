import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertTeamSchema, insertTeamMemberSchema, 
  insertTaskSchema, insertMinutesSchema, TaskStatus 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      let tasks;
      if (memberId && typeof memberId === "string") {
        tasks = await storage.getTasksByResponsibleMember(memberId);
      } else if (teamId && typeof teamId === "string") {
        tasks = await storage.getTasksByTeam(teamId);
      } else {
        return res.status(400).json({ message: "teamId or memberId required" });
      }
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
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
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const task = await storage.updateTask(id, updates);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTask(id);
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

  const httpServer = createServer(app);
  return httpServer;
}
