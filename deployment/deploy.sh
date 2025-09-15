#!/bin/bash

# Woofadaar Production Deployment Script
# Week 15-16: Launch-Ready Deployment

set -e  # Exit on any error

# Configuration
APP_NAME="woofadaar"
DEPLOY_ENV=${1:-production}
BUILD_TAG=${2:-latest}
BACKUP_DIR="/var/backups/woofadaar"
LOG_FILE="/var/log/woofadaar-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# Check if running as correct user
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
    log "Running as user: $(whoami)"
}

# Verify environment
check_environment() {
    log "Checking deployment environment: $DEPLOY_ENV"
    
    # Check required commands
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v node >/dev/null 2>&1 || error "Node.js is not installed"
    command -v npm >/dev/null 2>&1 || error "npm is not installed"
    
    # Check required files
    [[ -f ".env.$DEPLOY_ENV" ]] || error "Environment file .env.$DEPLOY_ENV not found"
    [[ -f "docker-compose.prod.yml" ]] || error "docker-compose.prod.yml not found"
    
    log "Environment check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for $DEPLOY_ENV"
    
    if [[ -f ".env.$DEPLOY_ENV" ]]; then
        source ".env.$DEPLOY_ENV"
        log "Environment variables loaded"
    else
        error "Environment file .env.$DEPLOY_ENV not found"
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check disk space (minimum 2GB free)
    AVAILABLE_SPACE=$(df / | awk 'NR==2{print $4}')
    MIN_SPACE=2097152  # 2GB in KB
    
    if [[ $AVAILABLE_SPACE -lt $MIN_SPACE ]]; then
        error "Insufficient disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${MIN_SPACE}KB"
    fi
    
    # Check memory (minimum 2GB free)
    AVAILABLE_MEM=$(free | awk '/^Mem:/{print $7}')
    MIN_MEM=2097152  # 2GB in KB
    
    if [[ $AVAILABLE_MEM -lt $MIN_MEM ]]; then
        warn "Low memory available. Available: ${AVAILABLE_MEM}KB, Recommended: ${MIN_MEM}KB"
    fi
    
    # Check if all required environment variables are set
    REQUIRED_VARS=(
        "DATABASE_URL"
        "JWT_SECRET"
        "NEXTAUTH_SECRET"
        "RAZORPAY_KEY_ID"
        "RAZORPAY_KEY_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup before deployment..."
    
    # Create backup directory
    mkdir -p $BACKUP_DIR/$(date +%Y%m%d)
    BACKUP_PATH="$BACKUP_DIR/$(date +%Y%m%d)/backup_$(date +%H%M%S)"
    
    # Database backup
    if docker ps | grep -q postgres; then
        log "Creating database backup..."
        docker exec woofadaar-postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_PATH.sql"
        log "Database backup created: $BACKUP_PATH.sql"
    fi
    
    # Application backup
    if [[ -d "/app/uploads" ]]; then
        log "Creating uploads backup..."
        tar -czf "$BACKUP_PATH-uploads.tar.gz" /app/uploads
        log "Uploads backup created: $BACKUP_PATH-uploads.tar.gz"
    fi
    
    # Configuration backup
    tar -czf "$BACKUP_PATH-config.tar.gz" .env.* *.yml *.json 2>/dev/null || true
    
    log "Backup completed: $BACKUP_PATH"
}

# Build application
build_application() {
    log "Building application..."
    
    # Clean previous builds
    rm -rf .next
    rm -rf node_modules/.cache
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production=false
    
    # Run tests
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        log "Running tests..."
        npm run test:ci || error "Tests failed"
    fi
    
    # Build application
    log "Building Next.js application..."
    npm run build || error "Build failed"
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate || error "Prisma client generation failed"
    
    log "Application build completed"
}

# Database migration
run_migrations() {
    log "Running database migrations..."
    
    # Check if database is accessible
    if ! docker exec woofadaar-postgres pg_isready -U $POSTGRES_USER; then
        error "Database is not accessible"
    fi
    
    # Run migrations
    npx prisma migrate deploy || error "Database migration failed"
    
    log "Database migrations completed"
}

# Deploy with Docker Compose
deploy_containers() {
    log "Deploying containers..."
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    # Start services with zero downtime (if supported)
    if docker ps | grep -q woofadaar-app; then
        log "Performing rolling update..."
        docker-compose -f docker-compose.prod.yml up -d --no-deps woofadaar-app
    else
        log "Starting all services..."
        docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "Container deployment completed"
}

# Health check
check_service_health() {
    log "Checking service health..."
    
    # Check application health
    for i in {1..30}; do
        if curl -sf http://localhost:3000/api/health >/dev/null; then
            log "Application is healthy"
            break
        fi
        
        if [[ $i -eq 30 ]]; then
            error "Application health check failed after 30 attempts"
        fi
        
        sleep 2
    done
    
    # Check database connectivity
    if ! docker exec woofadaar-postgres pg_isready -U $POSTGRES_USER >/dev/null; then
        error "Database health check failed"
    fi
    
    # Check Redis connectivity
    if ! docker exec woofadaar-redis redis-cli -a $REDIS_PASSWORD ping >/dev/null; then
        error "Redis health check failed"
    fi
    
    log "All services are healthy"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Warm up cache
    log "Warming up application cache..."
    curl -sf http://localhost:3000/ >/dev/null || warn "Cache warmup failed"
    
    # Clear old Docker images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    # Send deployment notification (placeholder)
    send_notification "success" "Woofadaar deployment completed successfully"
    
    log "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    log "Starting rollback procedure..."
    
    # Get the latest backup
    LATEST_BACKUP=$(find $BACKUP_DIR -name "backup_*.sql" | sort | tail -1)
    
    if [[ -n "$LATEST_BACKUP" ]]; then
        log "Rolling back database to: $LATEST_BACKUP"
        docker exec -i woofadaar-postgres psql -U $POSTGRES_USER $POSTGRES_DB < "$LATEST_BACKUP"
    fi
    
    # Restore previous Docker containers
    log "Restoring previous container version..."
    docker-compose -f docker-compose.prod.yml down
    
    # This would restore from backup or previous tag
    # Implementation depends on your backup strategy
    
    send_notification "error" "Woofadaar deployment rolled back"
    
    error "Rollback completed"
}

# Send notification (webhook/slack/email)
send_notification() {
    local status=$1
    local message=$2
    
    # Example webhook notification (customize as needed)
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"[$status] $message\",\"timestamp\":\"$(date)\"}" \
            2>/dev/null || warn "Failed to send notification"
    fi
    
    log "Notification sent: $message"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove old backups (keep last 7 days)
    find $BACKUP_DIR -type f -mtime +7 -delete 2>/dev/null || true
    
    # Clean Docker system
    docker system prune -f --volumes
    
    log "Cleanup completed"
}

# Main deployment flow
main() {
    log "Starting Woofadaar deployment - Environment: $DEPLOY_ENV, Tag: $BUILD_TAG"
    
    # Trap errors and run rollback
    trap 'error "Deployment failed! Running rollback..."; rollback' ERR
    
    check_user
    check_environment
    load_environment
    pre_deployment_checks
    create_backup
    build_application
    deploy_containers
    run_migrations
    check_service_health
    post_deployment
    cleanup
    
    log "🎉 Woofadaar deployment completed successfully!"
    log "Application is running at: http://localhost:3000"
    log "Admin dashboard: http://localhost:3001 (Grafana)"
    log "Logs: docker-compose -f docker-compose.prod.yml logs -f"
}

# Help function
show_help() {
    echo "Woofadaar Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [tag]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (production|staging) [default: production]"
    echo "  tag           Docker image tag [default: latest]"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy to production with latest tag"
    echo "  $0 production v1.2.3       # Deploy to production with specific tag"
    echo "  $0 staging                  # Deploy to staging"
    echo ""
    echo "Environment files required:"
    echo "  .env.production     # Production environment variables"
    echo "  .env.staging        # Staging environment variables"
    echo ""
    echo "Options:"
    echo "  --help, -h         Show this help message"
    echo "  --rollback         Rollback to previous version"
    echo "  --health-check     Run health check only"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    --health-check)
        check_service_health
        exit 0
        ;;
    "")
        main
        ;;
    *)
        main
        ;;
esac