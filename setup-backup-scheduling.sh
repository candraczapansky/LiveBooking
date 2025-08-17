#!/bin/bash

# Backup Scheduling Setup Script for Salon/Spa Management System
# This script sets up automated backup scheduling with monitoring

set -e

echo "🔄 Setting up automated backup scheduling..."

# Make backup script executable
chmod +x backup-database.sh

# Create backup user
echo "👤 Creating backup user..."
sudo useradd -r -s /bin/false backup-user
sudo usermod -aG postgres backup-user

# Set up cron job for daily backups
echo "⏰ Setting up daily backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/salon-spa-app/backup-database.sh backup >> /var/log/backup-cron.log 2>&1") | crontab -

# Set up weekly backup verification
echo "🔍 Setting up weekly backup verification..."
(crontab -l 2>/dev/null; echo "0 3 * * 0 /var/www/salon-spa-app/backup-database.sh verify \$(ls -t /var/backups/database/salon_spa_*.enc | head -1) >> /var/log/backup-verify.log 2>&1") | crontab -

# Create backup monitoring script
echo "📊 Creating backup monitoring script..."
cat > monitor-backups.sh << 'EOF'
#!/bin/bash

# Backup Monitoring Script
# This script monitors backup health and sends alerts

BACKUP_DIR="/var/backups/database"
LOG_FILE="/var/log/backup-monitor.log"
ALERT_EMAIL="admin@yourdomain.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if backups exist
check_backup_exists() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/salon_spa_*.enc 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No encrypted backups found"
        return 1
    fi
    
    log "Latest backup: $(basename "$latest_backup")"
    return 0
}

# Check backup age
check_backup_age() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/salon_spa_*.enc 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backups found for age check"
        return 1
    fi
    
    local backup_time=$(stat -c %Y "$latest_backup")
    local current_time=$(date +%s)
    local age_hours=$(( (current_time - backup_time) / 3600 ))
    
    log "Backup age: ${age_hours} hours"
    
    if [ $age_hours -gt 48 ]; then
        warning "Backup is older than 48 hours"
        return 1
    fi
    
    return 0
}

# Check backup size
check_backup_size() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/salon_spa_*.enc 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backups found for size check"
        return 1
    fi
    
    local size_bytes=$(stat -c %s "$latest_backup")
    local size_mb=$((size_bytes / 1024 / 1024))
    
    log "Backup size: ${size_mb}MB"
    
    if [ $size_mb -lt 1 ]; then
        warning "Backup size is suspiciously small (< 1MB)"
        return 1
    fi
    
    return 0
}

# Check disk space
check_disk_space() {
    local backup_dir_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log "Backup directory disk usage: ${backup_dir_space}%"
    
    if [ $backup_dir_space -gt 90 ]; then
        error "Disk space is critically low (> 90%)"
        return 1
    elif [ $backup_dir_space -gt 80 ]; then
        warning "Disk space is getting low (> 80%)"
        return 1
    fi
    
    return 0
}

# Send alert email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log "Alert email sent to $ALERT_EMAIL"
    else
        log "Mail command not available, alert not sent"
    fi
}

# Main monitoring function
main() {
    log "Starting backup monitoring..."
    
    local issues=0
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory does not exist"
        send_alert "Backup Alert" "Backup directory $BACKUP_DIR does not exist"
        exit 1
    fi
    
    # Check if backups exist
    if ! check_backup_exists; then
        issues=$((issues + 1))
    fi
    
    # Check backup age
    if ! check_backup_age; then
        issues=$((issues + 1))
    fi
    
    # Check backup size
    if ! check_backup_size; then
        issues=$((issues + 1))
    fi
    
    # Check disk space
    if ! check_disk_space; then
        issues=$((issues + 1))
    fi
    
    # Summary
    if [ $issues -eq 0 ]; then
        log "All backup checks passed"
    else
        warning "$issues backup issues detected"
        send_alert "Backup Alert" "$issues backup issues detected. Check logs for details."
    fi
    
    return $issues
}

# Run main function
main "$@"
EOF

chmod +x monitor-backups.sh

# Set up daily backup monitoring
echo "📊 Setting up daily backup monitoring..."
(crontab -l 2>/dev/null; echo "0 6 * * * /var/www/salon-spa-app/monitor-backups.sh >> /var/log/backup-monitor.log 2>&1") | crontab -

# Create backup test script
echo "🧪 Creating backup test script..."
cat > test-backup-restore.sh << 'EOF'
#!/bin/bash

# Backup Test and Restore Script
# This script tests backup and restore functionality

set -e

BACKUP_DIR="/var/backups/database"
TEST_DB="salon_spa_test"
LOG_FILE="/var/log/backup-test.log"

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "\033[0;31m[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:\033[0m $1" | tee -a "$LOG_FILE"
}

