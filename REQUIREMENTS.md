# Sync-Talk Dependencies Requirements

This document lists all the necessary dependencies for the Sync-Talk real-time chat application.

## System Requirements

### Prerequisites
- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **MongoDB**: Version 5.0 or higher (or MongoDB Atlas account)
- **Git**: For version control

### Recommended System Specifications
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: At least 2GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Ubuntu 18.04+

## Backend Dependencies

### Production Dependencies
```json
{
  "express": "^4.18.2",
  "mongoose": "^7.5.0",
  "socket.io": "^4.7.2",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.10.0",
  "morgan": "^1.10.0",
  "express-validator": "^7.0.1"
}
```

### Development Dependencies
```json
{
  "nodemon": "^3.0.1",
  "jest": "^29.6.2",
  "supertest": "^6.3.3"
}
```

## Frontend Dependencies

### Production Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.15.0",
  "socket.io-client": "^4.7.2",
  "axios": "^1.5.0",
  "react-hot-toast": "^2.4.1"
}
```

### Development Dependencies
```json
{
  "react-scripts": "5.0.1",
  "@testing-library/jest-dom": "^5.17.0",
  "@testing-library/react": "^13.4.0",
  "@testing-library/user-event": "^13.5.0"
}
```

## Installation Commands

### Automatic Installation (Recommended)
Run the setup script from the project root:
```powershell
# Windows PowerShell
.\setup.ps1

# Or manually:
cd backend
npm install
cd ../frontend
npm install
```

### Manual Installation

#### Backend Setup
```bash
cd backend
npm install express@^4.18.2
npm install mongoose@^7.5.0
npm install socket.io@^4.7.2
npm install jsonwebtoken@^9.0.2
npm install bcryptjs@^2.4.3
npm install cors@^2.8.5
npm install dotenv@^16.3.1
npm install helmet@^7.0.0
npm install express-rate-limit@^6.10.0
npm install morgan@^1.10.0
npm install express-validator@^7.0.1

# Development dependencies
npm install --save-dev nodemon@^3.0.1
npm install --save-dev jest@^29.6.2
npm install --save-dev supertest@^6.3.3
```

#### Frontend Setup
```bash
cd frontend
npm install react@^18.2.0
npm install react-dom@^18.2.0
npm install react-router-dom@^6.15.0
npm install socket.io-client@^4.7.2
npm install axios@^1.5.0
npm install react-hot-toast@^2.4.1

# Development dependencies
npm install --save-dev react-scripts@5.0.1
npm install --save-dev @testing-library/jest-dom@^5.17.0
npm install --save-dev @testing-library/react@^13.4.0
npm install --save-dev @testing-library/user-event@^13.5.0
```

## Database Requirements

### MongoDB Options

#### Option 1: Local MongoDB Installation
- Download from: https://www.mongodb.com/try/download/community
- Install and start MongoDB service
- Default connection: `mongodb://localhost:27017/synctalk`

#### Option 2: MongoDB Atlas (Recommended for production)
- Create account at: https://www.mongodb.com/atlas
- Create a cluster
- Get connection string
- Update `MONGODB_URI` in backend/.env

## Environment Variables

### Backend Environment (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/synctalk

# JWT Secret (Generate a secure random string)
JWT_SECRET=your_super_secure_jwt_secret_key_here

# CORS Origin
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment (.env)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Package Scripts

### Backend Scripts
```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

### Frontend Scripts
```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

## Version Compatibility

### Node.js Versions
- **Minimum**: Node.js 16.x
- **Recommended**: Node.js 18.x or 20.x LTS
- **Maximum Tested**: Node.js 20.x

### Browser Support
- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

## Security Dependencies

### Additional Security Packages (Optional but Recommended)
```bash
# Backend security enhancements
npm install express-mongo-sanitize
npm install xss-clean
npm install hpp

# Rate limiting and DDoS protection
npm install express-slow-down
```

## Performance Dependencies (Optional)

### Caching and Performance
```bash
# Redis for caching (requires Redis server)
npm install redis

# Compression middleware
npm install compression

# Request logging
npm install winston
```

## Development Tools (Optional)

### Code Quality and Formatting
```bash
# ESLint and Prettier
npm install --save-dev eslint prettier
npm install --save-dev eslint-config-prettier
npm install --save-dev eslint-plugin-react

# Git hooks
npm install --save-dev husky lint-staged
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**:
   - Backend default: 5000
   - Frontend default: 3000
   - Change ports in .env files if needed

2. **MongoDB Connection**:
   - Ensure MongoDB service is running
   - Check connection string in .env
   - Verify network connectivity for Atlas

3. **CORS Issues**:
   - Update CORS_ORIGIN in backend .env
   - Ensure frontend URL matches

4. **Node Version Conflicts**:
   - Use Node Version Manager (nvm)
   - Install compatible Node.js version

### Installation Verification

After installation, verify everything works:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Test backend
cd backend
npm run dev

# Test frontend (in new terminal)
cd frontend
npm start
```

## Quick Start Checklist

- [ ] Install Node.js 16+ and npm
- [ ] Install MongoDB or setup Atlas account
- [ ] Clone the repository
- [ ] Run `.\setup.ps1` or install dependencies manually
- [ ] Configure environment variables
- [ ] Start MongoDB service (if local)
- [ ] Run backend server: `npm run dev`
- [ ] Run frontend server: `npm start`
- [ ] Access application at http://localhost:3000

---

**Note**: This requirements file is automatically generated based on the project's package.json files. Always refer to the actual package.json files for the most up-to-date dependency versions.
