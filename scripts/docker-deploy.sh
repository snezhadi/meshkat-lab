#!/bin/bash

# Docker deployment script for MeshkatAI Admin Dashboard

echo "🚀 Starting Docker deployment..."

# Create data directory if it doesn't exist
echo "📁 Creating data directories..."
mkdir -p data/backups

# Set proper permissions
chmod 755 data
chmod 755 data/backups

# Build and start the application
echo "🔨 Building Docker image..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for application to start..."
sleep 10

# Check if the application is running
echo "🔍 Checking application health..."
if curl -f http://localhost:3000/api/auth/session > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Access your application at: http://localhost:3000"
    echo "👤 Login credentials:"
    echo "   - admin / admin123 (full access)"
    echo "   - admin2 / MeshkatLab2025! (limited access)"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
fi

echo "📊 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo "🔄 To restart: docker-compose restart"
