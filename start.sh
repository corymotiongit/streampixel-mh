#!/bin/bash
# Start script for StreamPixel-MH server

echo "Starting StreamPixel-MH Cirrus Signaling Server..."
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 14.0.0 or higher"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Error: Node.js version 14.0.0 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies"
        exit 1
    fi
fi

# Default port
HTTP_PORT=${1:-80}

# Check if port requires sudo
if [ "$HTTP_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
    echo "Warning: Port $HTTP_PORT requires root privileges"
    echo "Please run with sudo or use a port >= 1024"
    echo "Usage: ./start.sh [port]"
    echo "Example: ./start.sh 8080"
    exit 1
fi

echo "Starting server on port $HTTP_PORT..."
echo "Press Ctrl+C to stop"
echo ""

# Start the server
node cirrus.js --HttpPort $HTTP_PORT

echo ""
echo "Server stopped"
