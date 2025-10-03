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
