import { LoggerService } from './logger.js';
import { redisCache } from './redis-cache.js';
// Performance monitoring class
export class PerformanceMonitor {
    constructor() {
        this.requestCount = 0;
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.totalResponseTime = 0;
        this.databaseQueries = 0;
        this.slowQueries = 0;
        this.totalQueryTime = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.startTime = Date.now();
        this.metrics = this.initializeMetrics();
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    initializeMetrics() {
        return {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                averageResponseTime: 0,
            },
            cache: {
                hits: 0,
                misses: 0,
                hitRate: 0,
            },
            database: {
                queries: 0,
                slowQueries: 0,
                averageQueryTime: 0,
            },
            memory: {
                used: 0,
                total: 0,
                percentage: 0,
            },
            uptime: 0,
            timestamp: new Date(),
        };
    }
    // Track request metrics
    trackRequest(duration, success) {
        this.requestCount++;
        this.totalResponseTime += duration;
        if (success) {
            this.successfulRequests++;
        }
        else {
            this.failedRequests++;
        }
        this.updateMetrics();
    }
    // Track database query metrics
    trackDatabaseQuery(duration, isSlow = false) {
        this.databaseQueries++;
        this.totalQueryTime += duration;
        if (isSlow) {
            this.slowQueries++;
        }
        this.updateMetrics();
    }
    // Track cache metrics
    trackCacheHit() {
        this.cacheHits++;
        this.updateMetrics();
    }
    trackCacheMiss() {
        this.cacheMisses++;
        this.updateMetrics();
    }
    // Update metrics
    updateMetrics() {
        const memoryUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        this.metrics = {
            requests: {
                total: this.requestCount,
                successful: this.successfulRequests,
                failed: this.failedRequests,
                averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
            },
            cache: {
                hits: this.cacheHits,
                misses: this.cacheMisses,
                hitRate: (this.cacheHits + this.cacheMisses) > 0
                    ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
                    : 0,
            },
            database: {
                queries: this.databaseQueries,
                slowQueries: this.slowQueries,
                averageQueryTime: this.databaseQueries > 0 ? this.totalQueryTime / this.databaseQueries : 0,
            },
            memory: {
                used: memoryUsage.heapUsed,
                total: totalMemory,
                percentage: (memoryUsage.heapUsed / totalMemory) * 100,
            },
            uptime: Date.now() - this.startTime,
            timestamp: new Date(),
        };
    }
    // Get current metrics
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    // Reset metrics
    resetMetrics() {
        this.requestCount = 0;
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.totalResponseTime = 0;
        this.databaseQueries = 0;
        this.slowQueries = 0;
        this.totalQueryTime = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.updateMetrics();
    }
}
// Health check service
export class HealthCheckService {
    constructor() {
        this.healthStatus = this.initializeHealthStatus();
    }
    static getInstance() {
        if (!HealthCheckService.instance) {
            HealthCheckService.instance = new HealthCheckService();
        }
        return HealthCheckService.instance;
    }
    initializeHealthStatus() {
        return {
            status: 'healthy',
            checks: {
                database: true,
                redis: true,
                externalServices: true,
            },
            timestamp: new Date(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
        };
    }
    // Perform health checks
    async performHealthCheck() {
        const checks = {
            database: await this.checkDatabase(),
            redis: await this.checkRedis(),
            externalServices: await this.checkExternalServices(),
        };
        const allHealthy = Object.values(checks).every(check => check);
        const anyUnhealthy = Object.values(checks).some(check => !check);
        this.healthStatus = {
            status: anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
        };
        LoggerService.info('Health check completed', { status: this.healthStatus.status, checks });
        return this.healthStatus;
    }
    // Check database connectivity
    async checkDatabase() {
        try {
            // This would need to be implemented based on your database connection
            // For now, we'll assume it's healthy
            return true;
        }
        catch (error) {
            LoggerService.error('Database health check failed', {}, error);
            return false;
        }
    }
    // Check Redis connectivity
    async checkRedis() {
        try {
            await redisCache.get('health-check');
            return true;
        }
        catch (error) {
            LoggerService.error('Redis health check failed', {}, error);
            return false;
        }
    }
    // Check external services
    async checkExternalServices() {
        try {
            // Check Square API
            if (process.env.SQUARE_ACCESS_TOKEN) {
                // This would be a simple ping to Square API
                // For now, we'll assume it's healthy
            }
            // Check Twilio API
            if (process.env.TWILIO_ACCOUNT_SID) {
                // This would be a simple ping to Twilio API
                // For now, we'll assume it's healthy
            }
            return true;
        }
        catch (error) {
            LoggerService.error('External services health check failed', {}, error);
            return false;
        }
    }
    // Get current health status
    getHealthStatus() {
        return { ...this.healthStatus };
    }
}
// Alerting service
export class AlertingService {
    constructor() {
        this.alerts = [];
    }
    static getInstance() {
        if (!AlertingService.instance) {
            AlertingService.instance = new AlertingService();
        }
        return AlertingService.instance;
    }
    // Create alert
    createAlert(type, message) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            timestamp: new Date(),
            resolved: false,
        };
        this.alerts.push(alert);
        LoggerService.warn(`Alert created: ${type}`, { alertId: alert.id, message });
        return alert.id;
    }
    // Resolve alert
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            LoggerService.info(`Alert resolved`, { alertId });
            return true;
        }
        return false;
    }
    // Get active alerts
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    // Get all alerts
    getAllAlerts() {
        return [...this.alerts];
    }
    // Clear old alerts
    clearOldAlerts(maxAge = 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAge;
        this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() > cutoff);
    }
}
// Monitoring middleware
export function monitoringMiddleware(req, res, next) {
    const startTime = Date.now();
    const monitor = PerformanceMonitor.getInstance();
    // Track request start
    LoggerService.debug('Request started', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    // Override res.json to track response
    const originalJson = res.json;
    res.json = function (data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        monitor.trackRequest(duration, success);
        // Log slow requests
        if (duration > 1000) { // 1 second
            LoggerService.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration: `${duration}ms`,
                statusCode: res.statusCode,
            });
        }
        return originalJson.call(this, data);
    };
    next();
}
// Scheduled health checks
export function startHealthChecks(interval = 5 * 60 * 1000) {
    const healthService = HealthCheckService.getInstance();
    const alertingService = AlertingService.getInstance();
    setInterval(async () => {
        try {
            const healthStatus = await healthService.performHealthCheck();
            if (healthStatus.status === 'unhealthy') {
                alertingService.createAlert('error', 'Application health check failed');
            }
            else if (healthStatus.status === 'degraded') {
                alertingService.createAlert('warning', 'Application health check degraded');
            }
        }
        catch (error) {
            LoggerService.error('Health check error', {}, error);
            alertingService.createAlert('error', 'Health check service error');
        }
    }, interval);
    LoggerService.info('Health checks started', { interval });
}
// Metrics endpoint middleware
export function metricsMiddleware(req, res, next) {
    if (req.path === '/metrics') {
        const monitor = PerformanceMonitor.getInstance();
        const metrics = monitor.getMetrics();
        res.json({
            application: 'glo-head-spa',
            timestamp: new Date().toISOString(),
            metrics,
        });
    }
    else {
        next();
    }
}
// Health endpoint middleware
export function healthMiddleware(req, res, next) {
    if (req.path === '/health') {
        const healthService = HealthCheckService.getInstance();
        const healthStatus = healthService.getHealthStatus();
        res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
    }
    else {
        next();
    }
}
// Global instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const healthCheckService = HealthCheckService.getInstance();
export const alertingService = AlertingService.getInstance();
// Cleanup old alerts every hour
setInterval(() => {
    alertingService.clearOldAlerts();
}, 60 * 60 * 1000); // 1 hour 
