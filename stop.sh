#!/bin/bash
# Stop script for StreamPixel-MH server

echo "Stopping StreamPixel-MH Cirrus Signaling Server..."

# Find and kill Node.js processes running cirrus.js
PIDS=$(pgrep -f "node.*cirrus.js")

if [ -z "$PIDS" ]; then
    echo "No running server found"
    exit 0
fi

echo "Found server process(es): $PIDS"
echo "Stopping..."

for PID in $PIDS; do
    kill $PID
    echo "Sent SIGTERM to process $PID"
done

# Wait for processes to stop
sleep 2

# Check if processes are still running
REMAINING=$(pgrep -f "node.*cirrus.js")
if [ ! -z "$REMAINING" ]; then
    echo "Forcing shutdown..."
    for PID in $REMAINING; do
        kill -9 $PID
        echo "Sent SIGKILL to process $PID"
    done
fi

echo "Server stopped successfully"
