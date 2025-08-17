#!/bin/bash

# SSL Certificate Setup Script for Salon/Spa Management System
# Run this script as root: sudo bash ssl-setup.sh

set -e

# Configuration
DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"

echo "🔒 Setting up SSL certificates for $DOMAIN..."

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Certbot and Nginx plugin
echo "🔧 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
echo "⏸️  Stopping nginx..."
systemctl stop nginx

# Create basic nginx configuration for certbot
echo "📝 Creating temporary nginx configuration..."
cat > /etc/nginx/sites-available/salon-spa-app << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/salon-spa-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Start nginx
echo "🚀 Starting nginx..."
systemctl start nginx

# Obtain SSL certificate
echo "🎫 Obtaining SSL certificate..."
certbot --nginx \
    --email $EMAIL \
    --domains $DOMAIN,www.$DOMAIN \
    --agree-tos \
    --non-interactive \
    --redirect

# Verify certificate
echo "✅ Verifying certificate..."
certbot certificates

# Set up automatic renewal
echo "🔄 Setting up automatic renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Test renewal process
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

# Update nginx configuration with production settings
echo "📝 Updating nginx configuration..."
cp nginx-production.conf /etc/nginx/sites-available/salon-spa-app

# Replace domain placeholder
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/salon-spa-app

# Test nginx configuration
echo "🧪 Testing updated nginx configuration..."
nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

# Enable nginx to start on boot
echo "🚀 Enabling nginx to start on boot..."
systemctl enable nginx

# Set up log rotation for nginx
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/nginx-salon-spa << 'EOF'
/var/log/nginx/salon-spa-*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

# Create SSL security test script
echo "🔍 Creating SSL security test script..."
cat > /usr/local/bin/test-ssl.sh << 'EOF'
#!/bin/bash
DOMAIN="yourdomain.com"

echo "🔒 Testing SSL configuration for $DOMAIN..."

# Test SSL certificate
echo "📜 Certificate information:"
openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Test SSL Labs grade (requires curl)
echo "📊 SSL Labs grade (if available):"
curl -s "https://api.ssllabs.com/api/v3/analyze?host=$DOMAIN" | jq -r '.endpoints[0].grade' 2>/dev/null || echo "SSL Labs API not available"

# Test HSTS
echo "🛡️  HSTS header:"
curl -sI https://$DOMAIN | grep -i "strict-transport-security" || echo "HSTS header not found"

# Test security headers
echo "🔐 Security headers:"
curl -sI https://$DOMAIN | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Content-Security-Policy)"

echo "✅ SSL security test completed!"
EOF

chmod +x /usr/local/bin/test-ssl.sh

# Run SSL security test
echo "🔍 Running SSL security test..."
/usr/local/bin/test-ssl.sh

echo "🎉 SSL setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update your DNS records to point to this server"
echo "2. Test your application at https://$DOMAIN"
echo "3. Run: /usr/local/bin/test-ssl.sh to verify SSL security"
echo "4. Monitor certificate renewal: certbot certificates"
echo ""
echo "🔗 Useful commands:"
echo "- Check certificate status: certbot certificates"
echo "- Renew certificates manually: certbot renew"
echo "- Test nginx config: nginx -t"
echo "- Reload nginx: systemctl reload nginx" 