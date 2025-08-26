#!/bin/bash

# Sync-Talk Setup Script for Windows (PowerShell)
# Run this script to set up the entire project

Write-Host "Setting up Sync-Talk Real-Time Chat Application..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is installed
if (!(Get-Command mongod -ErrorAction SilentlyContinue)) {
    Write-Host "MongoDB is not installed. Please install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host "   Or use MongoDB Atlas (cloud database) by updating the MONGODB_URI in backend/.env" -ForegroundColor Yellow
}

Write-Host "Installing Backend Dependencies..." -ForegroundColor Blue
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing Frontend Dependencies..." -ForegroundColor Blue
Set-Location ../frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start MongoDB service (if using local MongoDB)" -ForegroundColor White
Write-Host "2. Update backend/.env with your configuration" -ForegroundColor White
Write-Host "3. Run 'npm run dev' in the backend directory" -ForegroundColor White
Write-Host "4. Run 'npm start' in the frontend directory" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see README.md" -ForegroundColor Blue
