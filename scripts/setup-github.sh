#!/bin/bash

# GitHub Repository Setup Script for MeshkatAI Admin Dashboard
# This script helps you create and push your project to GitHub

set -e

echo "🐙 GitHub Repository Setup for MeshkatAI Admin Dashboard"
echo "====================================================="

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

# Check if git is installed
check_git() {
    print_step "Checking Git installation..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        echo "Install Git: https://git-scm.com/downloads"
        exit 1
    fi
    
    print_status "Git is installed ✓"
}

# Check if GitHub CLI is installed
check_gh_cli() {
    print_step "Checking GitHub CLI..."
    
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI is not installed."
        print_status "You can install it with:"
        echo "  - macOS: brew install gh"
        echo "  - Ubuntu: sudo apt install gh"
        echo "  - Or download from: https://cli.github.com/"
        return 1
    fi
    
    print_status "GitHub CLI is installed ✓"
    return 0
}

# Initialize git repository
init_git() {
    print_step "Initializing Git repository..."
    
    if [ -d ".git" ]; then
        print_warning "Git repository already exists."
        return 0
    fi
    
    git init
    print_status "Git repository initialized ✓"
}

# Create .gitignore
create_gitignore() {
    print_step "Creating .gitignore file..."
    
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Next.js
.next/
out/

# Production
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker
.dockerignore

# Data files (optional - remove if you want to track data)
# data/
# !data/.gitkeep
EOF

    print_status ".gitignore created ✓"
}

# Create README
create_readme() {
    print_step "Creating README.md..."
    
    cat > README.md << 'EOF'
# MeshkatAI Admin Dashboard

A comprehensive admin dashboard for managing document templates, parameters, and legal document configurations.

## 🚀 Features

- **Multi-User Authentication**: Two admin users with different permission levels
- **Document Management**: Full CRUD operations for document templates
- **Parameter Management**: Dynamic parameter configuration with conditions
- **Jurisdiction Support**: Multi-jurisdiction legal document handling
- **Export Functionality**: Export data with permission-based access control
- **Responsive Design**: Modern UI with Tailwind CSS

## 👥 User Accounts

### Admin (Full Access)
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: Create, Edit, Delete, Export

### Admin2 (Limited Access)
- **Username**: `admin2`
- **Password**: `MeshkatLab2025!`
- **Permissions**: Create, Edit, Delete (No Export)

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/meshkat-lab.git
cd meshkat-lab

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The application will be available at `http://localhost:3000`

## 🐳 Docker Deployment

### Local Docker
```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Access the application
open http://localhost:3000
```

### Cloud VPS Deployment
```bash
# Quick deployment
./scripts/quick-deploy.sh

# Or step-by-step deployment
./scripts/vps-setup.sh
./scripts/cloud-deploy.sh
```

## 📁 Project Structure

```
meshkat-lab/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages
│   ├── api/               # API routes
│   └── login/             # Authentication pages
├── components/            # React components
│   ├── admin/             # Admin-specific components
│   └── ui/                # Reusable UI components
├── data/                  # JSON data files
├── lib/                   # Utility functions
├── hooks/                 # Custom React hooks
├── scripts/               # Deployment scripts
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

### Data Files
- `data/parameters.json`: Document parameters
- `data/document-templates.json`: Document templates
- `data/jurisdictions.json`: Legal jurisdictions
- `data/parameter-config.json`: Parameter configuration

## 🚀 Deployment Options

### 1. Docker (Recommended)
- **Local**: `docker-compose up -d`
- **Cloud**: Use deployment scripts in `scripts/` directory

### 2. Vercel
- Connect your GitHub repository
- Deploy automatically on push

### 3. Manual Server
- Build: `pnpm run build`
- Start: `pnpm start`

## 📊 Management Commands

```bash
# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Update application
git pull && docker-compose up -d --build

# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

## 🔒 Security

- **Authentication**: bcrypt password hashing
- **Session Management**: Secure HTTP-only cookies
- **Permission System**: Role-based access control
- **Data Validation**: Input sanitization and validation

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check the documentation in `CLOUD-DEPLOYMENT.md`
- Review deployment scripts in `scripts/` directory
- Check application logs: `docker-compose logs -f`
EOF

    print_status "README.md created ✓"
}

# Add and commit files
commit_files() {
    print_step "Adding and committing files..."
    
    git add .
    git commit -m "Initial commit: MeshkatAI Admin Dashboard

- Multi-user authentication system
- Document template management
- Parameter configuration
- Docker deployment setup
- Cloud VPS deployment scripts
- Permission-based access control"
    
    print_status "Files committed ✓"
}

# Create GitHub repository
create_github_repo() {
    print_step "Creating GitHub repository..."
    
    if check_gh_cli; then
        # Check if user is logged in
        if ! gh auth status &> /dev/null; then
            print_warning "Please log in to GitHub CLI first:"
            echo "Run: gh auth login"
            return 1
        fi
        
        # Create repository
        gh repo create meshkat-lab --public --description "MeshkatAI Admin Dashboard - Document template and parameter management system" --source=. --remote=origin --push
        
        print_status "GitHub repository created ✓"
        return 0
    else
        print_warning "GitHub CLI not available. Manual setup required."
        return 1
    fi
}

# Manual GitHub setup instructions
manual_github_setup() {
    print_step "Manual GitHub Repository Setup"
    
    print_status "Follow these steps to create your GitHub repository:"
    echo ""
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: meshkat-lab"
    echo "3. Description: MeshkatAI Admin Dashboard - Document template and parameter management system"
    echo "4. Make it Public or Private (your choice)"
    echo "5. Don't initialize with README (we already have one)"
    echo "6. Click 'Create repository'"
    echo ""
    echo "Then run these commands:"
    echo ""
    echo "git remote add origin https://github.com/YOUR_USERNAME/meshkat-lab.git"
    echo "git branch -M main"
    echo "git push -u origin main"
    echo ""
    print_status "Replace YOUR_USERNAME with your actual GitHub username"
}

# Main setup function
main() {
    print_status "Setting up GitHub repository for MeshkatAI Admin Dashboard..."
    
    # Check prerequisites
    check_git
    
    # Initialize repository
    init_git
    
    # Create necessary files
    create_gitignore
    create_readme
    
    # Commit files
    commit_files
    
    # Try to create GitHub repository
    if create_github_repo; then
        print_status "🎉 Repository created and pushed to GitHub!"
        print_status "🌐 View your repository at: https://github.com/$(gh api user --jq .login)/meshkat-lab"
    else
        manual_github_setup
    fi
    
    print_status "✅ GitHub setup completed!"
}

# Run main function
main "$@"
