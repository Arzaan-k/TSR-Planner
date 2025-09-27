import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://your-production-domain.com' // Replace with actual production domain
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

    (async () => {
      try {
        const server = await registerRoutes(app);

        // Global error handler
        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
          const status = err.status || err.statusCode || 500;
          const message = process.env.NODE_ENV === 'production' 
            ? (status === 500 ? 'Internal Server Error' : err.message)
            : err.message;

          res.status(status).json({ 
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
          });
          
          // Log errors in production
          if (process.env.NODE_ENV === 'production') {
            console.error("Server error:", {
              message: err.message,
              stack: err.stack,
              url: _req.url,
              method: _req.method,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error("Server error:", err);
          }
        });

        // Setup Vite in development, serve static files in production
        if (app.get("env") === "development") {
          await setupVite(app, server);
        } else {
          serveStatic(app);
        }

        // Get port from environment or default to 5000
        // Render uses port 10000 by default
        const port = parseInt(process.env.PORT || '5000', 10);
        
        // Start server
        server.listen(port, "0.0.0.0", () => {
          log(`🚀 TSR Planner server running on port ${port}`);
          log(`📊 Environment: ${process.env.NODE_ENV}`);
          log(`🌐 Access: http://localhost:${port}`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = (signal: string) => {
          log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
          server.close(() => {
            log('✅ Server closed successfully');
            process.exit(0);
          });

          // Force close after 10 seconds
          setTimeout(() => {
            log('⚠️ Forced shutdown after timeout');
            process.exit(1);
          }, 10000);
        };

        // Handle uncaught exceptions and unhandled rejections
        process.on('uncaughtException', (error) => {
          console.error('💥 Uncaught Exception:', error);
          if (process.env.NODE_ENV === 'production') {
            gracefulShutdown('uncaughtException');
          }
        });

        process.on('unhandledRejection', (reason, promise) => {
          console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
          if (process.env.NODE_ENV === 'production') {
            gracefulShutdown('unhandledRejection');
          }
        });

        // Handle termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
      }
    })();