# Create test database
create_test_db() {
    log "Creating test database: $TEST_DB"
    
    # Drop test database if it exists
    dropdb "$TEST_DB" 2>/dev/null || true
    
    # Create test database
    createdb "$TEST_DB"
    
    log "Test database created successfully"
}

# Test backup restore
test_restore() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    log "Testing restore from: $(basename "$backup_file")"
    
    # Create test database
    create_test_db
    
    # Restore to test database
    if ./backup-database.sh restore "$backup_file" > /dev/null 2>&1; then
        log "Backup restore test successful"
        
        # Verify test database has data
        local table_count=$(psql -d "$TEST_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
        
        if [ "$table_count" -gt 0 ]; then
            log "Test database contains $table_count tables"
        else
            error "Test database is empty"
            return 1
        fi
        
        # Clean up test database
        dropdb "$TEST_DB"
        log "Test database cleaned up"
        
        return 0
    else
        error "Backup restore test failed"
        dropdb "$TEST_DB" 2>/dev/null || true
        return 1
    fi
}

# Main function
main() {
    log "Starting backup test..."
    
    # Find latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/salon_spa_*.enc 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backups found for testing"
        exit 1
    fi
    
    log "Testing latest backup: $(basename "$latest_backup")"
    
    # Test restore
    if test_restore "$latest_backup"; then
        log "Backup test completed successfully"
        exit 0
    else
        error "Backup test failed"
        exit 1
    fi
}

# Run main function
main "$@"
EOF

chmod +x test-backup-restore.sh

# Set up weekly backup testing
echo "🧪 Setting up weekly backup testing..."
(crontab -l 2>/dev/null; echo "0 4 * * 0 /var/www/salon-spa-app/test-backup-restore.sh >> /var/log/backup-test.log 2>&1") | crontab -

# Create backup report script
echo "📋 Creating backup report script..."
cat > backup-report.sh << 'EOF'
#!/bin/bash

# Backup Report Script
# This script generates a backup status report

BACKUP_DIR="/var/backups/database"
REPORT_FILE="/var/log/backup-report.txt"

echo "📊 Backup Status Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "================================" >> "$REPORT_FILE"

# List all backups
echo "" >> "$REPORT_FILE"
echo "Available Backups:" >> "$REPORT_FILE"
echo "-----------------" >> "$REPORT_FILE"

if [ -d "$BACKUP_DIR" ]; then
    for file in "$BACKUP_DIR"/salon_spa_*.enc; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -c %y "$file" | cut -d' ' -f1)
            echo "$filename - $size - $date" >> "$REPORT_FILE"
        fi
    done
else
    echo "No backup directory found" >> "$REPORT_FILE"
fi

# Disk usage
echo "" >> "$REPORT_FILE"
echo "Disk Usage:" >> "$REPORT_FILE"
echo "-----------" >> "$REPORT_FILE"
df -h "$BACKUP_DIR" >> "$REPORT_FILE" 2>/dev/null || echo "Cannot check disk usage" >> "$REPORT_FILE"

# Recent backup logs
echo "" >> "$REPORT_FILE"
echo "Recent Backup Logs:" >> "$REPORT_FILE"
echo "------------------" >> "$REPORT_FILE"
tail -n 20 /var/log/backup-database.log >> "$REPORT_FILE" 2>/dev/null || echo "No backup logs found" >> "$REPORT_FILE"

echo "Report saved to: $REPORT_FILE"
cat "$REPORT_FILE"
EOF

chmod +x backup-report.sh

# Create log rotation for backup logs
echo "📋 Setting up log rotation for backup logs..."
sudo tee /etc/logrotate.d/backup-logs << 'EOF'
/var/log/backup-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

echo "✅ Backup scheduling setup completed!"
echo ""
echo "📋 Available commands:"
echo "- Create backup: ./backup-database.sh backup"
echo "- List backups: ./backup-database.sh list"
echo "- Verify backup: ./backup-database.sh verify <file>"
echo "- Restore backup: ./backup-database.sh restore <file>"
echo "- Monitor backups: ./monitor-backups.sh"
echo "- Test backup: ./test-backup-restore.sh"
echo "- Generate report: ./backup-report.sh"
echo ""
echo "⏰ Scheduled jobs:"
echo "- Daily backup: 2:00 AM"
echo "- Weekly verification: Sunday 3:00 AM"
echo "- Daily monitoring: 6:00 AM"
echo "- Weekly testing: Sunday 4:00 AM"
echo ""
echo "📊 Monitoring:"
echo "- Check cron jobs: crontab -l"
echo "- View backup logs: tail -f /var/log/backup-database.log"
echo "- View monitoring logs: tail -f /var/log/backup-monitor.log" 