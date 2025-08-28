import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { nanoid } from "nanoid";
const viteLogger = createLogger();
export function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
export async function setupVite(app, server) {
    // Dynamically load Vite config only in development to avoid requiring it in production builds
    let userViteConfig = {};
    try {
        const tsConfigPath = path.resolve(import.meta.dirname, "..", "vite.config.ts");
        const jsConfigPath = path.resolve(import.meta.dirname, "..", "vite.config.js");
        try {
            userViteConfig = (await import(tsConfigPath)).default;
        }
        catch (_e) {
            userViteConfig = (await import(jsConfigPath)).default;
        }
    }
    catch (_e) {
        // If config cannot be loaded, proceed with defaults
        userViteConfig = {};
    }
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true,
    };
    const vite = await createViteServer({
        ...userViteConfig,
        configFile: false,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                viteLogger.error(msg, options);
                process.exit(1);
            },
        },
        server: serverOptions,
        appType: "custom",
    });
    app.use(vite.middlewares);
    // Only handle non-API GET requests for the SPA in development
    app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        // Skip API routes
        if (url.startsWith("/api/")) {
            return next();
        }
        try {
            const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
            // always reload the index.html file from disk incase it changes
            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
export function serveStatic(app) {
    // Resolve the built client directory robustly across different run modes
    //  - When running compiled JS: dist/server -> dist/public
    //  - When running via ts-node: server -> ../dist/public
    //  - As a last resort, try CWD based resolution
    const candidatePaths = [
        path.resolve(import.meta.dirname, "..", "public"),
        path.resolve(import.meta.dirname, "..", "..", "dist", "public"),
        path.resolve(process.cwd(), "dist", "public"),
    ];
    const distPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!distPath) {
        // Do not crash; respond with a helpful message instead of 500 on every request
        log("Static build not found. Expected one of: " + candidatePaths.join(", "));
        app.use((req, res) => {
            res
                .status(500)
                .type("text/plain")
                .send("Build not found. Please run 'npm run build' on the server.");
        });
        return;
    }
    app.use(express.static(distPath));
    // Only serve the SPA for non-API GET requests
    app.get("*", (req, res, next) => {
        const url = req.originalUrl || req.url || "";
        if (url.startsWith("/api/"))
            return next();
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
