#!/bin/bash

# VPS Initial Setup Script
# Run this script on your VPS before deploying the application

set -e

echo "🛠️  VPS Initial Setup for MeshkatAI Admin Dashboard"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Update system
update_system() {
    print_step "Updating system packages..."
    
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt upgrade -y
        print_status "System updated ✓"
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        print_status "System updated ✓"
    else
        print_warning "Unknown package manager. Please update manually."
    fi
}

# Install Docker
install_docker() {
    print_step "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        print_status "Docker is already installed ✓"
        return
    fi
    
    # Install Docker using official script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    print_status "Docker installed ✓"
    print_warning "Please log out and log back in for Docker group changes to take effect."
}

# Install Docker Compose
install_docker_compose() {
    print_step "Installing Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        print_status "Docker Compose is already installed ✓"
        return
    fi
    
    # Get latest version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # Download and install
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_status "Docker Compose installed ✓"
}

# Install additional tools
install_tools() {
    print_step "Installing additional tools..."
    
    if command -v apt &> /dev/null; then
        sudo apt install -y curl wget git htop nano ufw
    elif command -v yum &> /dev/null; then
        sudo yum install -y curl wget git htop nano firewalld
    fi
    
    print_status "Additional tools installed ✓"
}

# Setup firewall
setup_firewall() {
    print_step "Setting up firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 22/tcp    # SSH
        sudo ufw allow 80/tcp    # HTTP
        sudo ufw allow 443/tcp   # HTTPS
        sudo ufw allow 3000/tcp # App port
        sudo ufw --force enable
        print_status "UFW firewall configured ✓"
    elif command -v firewall-cmd &> /dev/null; then
        sudo systemctl start firewalld
        sudo systemctl enable firewalld
        sudo firewall-cmd --permanent --add-port=22/tcp
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --reload
        print_status "Firewalld configured ✓"
    else
        print_warning "No firewall manager found. Please configure manually."
    fi
}

# Setup swap (optional)
setup_swap() {
    print_step "Setting up swap file (optional)..."
    
    read -p "Do you want to setup a 2GB swap file? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        print_status "Swap file created ✓"
    fi
}

# Create application user (optional)
create_app_user() {
    print_step "Creating application user (optional)..."
    
    read -p "Do you want to create a dedicated 'meshkat' user? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo useradd -m -s /bin/bash meshkat
        sudo usermod -aG docker meshkat
        print_status "Application user 'meshkat' created ✓"
        print_warning "Switch to meshkat user: su - meshkat"
    fi
}

# Main setup function
main() {
    print_status "Starting VPS setup..."
    
    # Update system
    update_system
    
    # Install Docker
    install_docker
    
    # Install Docker Compose
    install_docker_compose
    
    # Install additional tools
    install_tools
    
    # Setup firewall
    setup_firewall
    
    # Setup swap
    setup_swap
    
    # Create application user
    create_app_user
    
    print_status "🎉 VPS setup completed!"
    print_status "Next steps:"
    print_status "1. Log out and log back in (for Docker group changes)"
    print_status "2. Upload your application files to the VPS"
    print_status "3. Run the cloud deployment script"
    print_status "4. Access your application at http://YOUR_VPS_IP:3000"
}

# Run main function
main "$@"
