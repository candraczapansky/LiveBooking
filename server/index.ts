import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
// registerRoutes is loaded dynamically to tolerate different build outputs
// (e.g., ./routes.js vs ./routes/index.js) in various deployment environments
// Avoid importing vite helpers at module load to prevent requiring vite.js in production builds
import { log } from "./log.js";
import { DatabaseStorage } from "./storage.js";
import { EmailAutomationService } from "./email-automation.js";
import { MarketingCampaignService } from "./marketing-campaigns.js";
import { createServer } from "http";

// Load environment variables
config();

const app = express();

// Disable ETag to prevent 304 on dynamic API responses (polling endpoints)
app.set('etag', false);

// Capture raw body for signature verification and to support minimal webhook payloads
const rawBodySaver = (req: any, _res: any, buf: Buffer) => {
  try {
    if (buf && (buf as any).length) {
      (req as any).rawBody = buf.toString('utf8');
    }
  } catch {}
};

// Accept text bodies for Helcim webhook endpoints (they may send very basic payloads)
// Place before JSON/urlencoded parsers so text/plain bodies are captured
app.use('/api/terminal/webhook', express.text({ type: '*/*', limit: '10mb' }));
app.use('/api/helcim', express.text({ type: '*/*', limit: '10mb' }));
app.use('/api/helcim-smart-terminal', express.text({ type: '*/*', limit: '10mb' }));

// Add CORS support for external applications
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  // Allow common local dev and any Replit-hosted origin (with or without port)
  const isAllowed = !!origin && (
    origin.includes('.replit.dev') ||
    origin.includes('.replit.app') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('http://0.0.0.0')
  );

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin!);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '10mb', verify: rawBodySaver as any } as any));
app.use(express.urlencoded({ extended: false, limit: '10mb', verify: rawBodySaver as any } as any));

// Apply security headers early (dynamically import to avoid hard dependency in production build)
try {
  (async () => {
    try {
      const mod = await import("./middleware/security.js");
      if (mod?.securityHeaders) {
        app.use(...mod.securityHeaders());
      }
    } catch (e) {
      log(`Security middleware not loaded: ${(e as any)?.message || e}`);
    }
  })();
} catch {}

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
    
    // Load routes module with resilient resolution
    const routesModule = await import("./routes.js").catch(async () => {
      return await import("./routes/index.js");
    });
    const server = await (routesModule as any).registerRoutes(app, storage);

    // Booking-only domain guard: force all HTML navigations to /booking
    // Configure with BOOKING_ONLY_HOSTS env var (comma-separated hostnames)
    try {
      const bookingOnlyHosts = (process.env.BOOKING_ONLY_HOSTS || '')
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean);

      if (bookingOnlyHosts.length > 0) {
        app.use((req: Request, res: Response, next: NextFunction) => {
          // Skip API routes and non-GET requests
          if (req.path.startsWith('/api') || req.method !== 'GET') return next();

          const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
          if (!bookingOnlyHosts.includes(hostHeader)) return next();

          // Only intercept browser navigations (HTML)
          const accept = String(req.headers.accept || '');
          const isHtmlNav = accept.includes('text/html');
          if (!isHtmlNav) return next();

          // Allow only the booking page itself; redirect everything else
          if (req.path !== '/booking') {
            return res.redirect(302, '/booking');
          }

          return next();
        });
      }
    } catch {}

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
      try {
        const { setupVite } = await import("./vite.js");
        await setupVite(app, server);
      } catch (e) {
        log(`Vite dev server not available: ${(e as any)?.message || e}`);
      }
    } else {
      // Minimal static serving for production without importing vite.js
      const distPublic = path.resolve(process.cwd(), "dist", "public");
      if (fs.existsSync(distPublic)) {
        app.use(express.static(distPublic));
        app.get("*", (req, res, next) => {
          const url = req.originalUrl || req.url || "";
          if (url.startsWith("/api/")) return next();
          res.sendFile(path.resolve(distPublic, "index.html"));
        });
      } else {
        log("Static build not found at " + distPublic);
      }
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
