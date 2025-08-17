#!/bin/bash

# Database Backup Script for Salon/Spa Management System
# This script creates automated backups with encryption and compression

set -e

# Configuration
BACKUP_DIR="/var/backups/database"
RETENTION_DAYS=30
COMPRESSION="gzip"
ENCRYPTION_KEY_FILE="/etc/ssl/private/backup-key.pem"
LOG_FILE="/var/log/backup-database.log"
DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/salon_spa}"

# Extract database connection details
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        chmod 750 "$BACKUP_DIR"
        chown postgres:postgres "$BACKUP_DIR"
    fi
}

# Generate encryption key if it doesn't exist
generate_encryption_key() {
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        log "Generating encryption key..."
        openssl rand -hex 32 > "$ENCRYPTION_KEY_FILE"
        chmod 600 "$ENCRYPTION_KEY_FILE"
        chown postgres:postgres "$ENCRYPTION_KEY_FILE"
    fi
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        error "Cannot connect to database"
        exit 1
    fi
    log "Database connection successful"
}

# Create backup
create_backup() {
    local timestamp=$(date +'%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/salon_spa_$timestamp.sql"
    local compressed_file="$backup_file.gz"
    local encrypted_file="$compressed_file.enc"
    
    log "Starting database backup..."
    
    # Create backup
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --no-password --clean --create --if-exists \
        --exclude-table-data='*.audit_log' \
        --exclude-table-data='*.temp_*' \
        > "$backup_file" 2>> "$LOG_FILE"; then
        
        log "Database dump completed: $backup_file"
        
        # Compress backup
        if [ "$COMPRESSION" = "gzip" ]; then
            gzip "$backup_file"
            log "Backup compressed: $compressed_file"
        fi
        
        # Encrypt backup
        if [ -f "$ENCRYPTION_KEY_FILE" ]; then
            openssl enc -aes-256-cbc -salt -in "$compressed_file" \
                -out "$encrypted_file" \
                -pass file:"$ENCRYPTION_KEY_FILE" 2>> "$LOG_FILE"
            
            if [ $? -eq 0 ]; then
                rm "$compressed_file"
                log "Backup encrypted: $encrypted_file"
            else
                error "Encryption failed"
                return 1
            fi
        else
            warning "Encryption key not found, backup not encrypted"
        fi
        
        # Set proper permissions
        chmod 640 "$encrypted_file" 2>/dev/null || chmod 640 "$compressed_file"
        chown postgres:postgres "$encrypted_file" 2>/dev/null || chown postgres:postgres "$compressed_file"
        
        log "Backup completed successfully"
        return 0
    else
        error "Database backup failed"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    local current_time=$(date +%s)
    local retention_seconds=$((RETENTION_DAYS * 24 * 60 * 60))
    
    for file in "$BACKUP_DIR"/salon_spa_*.sql*; do
        if [ -f "$file" ]; then
            local file_time=$(stat -c %Y "$file")
            local age=$((current_time - file_time))
            
            if [ $age -gt $retention_seconds ]; then
                rm "$file"
                deleted_count=$((deleted_count + 1))
                log "Deleted old backup: $(basename "$file")"
            fi
        fi
    done
    
    log "Cleanup completed: $deleted_count files deleted"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    log "Verifying backup integrity: $(basename "$backup_file")"
    
    # Check if file is encrypted
    if [[ "$backup_file" == *.enc ]]; then
        # Decrypt temporarily for verification
        local temp_file=$(mktemp)
        openssl enc -d -aes-256-cbc -in "$backup_file" \
            -out "$temp_file" \
            -pass file:"$ENCRYPTION_KEY_FILE" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            # Verify SQL syntax
            if head -n 1 "$temp_file" | grep -q "PostgreSQL database dump"; then
                log "Backup verification successful"
                rm "$temp_file"
                return 0
            else
                error "Backup verification failed: Invalid SQL format"
                rm "$temp_file"
                return 1
            fi
        else
            error "Backup verification failed: Decryption error"
            rm "$temp_file" 2>/dev/null
            return 1
        fi
    else
        # Verify uncompressed backup
        if head -n 1 "$backup_file" | grep -q "PostgreSQL database dump"; then
            log "Backup verification successful"
            return 0
        else
            error "Backup verification failed: Invalid SQL format"
            return 1
        fi
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo "No backups found"
        return
    fi
    
    echo "Filename                    Size    Date"
    echo "----------------------------------------"
    
    for file in "$BACKUP_DIR"/salon_spa_*.sql*; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -c %y "$file" | cut -d' ' -f1)
            printf "%-25s %-8s %s\n" "$filename" "$size" "$date"
        fi
    done
}

# Restore backup
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    log "Starting database restore from: $(basename "$backup_file")"
    
    # Confirm restore
    read -p "Are you sure you want to restore the database? This will overwrite existing data. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Restore cancelled by user"
        return 1
    fi
    
    # Create temporary file for decryption
    local temp_file=$(mktemp)
    
    # Decrypt if necessary
    if [[ "$backup_file" == *.enc ]]; then
        log "Decrypting backup..."
        openssl enc -d -aes-256-cbc -in "$backup_file" \
            -out "$temp_file" \
            -pass file:"$ENCRYPTION_KEY_FILE" 2>/dev/null
        
        if [ $? -ne 0 ]; then
            error "Failed to decrypt backup"
            rm "$temp_file" 2>/dev/null
            return 1
        fi
    else
        cp "$backup_file" "$temp_file"
    fi
    
    # Decompress if necessary
    if [[ "$temp_file" == *.gz ]]; then
        log "Decompressing backup..."
        gunzip "$temp_file"
        temp_file="${temp_file%.gz}"
    fi
    
    # Restore database
    log "Restoring database..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$temp_file" 2>> "$LOG_FILE"; then
        log "Database restore completed successfully"
        rm "$temp_file"
        return 0
    else
        error "Database restore failed"
        rm "$temp_file"
        return 1
    fi
}

# Main function
main() {
    local action="${1:-backup}"
    
    case "$action" in
        "backup")
            create_backup_dir
            generate_encryption_key
            test_connection
            create_backup
            cleanup_old_backups
            ;;
        "list")
            list_backups
            ;;
        "verify")
            if [ -z "$2" ]; then
                error "Please specify backup file to verify"
                exit 1
            fi
            verify_backup "$2"
            ;;
        "restore")
            if [ -z "$2" ]; then
                error "Please specify backup file to restore"
                exit 1
            fi
            restore_backup "$2"
            ;;
        "test")
            test_connection
            ;;
        *)
            echo "Usage: $0 {backup|list|verify <file>|restore <file>|test}"
            echo ""
            echo "Commands:"
            echo "  backup  - Create a new backup"
            echo "  list    - List available backups"
            echo "  verify  - Verify backup integrity"
            echo "  restore - Restore from backup"
            echo "  test    - Test database connection"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 