#!/bin/bash

# Gautam Insurance Website Startup Script

echo "Starting Gautam Insurance Website..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "pip3 is not installed. Please install pip."
    exit 1
fi

# Navigate to backend directory
cd backend

# Install dependencies if not already installed
echo "Checking dependencies..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Create uploads directory if it doesn't exist
mkdir -p ../uploads/images
mkdir -p ../uploads/documents

# Start the FastAPI server
echo "Starting FastAPI server..."
echo "The website will be available at http://localhost:8000"
echo "Admin panel: http://localhost:8000/admin.html"
echo "Default admin credentials: username: admin, password: admin123"
echo "Press Ctrl+C to stop the server"

uvicorn main:app --host 0.0.0.0 --port 8004 --reload