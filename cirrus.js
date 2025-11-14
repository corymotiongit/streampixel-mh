#!/usr/bin/env node

// Copyright Epic Games, Inc. All Rights Reserved.
// Modified for StreamPixel-MH MetaHuman deployment

const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Load configuration
const configFile = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Override with command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--HttpPort' && process.argv[index + 1]) {
    config.HttpPort = parseInt(process.argv[index + 1]);
  }
  if (arg === '--StreamerPort' && process.argv[index + 1]) {
    config.StreamerPort = parseInt(process.argv[index + 1]);
  }
  if (arg === '--debug') {
    config.LogVerbose = true;
  }
});

console.log('StreamPixel-MH Cirrus Signaling Server');
console.log('=======================================');
console.log('Configuration:');
console.log(JSON.stringify(config, null, 2));

// Setup Express HTTP server
const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', streamer: streamerConnected ? 'connected' : 'disconnected' });
});

// Create HTTP server
const httpServer = http.createServer(app);

// WebSocket servers
const streamerServer = new WebSocket.Server({ 
  server: httpServer,
  path: '/ws'
});

let streamer = null;
let streamerConnected = false;
let players = new Map();
let nextPlayerId = 1;

// Utility functions
function logMessage(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  if (config.LogToFile) {
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    const logFile = path.join(logDir, `cirrus-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  }
}

function logVerbose(message) {
  if (config.LogVerbose) {
    logMessage(message);
  }
}

function sendMessage(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({ type, ...payload });
    ws.send(message);
    logVerbose(`Sent ${type}: ${message}`);
  }
}

// Streamer connection handling
streamerServer.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const isStreamer = url.searchParams.get('role') === 'streamer';
  
  if (isStreamer) {
    logMessage('Streamer connected');
    
    if (streamer && streamer.readyState === WebSocket.OPEN) {
      logMessage('Closing existing streamer connection');
      streamer.close();
    }
    
    streamer = ws;
    streamerConnected = true;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        logVerbose(`Streamer message: ${message.type}`);
        
        // Forward streamer messages to appropriate player
        if (message.playerId && players.has(message.playerId)) {
          const player = players.get(message.playerId);
          player.send(data);
        }
      } catch (err) {
        logMessage(`Error parsing streamer message: ${err.message}`);
      }
    });
    
    ws.on('close', () => {
      logMessage('Streamer disconnected');
      streamer = null;
      streamerConnected = false;
      
      // Disconnect all players
      players.forEach((player, id) => {
        player.close();
      });
      players.clear();
    });
    
    ws.on('error', (error) => {
      logMessage(`Streamer error: ${error.message}`);
    });
    
  } else {
    // Player connection
    const playerId = nextPlayerId++;
    players.set(playerId, ws);
    
    logMessage(`Player ${playerId} connected (total: ${players.size})`);
    
    // Check if streamer is available
    if (!streamer || streamer.readyState !== WebSocket.OPEN) {
      sendMessage(ws, 'error', { message: 'Streamer not available' });
      ws.close();
      players.delete(playerId);
      return;
    }
    
    // Notify player of their ID
    sendMessage(ws, 'config', {
      playerId: playerId,
      peerConnectionOptions: config.peerConnectionOptions
    });
    
    // Notify streamer of new player
    sendMessage(streamer, 'playerConnected', { playerId: playerId });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        logVerbose(`Player ${playerId} message: ${message.type}`);
        
        // Forward player messages to streamer
        if (streamer && streamer.readyState === WebSocket.OPEN) {
          const forwardMessage = { ...message, playerId: playerId };
          streamer.send(JSON.stringify(forwardMessage));
        }
      } catch (err) {
        logMessage(`Error parsing player ${playerId} message: ${err.message}`);
      }
    });
    
    ws.on('close', () => {
      logMessage(`Player ${playerId} disconnected (remaining: ${players.size - 1})`);
      players.delete(playerId);
      
      // Notify streamer
      if (streamer && streamer.readyState === WebSocket.OPEN) {
        sendMessage(streamer, 'playerDisconnected', { playerId: playerId });
      }
    });
    
    ws.on('error', (error) => {
      logMessage(`Player ${playerId} error: ${error.message}`);
    });
  }
});

// Start HTTP server
httpServer.listen(config.HttpPort, () => {
  logMessage(`HTTP server listening on port ${config.HttpPort}`);
  logMessage(`WebSocket server ready at ws://localhost:${config.HttpPort}/ws`);
  logMessage('Waiting for Unreal Engine streamer connection...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logMessage('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logMessage('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logMessage('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logMessage('Server closed');
    process.exit(0);
  });
});
