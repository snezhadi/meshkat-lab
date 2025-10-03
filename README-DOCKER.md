# Docker Deployment Guide

## 🐳 Docker Setup for MeshkatAI Admin Dashboard

This guide explains how to deploy the MeshkatAI Admin Dashboard using Docker.

## 📁 Data Persistence

**Important**: The JSON data files are persisted using Docker volumes:

- **Local Data Directory**: `./data/` is mounted to `/app/data` in the container
- **Backups Directory**: `./data/backups/` is mounted to `/app/data/backups` in the container
- **Data Files**: All JSON files (`parameters.json`, `document-templates.json`, etc.) are preserved between container restarts

## 🚀 Quick Start

### Option 1: Using the deployment script (Recommended)

```bash
# Make the script executable and run it
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh
```

### Option 2: Manual deployment

```bash
# 1. Create data directories
mkdir -p data/backups

# 2. Build and start the application
docker-compose up -d --build

# 3. Check if it's running
curl http://localhost:3000/api/auth/session
```

## 🔧 Configuration

### Environment Variables

The application uses the following environment variables:

- `NODE_ENV=production`
- `PORT=3000`

### Data Directory Structure

```
data/
├── parameters.json
├── parameter-config.json
├── document-templates.json
├── jurisdictions.json
└── backups/
    ├── parameters_backup_YYYY-MM-DD.json
    ├── templates_backup_YYYY-MM-DD.json
    └── ...
```

## 🌐 Access

- **Application**: http://localhost:3000
- **Login Credentials**:
  - `admin` / `admin123` (full access including export)
  - `admin2` / `MeshkatLab2025!` (limited access, no export)

## 🛠️ Management Commands

```bash
# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Access container shell
docker-compose exec app sh
```

## 🔒 Production Deployment

For production deployment with Nginx reverse proxy:

```bash
# Start with Nginx
docker-compose --profile production up -d
```

This will start both the application and Nginx on ports 80 and 443.

## 📊 Monitoring

The application includes health checks that monitor:

- API endpoint availability
- Application responsiveness
- Container health status

## 🔄 Data Backup

The application automatically creates backups in the `data/backups/` directory. These are preserved in the Docker volume.

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `docker-compose.yml`
2. **Permission issues**: Ensure the `data` directory has proper permissions
3. **Build failures**: Check Docker logs with `docker-compose logs`

### Reset Everything

```bash
# Stop and remove everything
docker-compose down -v
docker system prune -f

# Rebuild from scratch
docker-compose up -d --build
```

## 📝 Notes

- The application uses Next.js standalone output for optimal Docker performance
- Data persistence is handled through Docker volumes
- The container runs as a non-root user for security
- Health checks ensure the application is running properly
