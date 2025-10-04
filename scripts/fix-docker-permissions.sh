#!/bin/bash

# Fix Docker volume permissions for VPS deployment
echo "🔧 Fixing Docker volume permissions..."

# Stop containers first
echo "🛑 Stopping Docker containers..."
docker-compose down

# Create data directory if it doesn't exist
if [ ! -d "./data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p ./data/backups
fi

# Create initial data files if they don't exist
echo "📄 Creating initial data files..."
if [ ! -f "./data/document-templates.json" ]; then
    echo '[]' > ./data/document-templates.json
fi

if [ ! -f "./data/parameters.json" ]; then
    echo '[]' > ./data/parameters.json
fi

if [ ! -f "./data/parameter-config.json" ]; then
    echo '{"groups":[],"subgroups":{},"types":[],"priorities":[],"inputs":[]}' > ./data/parameter-config.json
fi

if [ ! -f "./data/jurisdictions.json" ]; then
    echo '[]' > ./data/jurisdictions.json
fi

# Fix ownership to match container user (nextjs = UID 1001)
echo "🔐 Fixing file ownership to UID 1001 (nextjs user)..."
sudo chown -R 1001:1001 ./data

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 ./data
chmod 644 ./data/*.json

# Verify the fix
echo "✅ Verifying permissions..."
ls -la ./data/

echo ""
echo "🚀 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for containers to start..."
sleep 10

echo ""
echo "🧪 Testing write permissions in container..."
if docker-compose exec app touch /app/data/test-write.txt 2>/dev/null; then
    echo "✅ Container can now write to /app/data"
    docker-compose exec app rm -f /app/data/test-write.txt
else
    echo "❌ Container still cannot write to /app/data"
    echo "📋 Checking container user:"
    docker-compose exec app whoami
    docker-compose exec app id
    echo "📋 Checking data directory in container:"
    docker-compose exec app ls -la /app/data
fi

echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "💡 If still having issues, check logs:"
echo "   docker-compose logs app"
