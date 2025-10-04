#!/bin/bash

# Fix VPS file permissions for Docker deployment
echo "🔧 Fixing VPS file permissions..."

# Create data directory if it doesn't exist
if [ ! -d "./data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p ./data/backups
fi

# Set proper permissions for data directory
echo "🔐 Setting proper permissions..."
chmod -R 755 ./data

# Create initial data files if they don't exist
if [ ! -f "./data/document-templates.json" ]; then
    echo "📄 Creating initial document-templates.json..."
    echo '[]' > ./data/document-templates.json
fi

if [ ! -f "./data/parameters.json" ]; then
    echo "📄 Creating initial parameters.json..."
    echo '[]' > ./data/parameters.json
fi

if [ ! -f "./data/parameter-config.json" ]; then
    echo "📄 Creating initial parameter-config.json..."
    echo '{"groups":[],"subgroups":{},"types":[],"priorities":[],"inputs":[]}' > ./data/parameter-config.json
fi

if [ ! -f "./data/jurisdictions.json" ]; then
    echo "📄 Creating initial jurisdictions.json..."
    echo '[]' > ./data/jurisdictions.json
fi

# Set permissions for all data files
chmod 644 ./data/*.json
chmod 755 ./data/backups

echo "✅ VPS permissions fixed!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your Docker containers:"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "2. Check if the app can write to data directory:"
echo "   docker-compose exec app ls -la /app/data"
echo ""
echo "3. If still having issues, check container logs:"
echo "   docker-compose logs app"
