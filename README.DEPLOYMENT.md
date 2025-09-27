# TSR Planner - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying TSR Planner to production environments.

## Prerequisites

- Node.js 20+ 
- PostgreSQL database (Neon, AWS RDS, or self-hosted)
- Firebase project configured
- Domain name (optional)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp env.production.example .env

# Edit with your production values
nano .env
```

Required environment variables:
```env
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
NODE_ENV=production
PORT=5000
```

### 2. Deploy with Script

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 3. Start Application

```bash
# Using npm
npm start

# Using PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.js --env production

# Using Docker
docker-compose up -d
```

## Deployment Options

### Option 1: Traditional VPS/Server

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 globally
   sudo npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd TeamTrackMinutes
   
   # Install dependencies
   npm ci --only=production
   
   # Configure environment
   cp env.production.example .env
   # Edit .env with your values
   
   # Build and start
   npm run build
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Option 2: Docker Deployment

1. **Build and Run**
   ```bash
   # Build Docker image
   docker build -t tsr-planner .
   
   # Run container
   docker run -d \
     --name tsr-planner \
     -p 5000:5000 \
     --env-file .env \
     tsr-planner
   ```

2. **Docker Compose**
   ```bash
   # Start with Docker Compose
   docker-compose up -d
   
   # With Nginx reverse proxy
   docker-compose --profile production up -d
   ```

### Option 3: Cloud Platforms

#### Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

#### Render
1. Create new Web Service
2. Connect repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Configure environment variables

#### Heroku
1. Create Heroku app
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy with Git

## Database Setup

### Neon (Recommended)
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `DATABASE_URL`
4. Run migrations: `npm run db:push`

### AWS RDS
1. Create PostgreSQL instance
2. Configure security groups
3. Update `DATABASE_URL` with RDS endpoint

## Firebase Configuration

1. Create Firebase project
2. Enable Authentication > Google
3. Add your domain to authorized domains
4. Copy configuration to environment variables

## Security Considerations

### Environment Variables
- Never commit `.env` files
- Use strong, unique passwords
- Rotate secrets regularly

### Database Security
- Use SSL connections (`sslmode=require`)
- Restrict database access by IP
- Regular backups

### Application Security
- Keep dependencies updated
- Use HTTPS in production
- Configure CORS properly
- Rate limiting enabled

## Monitoring & Maintenance

### Health Checks
- Application: `GET /api/users`
- Docker: Built-in health check
- PM2: `pm2 status`

### Logs
```bash
# PM2 logs
pm2 logs tsr-planner

# Docker logs
docker logs tsr-planner

# Application logs
tail -f logs/combined.log
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm ci --only=production

# Rebuild and restart
npm run build
pm2 restart tsr-planner
```

## Performance Optimization

### Production Build
- Minified JavaScript and CSS
- Tree-shaking enabled
- Code splitting
- Gzip compression

### Database Optimization
- Connection pooling
- Query optimization
- Indexing strategy

### Caching
- Static file caching
- API response caching
- CDN integration (optional)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` format
   - Verify network connectivity
   - Check SSL requirements

2. **Firebase Authentication Issues**
   - Verify API keys
   - Check authorized domains
   - Review Firebase console logs

3. **Build Failures**
   - Check Node.js version (20+)
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and reinstall

4. **Memory Issues**
   - Increase PM2 memory limit
   - Monitor with `pm2 monit`
   - Consider horizontal scaling

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# PM2 with debug
pm2 start ecosystem.config.js --env production --log-date-format="YYYY-MM-DD HH:mm:ss Z"
```

## Backup Strategy

### Database Backups
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_file.sql
```

### Application Backups
- Code: Git repository
- Environment: Secure secret management
- Logs: Log rotation and archival

## Scaling

### Horizontal Scaling
- Multiple PM2 instances
- Load balancer (Nginx)
- Database read replicas

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching layer

## Support

For deployment issues:
1. Check logs first
2. Verify environment variables
3. Test database connectivity
4. Review Firebase configuration

---

**Happy Deploying! 🚀**
