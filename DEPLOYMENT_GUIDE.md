# Production Deployment Guide

## 🚀 Overview

This guide provides comprehensive instructions for deploying the Salon/Spa Management System to production with enterprise-grade security, performance, and monitoring.

## 📋 Pre-Deployment Checklist

### Security Requirements ✅
- [ ] JWT_SECRET (32+ characters) configured
- [ ] DATABASE_URL with SSL enabled
- [ ] HTTPS/TLS certificates installed
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] CORS settings validated
- [ ] Security headers implemented
- [ ] Input validation enabled

### Performance Requirements ✅
- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] File upload limits set
- [ ] Memory monitoring enabled
- [ ] Query optimization completed

### Monitoring Requirements ✅
- [ ] Logging system configured
- [ ] Error tracking (Sentry) setup
- [ ] Performance monitoring enabled
- [ ] Health checks implemented
- [ ] Backup strategy configured

## 🔧 Environment Setup

### 1. Environment Variables

Create a `.env` file with the following variables:

```bash
# Required Variables
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
NODE_ENV=production

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Payment Configuration (Optional)
SQUARE_APPLICATION_ID=your-square-app-id
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=production

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# Performance
CACHE_TTL=300000
MAX_FILE_SIZE=10485760
REQUEST_TIMEOUT=30000

# SSL/TLS (for production)
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

### 2. Database Setup

```sql
-- Create database indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_history_transaction_date ON sales_history(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_history_payment_status ON sales_history(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_history_staff_id ON sales_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
```

### 3. SSL/TLS Configuration

For production, ensure HTTPS is enabled:

```bash
# Install SSL certificates
sudo certbot --nginx -d yourdomain.com

# Configure nginx with SSL
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🚀 Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-repo/salon-spa-app.git
cd salon-spa-app

# Install dependencies
npm install

# Build application
npm run build

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3. Database Migration

```bash
# Run database migrations
npm run db:migrate

# Create database indexes
npm run db:indexes

# Seed initial data (if needed)
npm run db:seed
```

### 4. Monitoring Setup

```bash
# Install monitoring tools
pm2 install pm2-logrotate
pm2 install pm2-server-monit

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Database Security

```bash
# Secure PostgreSQL
sudo -u postgres psql

# Create application user
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE salon_spa TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### 3. Application Security

```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/salon-spa-app
sudo chmod -R 755 /var/www/salon-spa-app
sudo chmod 600 /var/www/salon-spa-app/.env
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Monitor system resources
pm2 show salon-spa-app
```

### 2. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/salon-spa-app

# Add configuration
/var/log/salon-spa-app/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### 3. Health Checks

```bash
# Test application health
curl -f http://localhost:5000/api/health

# Monitor database connection
curl -f http://localhost:5000/api/health/database
```

## 🔧 Performance Optimization

### 1. Database Optimization

```sql
-- Analyze table statistics
ANALYZE sales_history;
ANALYZE appointments;
ANALYZE users;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 2. Application Optimization

```bash
# Enable gzip compression in nginx
sudo nano /etc/nginx/nginx.conf

# Add to http block
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 3. Caching Strategy

```bash
# Install Redis for caching
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set memory limit
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## 🚨 Incident Response

### 1. Error Monitoring

```bash
# Monitor application errors
pm2 logs --err

# Check system resources
htop
df -h
free -h
```

### 2. Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-database.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/database"
mkdir -p $BACKUP_DIR

pg_dump salon_spa > $BACKUP_DIR/salon_spa_$DATE.sql
gzip $BACKUP_DIR/salon_spa_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 3. Recovery Procedures

```bash
# Restart application
pm2 restart salon-spa-app

# Restore database
gunzip -c backup_file.sql.gz | psql salon_spa

# Rollback deployment
pm2 restart salon-spa-app --update-env
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling

```bash
# Load balancer configuration
upstream salon_spa_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}
```

### 2. Database Scaling

```sql
-- Read replicas for reporting
-- Configure connection pooling
-- Implement database sharding for large datasets
```

### 3. Caching Strategy

```bash
# Redis cluster setup
# CDN configuration for static assets
# Application-level caching
```

## 🔍 Security Auditing

### 1. Regular Security Checks

```bash
# Run security audit
npm audit

# Check for vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### 2. Penetration Testing

```bash
# Test authentication endpoints
curl -X POST https://yourdomain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test rate limiting
for i in {1..110}; do curl https://yourdomain.com/api/health; done
```

### 3. Compliance Monitoring

```bash
# GDPR compliance checks
# Data retention policies
# Privacy impact assessments
```

## 📋 Maintenance Schedule

### Daily
- [ ] Monitor application logs
- [ ] Check system resources
- [ ] Verify backup completion
- [ ] Review security alerts

### Weekly
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Test backup restoration
- [ ] Security patch updates

### Monthly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Database maintenance
- [ ] SSL certificate renewal

### Quarterly
- [ ] Penetration testing
- [ ] Disaster recovery testing
- [ ] Compliance review
- [ ] Architecture review

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   pm2 logs salon-spa-app
   check .env configuration
   verify database connection
   ```

2. **High memory usage**
   ```bash
   pm2 monit
   check for memory leaks
   restart application
   ```

3. **Database connection issues**
   ```bash
   sudo systemctl status postgresql
   check database logs
   verify connection string
   ```

4. **SSL certificate issues**
   ```bash
   sudo certbot renew
   check nginx configuration
   verify certificate paths
   ```

## 📞 Support Contacts

- **Technical Support**: tech@yourdomain.com
- **Security Issues**: security@yourdomain.com
- **Emergency**: +1-555-0123

## 📚 Additional Resources

- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/runtime-config.html)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: DevOps Team 