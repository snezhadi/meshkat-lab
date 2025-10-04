#!/bin/bash

# Debug VPS data directory issues
echo "🔍 Debugging VPS data directory..."

echo ""
echo "📁 Host system data directory:"
echo "Location: $(pwd)/data"
if [ -d "./data" ]; then
    echo "✅ Data directory exists"
    ls -la ./data/
else
    echo "❌ Data directory does not exist"
fi

echo ""
echo "🐳 Docker container data directory:"
if command -v docker-compose &> /dev/null; then
    echo "Checking container data directory..."
    docker-compose exec app ls -la /app/data 2>/dev/null || echo "❌ Cannot access container or container not running"
    
    echo ""
    echo "Testing write permissions in container:"
    docker-compose exec app touch /app/data/test-write.txt 2>/dev/null && echo "✅ Container can write to /app/data" || echo "❌ Container cannot write to /app/data"
    docker-compose exec app rm -f /app/data/test-write.txt 2>/dev/null
else
    echo "❌ docker-compose not found"
fi

echo ""
echo "🔐 File ownership:"
if [ -d "./data" ]; then
    echo "Data directory owner: $(ls -ld ./data | awk '{print $3":"$4}')"
    echo "Data directory permissions: $(ls -ld ./data | awk '{print $1}')"
fi

echo ""
echo "📊 Container status:"
docker-compose ps 2>/dev/null || echo "❌ Docker compose not running"

echo ""
echo "📝 Recent container logs (last 20 lines):"
docker-compose logs --tail=20 app 2>/dev/null || echo "❌ Cannot get container logs"

echo ""
echo "💡 If you see permission issues, run:"
echo "   chmod +x scripts/fix-vps-permissions.sh"
echo "   ./scripts/fix-vps-permissions.sh"
