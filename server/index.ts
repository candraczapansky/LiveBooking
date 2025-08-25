import express, { type Request, Response, NextFunction } from "express";
import { config } from "dotenv";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { DatabaseStorage } from "./storage.js";
import { securityHeaders } from "./middleware/security.js";
import { EmailAutomationService } from "./email-automation.js";
import { MarketingCampaignService } from "./marketing-campaigns.js";
import { createServer } from "http";

// Load environment variables
config();

const app = express();

// Add CORS support for external applications
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  // Allow common local dev and any Replit-hosted origin (with or without port)
  const isAllowed = !!origin && (
    origin.includes('.replit.dev') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('http://0.0.0.0')
  );

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin!);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply security headers early
app.use(...securityHeaders());

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



// Function to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  const net = await import('net');
  
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as any)?.port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Try the next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

(async () => {
  try {
    const storage = new DatabaseStorage();
    
    // Initialize email automation service
    const emailAutomationService = new EmailAutomationService(storage);
    emailAutomationService.startService();
    
    // Initialize marketing campaign service
    const marketingCampaignService = new MarketingCampaignService(storage);
    marketingCampaignService.startService();
    
    const server = await registerRoutes(app, storage);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Error in request:', err);
      res.status(status).json({ message });
      // Don't throw the error to prevent server crashes
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Determine port: In production (Cloud Run/Replit Deploy), use provided PORT and do not scan.
    // Only scan for an open port during local development convenience.
    const isDevelopment = app.get("env") === "development";
    // Prefer PORT env var, otherwise default to 3002. Only scan for an open port
    // if PORT is not provided (local developer convenience). Many hosts (like Replit)
    // require binding to the exact PORT they provide.
    const preferredPort = parseInt(process.env.PORT || '3002');
    let port = preferredPort;
    let hasRetriedDueToPortConflict = false;

    if (isDevelopment && !process.env.PORT) {
      try {
        port = await findAvailablePort(preferredPort);
      } catch (err) {
        console.error('❌ Failed to scan for available port:', err);
        port = preferredPort;
      }
    }

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`✅ Server running on port ${port}`);
      if (isDevelopment && port !== preferredPort) {
        log(`⚠️  Port ${preferredPort} was in use, using port ${port} instead`);
      }
    });

    // Handle server errors gracefully
    server.on('error', async (err: any) => {
      if (err.code === 'EADDRINUSE') {
        if (isDevelopment && !hasRetriedDueToPortConflict) {
          try {
            hasRetriedDueToPortConflict = true;
            const newPort = await findAvailablePort(port + 1);
            server.listen({ port: newPort, host: '0.0.0.0' }, () => {
              log(`⚠️  Port ${port} was in use, switched to port ${newPort}`);
              port = newPort;
            });
            return;
          } catch (scanErr) {
            console.error('❌ Could not find a free port after conflict:', scanErr);
          }
        }
        console.error(`❌ Port ${port} is already in use. Please try again.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
