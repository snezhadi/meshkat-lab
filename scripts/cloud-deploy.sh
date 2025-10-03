#!/bin/bash

# Cloud VPS Deployment Script for MeshkatAI Admin Dashboard
# This script helps deploy the application to a cloud VPS

set -e

echo "🚀 MeshkatAI Cloud VPS Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running on VPS
check_vps() {
    print_step "Checking VPS environment..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Run: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Run: sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
        echo "Then: sudo chmod +x /usr/local/bin/docker-compose"
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed ✓"
}

# Setup firewall
setup_firewall() {
    print_step "Setting up firewall..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        print_status "Configuring UFW firewall..."
        sudo ufw allow 22/tcp    # SSH
        sudo ufw allow 80/tcp    # HTTP
        sudo ufw allow 443/tcp   # HTTPS
        sudo ufw allow 3000/tcp  # App port (if not using nginx)
        sudo ufw --force enable
        print_status "Firewall configured ✓"
    else
        print_warning "UFW not available. Please configure your firewall manually."
        print_warning "Allow ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (App)"
    fi
}

# Create application directory
setup_app_directory() {
    print_step "Setting up application directory..."
    
    APP_DIR="/opt/meshkat-admin"
    
    if [ -d "$APP_DIR" ]; then
        print_warning "Application directory already exists. Backing up..."
        sudo mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    
    print_status "Application directory created: $APP_DIR ✓"
    echo "$APP_DIR"
}

# Copy application files
copy_app_files() {
    print_step "Copying application files..."
    
    APP_DIR="$1"
    
    # Copy all necessary files
    cp -r . "$APP_DIR/"
    cd "$APP_DIR"
    
    # Remove unnecessary files
    rm -rf .next node_modules .git
    
    print_status "Application files copied ✓"
}

# Setup data persistence
setup_data_persistence() {
    print_step "Setting up data persistence..."
    
    APP_DIR="$1"
    
    # Create data directories
    mkdir -p "$APP_DIR/data/backups"
    
    # Set proper permissions
    chmod 755 "$APP_DIR/data"
    chmod 755 "$APP_DIR/data/backups"
    
    # Create initial data files if they don't exist
    if [ ! -f "$APP_DIR/data/parameters.json" ]; then
        echo '[]' > "$APP_DIR/data/parameters.json"
    fi
    
    if [ ! -f "$APP_DIR/data/document-templates.json" ]; then
        echo '[]' > "$APP_DIR/data/document-templates.json"
    fi
    
    if [ ! -f "$APP_DIR/data/jurisdictions.json" ]; then
        echo '[]' > "$APP_DIR/data/jurisdictions.json"
    fi
    
    if [ ! -f "$APP_DIR/data/parameter-config.json" ]; then
        echo '{"groups":[],"subgroups":{},"types":[],"priorities":[],"inputs":[]}' > "$APP_DIR/data/parameter-config.json"
    fi
    
    print_status "Data persistence setup ✓"
}

# Build and start application
deploy_application() {
    print_step "Building and starting application..."
    
    APP_DIR="$1"
    cd "$APP_DIR"
    
    # Build the Docker image
    print_status "Building Docker image..."
    docker-compose build
    
    # Start the application
    print_status "Starting application..."
    docker-compose up -d
    
    print_status "Application deployed ✓"
}

# Setup systemd service
setup_systemd_service() {
    print_step "Setting up systemd service..."
    
    APP_DIR="$1"
    
    # Create systemd service file
    sudo tee /etc/systemd/system/meshkat-admin.service > /dev/null <<EOF
[Unit]
Description=MeshkatAI Admin Dashboard
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable meshkat-admin.service
    
    print_status "Systemd service created ✓"
}

# Setup SSL with Let's Encrypt (optional)
setup_ssl() {
    print_step "Setting up SSL with Let's Encrypt (optional)..."
    
    read -p "Do you want to setup SSL with Let's Encrypt? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Installing Certbot..."
        
        # Install certbot
        if command -v apt &> /dev/null; then
            sudo apt update
            sudo apt install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot python3-certbot-nginx
        fi
        
        print_status "SSL setup instructions:"
        echo "1. Update nginx.conf with your domain name"
        echo "2. Run: sudo certbot --nginx -d yourdomain.com"
        echo "3. Restart the application: docker-compose restart"
    fi
}

# Health check
health_check() {
    print_step "Performing health check..."
    
    # Wait for application to start
    print_status "Waiting for application to start..."
    sleep 30
    
    # Check if application is responding
    if curl -f http://localhost:3000/api/auth/session > /dev/null 2>&1; then
        print_status "✅ Application is running successfully!"
        print_status "🌐 Access your application at: http://$(curl -s ifconfig.me):3000"
        print_status "👤 Login credentials:"
        print_status "   - admin / admin123 (full access)"
        print_status "   - admin2 / MeshkatLab2025! (limited access)"
    else
        print_error "❌ Application failed to start. Check logs with: docker-compose logs"
        return 1
    fi
}

# Main deployment function
main() {
    print_status "Starting MeshkatAI Admin Dashboard deployment..."
    
    # Check VPS environment
    check_vps
    
    # Setup firewall
    setup_firewall
    
    # Setup application directory
    APP_DIR=$(setup_app_directory)
    
    # Copy application files
    copy_app_files "$APP_DIR"
    
    # Setup data persistence
    setup_data_persistence "$APP_DIR"
    
    # Deploy application
    deploy_application "$APP_DIR"
    
    # Setup systemd service
    setup_systemd_service "$APP_DIR"
    
    # Setup SSL (optional)
    setup_ssl
    
    # Health check
    health_check
    
    print_status "🎉 Deployment completed successfully!"
    print_status "📊 Management commands:"
    print_status "   - View logs: cd $APP_DIR && docker-compose logs -f"
    print_status "   - Restart: cd $APP_DIR && docker-compose restart"
    print_status "   - Stop: cd $APP_DIR && docker-compose down"
    print_status "   - Update: cd $APP_DIR && git pull && docker-compose up -d --build"
}

# Run main function
main "$@"
