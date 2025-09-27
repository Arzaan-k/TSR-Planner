#!/bin/bash

# TSR Planner Deployment Script
set -e

echo "🚀 Starting TSR Planner deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_warning "Please copy env.production.example to .env and configure your environment variables."
    exit 1
fi

# Check if required environment variables are set
source .env
required_vars=("DATABASE_URL" "VITE_FIREBASE_API_KEY" "VITE_FIREBASE_PROJECT_ID" "VITE_FIREBASE_APP_ID")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set!"
        exit 1
    fi
done

print_status "Environment variables validated ✓"

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production

# Build the application
print_status "Building application..."
npm run build

# Run database migrations
print_status "Running database migrations..."
npm run db:push

print_status "Deployment completed successfully! 🎉"
print_status "You can now start the application with: npm start"
print_status "Or use Docker: docker-compose up -d"
