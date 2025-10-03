# Cloud VPS Deployment Guide

## 🚀 Deploy MeshkatAI Admin Dashboard to Cloud VPS

This guide will help you deploy your Docker containerized MeshkatAI Admin Dashboard to any cloud VPS provider (DigitalOcean, Linode, AWS EC2, Google Cloud, etc.).

## 📋 Prerequisites

- A cloud VPS with Ubuntu 20.04+ or CentOS 7+
- Root or sudo access
- At least 1GB RAM and 10GB storage
- Domain name (optional, for SSL)

## 🛠️ Step 1: VPS Initial Setup

### Option A: Automated Setup (Recommended)

```bash
# Download and run the VPS setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/meshkat-lab/main/scripts/vps-setup.sh -o vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh
```

### Option B: Manual Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y curl wget git htop nano ufw

# Setup firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # App port
sudo ufw --force enable

# Log out and log back in for Docker group changes
```

## 📦 Step 2: Upload Application Files

### Option A: Using Git (Recommended)

```bash
# Clone your repository
git clone https://github.com/your-username/meshkat-lab.git
cd meshkat-lab
```

### Option B: Using SCP/SFTP

```bash
# From your local machine
scp -r /path/to/meshkat-lab user@your-vps-ip:/home/user/
```

### Option C: Using rsync

```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' /path/to/meshkat-lab/ user@your-vps-ip:/home/user/meshkat-lab/
```

## 🚀 Step 3: Deploy Application

### Option A: Automated Deployment

```bash
# Run the cloud deployment script
./scripts/cloud-deploy.sh
```

### Option B: Manual Deployment

```bash
# Create application directory
sudo mkdir -p /opt/meshkat-admin
sudo chown $USER:$USER /opt/meshkat-admin

# Copy files
cp -r . /opt/meshkat-admin/
cd /opt/meshkat-admin

# Create data directories
mkdir -p data/backups
chmod 755 data data/backups

# Create initial data files
echo '[]' > data/parameters.json
echo '[]' > data/document-templates.json
echo '[]' > data/jurisdictions.json
echo '{"groups":[],"subgroups":{},"types":[],"priorities":[],"inputs":[]}' > data/parameter-config.json

# Build and start
docker-compose build
docker-compose up -d

# Setup systemd service
sudo tee /etc/systemd/system/meshkat-admin.service > /dev/null <<EOF
[Unit]
Description=MeshkatAI Admin Dashboard
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/meshkat-admin
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable meshkat-admin.service
```

## 🔒 Step 4: Setup SSL (Optional)

### Using Let's Encrypt with Nginx

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Update nginx.conf with your domain
sudo nano nginx.conf

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Restart application
docker-compose restart
```

## 🌐 Step 5: Access Your Application

- **Application URL**: `http://YOUR_VPS_IP:3000`
- **With Domain**: `https://yourdomain.com` (if SSL configured)

### Login Credentials:

- **admin** / **admin123** (full access including export)
- **admin2** / **MeshkatLab2025!** (limited access, no export)

## 📊 Management Commands

```bash
# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Stop application
docker-compose down

# Update application
git pull
docker-compose up -d --build

# Check status
docker-compose ps

# Access container shell
docker-compose exec app sh
```

## 🔧 Troubleshooting

### Common Issues

1. **Port already in use**:

   ```bash
   # Check what's using port 3000
   sudo netstat -tlnp | grep :3000
   # Kill the process or change port in docker-compose.yml
   ```

2. **Permission denied**:

   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER /opt/meshkat-admin
   chmod 755 /opt/meshkat-admin/data
   ```

3. **Docker not found**:

   ```bash
   # Log out and log back in
   # Or run: newgrp docker
   ```

4. **Application not starting**:
   ```bash
   # Check logs
   docker-compose logs
   # Check if data directory exists
   ls -la data/
   ```

### Health Checks

```bash
# Check if application is running
curl http://localhost:3000/api/auth/session

# Check Docker containers
docker ps

# Check system resources
htop
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
cd /opt/meshkat-admin
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Backup Data

```bash
# Backup data directory
tar -czf meshkat-backup-$(date +%Y%m%d).tar.gz data/

# Restore from backup
tar -xzf meshkat-backup-YYYYMMDD.tar.gz
```

### Monitoring

```bash
# Check application status
sudo systemctl status meshkat-admin

# View application logs
journalctl -u meshkat-admin -f

# Monitor Docker resources
docker stats
```

## 🛡️ Security Considerations

1. **Firewall**: Only open necessary ports (22, 80, 443, 3000)
2. **SSH**: Use key-based authentication, disable password login
3. **Updates**: Keep system and Docker updated
4. **SSL**: Use HTTPS in production
5. **Backups**: Regular data backups
6. **Monitoring**: Set up log monitoring and alerts

## 📈 Scaling

For high-traffic deployments:

1. **Load Balancer**: Use nginx or HAProxy
2. **Database**: Consider external database for data
3. **CDN**: Use CloudFlare or similar for static assets
4. **Monitoring**: Implement proper monitoring and alerting

## 🆘 Support

If you encounter issues:

1. Check application logs: `docker-compose logs -f`
2. Check system logs: `journalctl -u meshkat-admin`
3. Verify firewall settings: `sudo ufw status`
4. Check Docker status: `docker ps`
5. Test connectivity: `curl http://localhost:3000/api/auth/session`

## 📝 Notes

- The application uses Docker volumes for data persistence
- All JSON data files are stored in `/opt/meshkat-admin/data/`
- The application runs as a non-root user for security
- Health checks ensure the application is running properly
- Systemd service ensures the application starts on boot
