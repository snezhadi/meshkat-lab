# GitHub Repository Setup Guide

## 🐙 Setting Up Your MeshkatAI Repository on GitHub

This guide will help you create and push your MeshkatAI Admin Dashboard to GitHub.

## 🚀 Quick Setup (Automated)

### Option 1: Using GitHub CLI (Recommended)

```bash
# Run the automated setup script
./scripts/setup-github.sh
```

This script will:

- Initialize Git repository
- Create .gitignore and README.md
- Commit all files
- Create GitHub repository
- Push to GitHub

### Option 2: Manual Setup

Follow the steps below if you prefer manual setup or if the automated script doesn't work.

## 📋 Manual Setup Steps

### Step 1: Initialize Git Repository

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: MeshkatAI Admin Dashboard

- Multi-user authentication system
- Document template management
- Parameter configuration
- Docker deployment setup
- Cloud VPS deployment scripts
- Permission-based access control"
```

### Step 2: Create GitHub Repository

1. **Go to GitHub**: Visit https://github.com/new
2. **Repository Name**: `meshkat-lab`
3. **Description**: `MeshkatAI Admin Dashboard - Document template and parameter management system`
4. **Visibility**: Choose Public or Private
5. **Don't initialize** with README, .gitignore, or license (we already have these)
6. **Click "Create repository"**

### Step 3: Connect and Push

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/meshkat-lab.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## 🔧 Prerequisites

### Install Git (if not already installed)

**macOS:**

```bash
# Using Homebrew
brew install git

# Or download from: https://git-scm.com/downloads
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install git
```

**Windows:**
Download from: https://git-scm.com/downloads

### Install GitHub CLI (Optional but Recommended)

**macOS:**

```bash
brew install gh
```

**Ubuntu/Debian:**

```bash
sudo apt install gh
```

**Windows:**
Download from: https://cli.github.com/

## 📁 What Gets Pushed to GitHub

### Included Files:

- ✅ All source code (`app/`, `components/`, `lib/`, etc.)
- ✅ Configuration files (`package.json`, `next.config.ts`, etc.)
- ✅ Docker setup (`Dockerfile`, `docker-compose.yml`)
- ✅ Deployment scripts (`scripts/` directory)
- ✅ Documentation (`README.md`, `CLOUD-DEPLOYMENT.md`)
- ✅ Git configuration (`.gitignore`)

### Excluded Files:

- ❌ `node_modules/` (dependencies)
- ❌ `.next/` (build output)
- ❌ `.env*` (environment variables)
- ❌ `data/` (JSON data files - for security)
- ❌ Log files and temporary files

## 🔒 Security Considerations

### Data Files

The `data/` directory containing your JSON files is **excluded** from Git for security reasons. This means:

- ✅ **Your data stays private** on your local machine
- ✅ **No sensitive information** in the repository
- ✅ **You control data access** completely

### Environment Variables

All `.env*` files are excluded to prevent accidental exposure of:

- API keys
- Database credentials
- Secret keys

## 🌐 After Pushing to GitHub

### Your Repository Will Be Available At:

```
https://github.com/YOUR_USERNAME/meshkat-lab
```

### You Can Then:

1. **Deploy from GitHub**: Use the repository URL in deployment scripts
2. **Collaborate**: Share the repository with team members
3. **Version Control**: Track changes and manage releases
4. **CI/CD**: Set up automated deployments

## 🚀 Deployment from GitHub

Once your code is on GitHub, you can deploy it to any VPS:

```bash
# On your VPS
git clone https://github.com/YOUR_USERNAME/meshkat-lab.git
cd meshkat-lab
./scripts/quick-deploy.sh
```

## 📊 Repository Structure

Your GitHub repository will have this structure:

```
meshkat-lab/
├── .github/               # GitHub workflows (if any)
├── app/                   # Next.js application
├── components/            # React components
├── data/                  # Data files (excluded from Git)
├── lib/                   # Utility functions
├── hooks/                 # Custom hooks
├── scripts/               # Deployment scripts
├── public/                # Static assets
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── package.json           # Dependencies
├── next.config.ts         # Next.js configuration
├── README.md              # Project documentation
├── CLOUD-DEPLOYMENT.md    # Deployment guide
└── GITHUB-SETUP.md        # This file
```

## 🔄 Updating the Repository

After making changes:

```bash
# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

## 🆘 Troubleshooting

### Common Issues:

1. **"Repository already exists"**

   ```bash
   # Remove existing remote
   git remote remove origin
   # Then add your GitHub repository
   git remote add origin https://github.com/YOUR_USERNAME/meshkat-lab.git
   ```

2. **"Authentication failed"**

   ```bash
   # Use GitHub CLI to authenticate
   gh auth login
   # Or use personal access token
   git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/meshkat-lab.git
   ```

3. **"Permission denied"**
   - Make sure you have write access to the repository
   - Check if you're using the correct GitHub username
   - Verify your authentication credentials

### Getting Help:

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Help**: https://docs.github.com/
- **GitHub CLI**: https://cli.github.com/manual/

## ✅ Verification

After setup, verify everything works:

1. **Check Repository**: Visit https://github.com/YOUR_USERNAME/meshkat-lab
2. **Check Files**: Ensure all files are present
3. **Test Clone**: Try cloning the repository to a new location
4. **Test Deployment**: Use the repository URL in deployment scripts

Your MeshkatAI Admin Dashboard is now ready for GitHub! 🎉
