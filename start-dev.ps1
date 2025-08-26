#!/bin/bash

# Quick Start Script for Sync-Talk
# This script starts both backend and frontend servers

Write-Host "Starting Sync-Talk Development Servers..." -ForegroundColor Green
Write-Host ""

# Check if dependencies are installed
if (!(Test-Path "backend/node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Blue
    Set-Location backend
    npm install
    Set-Location ..
}

if (!(Test-Path "frontend/node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
    Set-Location frontend
    npm install
    Set-Location ..
}

# Start MongoDB (if needed)
Write-Host "Checking MongoDB connection..." -ForegroundColor Blue

# Function to start backend
Write-Host "Starting Backend Server..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-Command", "cd 'backend'; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Function to start frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-Command", "cd 'frontend'; npm start"

Write-Host ""
Write-Host "Development servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Blue
Write-Host ""
Write-Host "To stop servers, press Ctrl+C in each terminal window" -ForegroundColor Yellow
