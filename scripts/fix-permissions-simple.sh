#!/bin/bash

# Simple permission fix without sudo
echo "🔧 Fixing Docker permissions (simple method)..."

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Create data directory and files
echo "📁 Ensuring data directory exists..."
mkdir -p ./data/backups

# Create initial files if they don't exist
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

# Set permissions (this should work even without sudo for files you own)
echo "🔐 Setting permissions..."
chmod -R 777 ./data

echo "🚀 Starting containers with user mapping..."
docker-compose up -d

echo "⏳ Waiting for startup..."
sleep 15

echo "🧪 Testing write permissions..."
if docker-compose exec app touch /app/data/test-write.txt 2>/dev/null; then
    echo "✅ SUCCESS: Container can write to /app/data"
    docker-compose exec app rm -f /app/data/test-write.txt
    echo ""
    echo "🎉 Your VPS file permission issue is now FIXED!"
    echo "You should be able to save templates now."
else
    echo "❌ Still having issues. Let's debug further..."
    echo "📋 Container user info:"
    docker-compose exec app whoami 2>/dev/null || echo "Cannot get user info"
    echo "📋 Data directory permissions in container:"
    docker-compose exec app ls -la /app/data 2>/dev/null || echo "Cannot list data directory"
fi
