#!/bin/bash

# Quick Cloud Deployment Script
# One-command deployment for experienced users

set -e

echo "⚡ Quick Cloud Deployment for MeshkatAI Admin Dashboard"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Consider using a regular user with sudo access."
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Setup firewall
print_status "Setting up firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw --force enable
fi

# Create application directory
APP_DIR="/opt/meshkat-admin"
print_status "Setting up application directory: $APP_DIR"

sudo mkdir -p "$APP_DIR"
sudo chown $USER:$USER "$APP_DIR"

# Copy application files
print_status "Copying application files..."
cp -r . "$APP_DIR/"
cd "$APP_DIR"

# Remove unnecessary files
rm -rf .next node_modules .git

# Setup data persistence
print_status "Setting up data persistence..."
mkdir -p data/backups
chmod 755 data data/backups

# Create initial data files
echo '[]' > data/parameters.json
echo '[]' > data/document-templates.json
echo '[]' > data/jurisdictions.json
echo '{"groups":[],"subgroups":{},"types":[],"priorities":[],"inputs":[]}' > data/parameter-config.json

# Build and start
print_status "Building and starting application..."
docker-compose build
docker-compose up -d

# Setup systemd service
print_status "Setting up systemd service..."
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

sudo systemctl daemon-reload
sudo systemctl enable meshkat-admin.service

# Wait for application to start
print_status "Waiting for application to start..."
sleep 30

# Health check
if curl -f http://localhost:3000/api/auth/session > /dev/null 2>&1; then
    print_status "✅ Application deployed successfully!"
    print_status "🌐 Access your application at: http://$(curl -s ifconfig.me):3000"
    print_status "👤 Login credentials:"
    print_status "   - admin / admin123 (full access)"
    print_status "   - admin2 / MeshkatLab2025! (limited access)"
    print_status "📊 Management: cd $APP_DIR && docker-compose logs -f"
else
    print_warning "❌ Application may not be running. Check logs: cd $APP_DIR && docker-compose logs"
fi
