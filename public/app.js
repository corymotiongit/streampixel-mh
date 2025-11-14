// StreamPixel-MH WebRTC Client
// Handles connection to Cirrus signaling server and Pixel Streaming

class PixelStreamingClient {
    constructor() {
        this.ws = null;
        this.pc = null;
        this.dataChannel = null;
        this.playerId = null;
        this.micStream = null;
        this.isConnected = false;
        
        // UI elements
        this.videoPlayer = document.getElementById('video-player');
        this.overlay = document.getElementById('overlay');
        this.statusText = document.getElementById('status');
        this.connectBtn = document.getElementById('connect-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.micToggle = document.getElementById('mic-toggle');
        this.micStatus = document.getElementById('mic-status');
        this.connectionStatus = document.getElementById('connection-status');
        this.latencyDisplay = document.getElementById('latency');
        this.bitrateDisplay = document.getElementById('bitrate');
        
        this.setupEventListeners();
        this.statsInterval = null;
    }
    
    setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.micToggle.addEventListener('change', (e) => this.toggleMicrophone(e.target.checked));
        
        // Mouse and keyboard events for UE interaction
        this.videoPlayer.addEventListener('click', () => this.videoPlayer.requestPointerLock());
        this.videoPlayer.addEventListener('mousedown', (e) => this.sendMouseEvent('mouseDown', e));
        this.videoPlayer.addEventListener('mouseup', (e) => this.sendMouseEvent('mouseUp', e));
        this.videoPlayer.addEventListener('mousemove', (e) => this.sendMouseEvent('mouseMove', e));
        this.videoPlayer.addEventListener('wheel', (e) => this.sendWheelEvent(e));
        
        document.addEventListener('keydown', (e) => this.sendKeyEvent('keyDown', e));
        document.addEventListener('keyup', (e) => this.sendKeyEvent('keyUp', e));
    }
    
    async connect() {
        try {
            this.updateStatus('Conectando al servidor de señalización...');
            
            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateStatus('Conectado al servidor, iniciando stream...');
            };
            
            this.ws.onmessage = (event) => {
                this.handleSignalingMessage(JSON.parse(event.data));
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('Error de conexión');
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket closed');
                this.disconnect();
            };
            
        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus('Error al conectar: ' + error.message);
        }
    }
    
    async handleSignalingMessage(message) {
        console.log('Signaling message:', message.type);
        
        switch (message.type) {
            case 'config':
                this.playerId = message.playerId;
                await this.createPeerConnection(message.peerConnectionOptions);
                break;
                
            case 'offer':
                await this.handleOffer(message);
                break;
                
            case 'answer':
                await this.handleAnswer(message);
                break;
                
            case 'iceCandidate':
                await this.handleIceCandidate(message);
                break;
                
            case 'error':
                this.updateStatus('Error: ' + message.message);
                break;
        }
    }
    
    async createPeerConnection(config) {
        console.log('Creating peer connection with config:', config);
        
        this.pc = new RTCPeerConnection(config);
        
        // Handle incoming tracks (video/audio from UE)
        this.pc.ontrack = (event) => {
            console.log('Received track:', event.track.kind);
            if (event.streams && event.streams[0]) {
                this.videoPlayer.srcObject = event.streams[0];
                this.updateStatus('Stream activo');
                this.overlay.classList.add('hidden');
                this.isConnected = true;
                this.updateConnectionUI(true);
                this.startStatsMonitoring();
            }
        };
        
        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'iceCandidate',
                    candidate: event.candidate
                });
            }
        };
        
        // Connection state changes
        this.pc.onconnectionstatechange = () => {
            console.log('Connection state:', this.pc.connectionState);
            if (this.pc.connectionState === 'failed') {
                this.updateStatus('Conexión fallida');
                this.disconnect();
            }
        };
        
        // Create data channel for input events
        this.dataChannel = this.pc.createDataChannel('cirrus', {
            ordered: true
        });
        
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
        };
        
        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };
        
        // Create offer
        const offer = await this.pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        
        await this.pc.setLocalDescription(offer);
        
        this.sendSignalingMessage({
            type: 'offer',
            sdp: offer.sdp
        });
    }
    
    async handleOffer(message) {
        await this.pc.setRemoteDescription(new RTCSessionDescription({
            type: 'offer',
            sdp: message.sdp
        }));
        
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        
        this.sendSignalingMessage({
            type: 'answer',
            sdp: answer.sdp
        });
    }
    
    async handleAnswer(message) {
        await this.pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: message.sdp
        }));
    }
    
    async handleIceCandidate(message) {
        if (message.candidate) {
            await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
    }
    
    async toggleMicrophone(enabled) {
        if (enabled) {
            try {
                this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTrack = this.micStream.getAudioTracks()[0];
                
                if (this.pc) {
                    this.pc.addTrack(audioTrack, this.micStream);
                }
                
                this.micStatus.classList.add('active');
                console.log('Microphone enabled');
            } catch (error) {
                console.error('Microphone error:', error);
                alert('No se pudo acceder al micrófono: ' + error.message);
                this.micToggle.checked = false;
            }
        } else {
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => track.stop());
                this.micStream = null;
                this.micStatus.classList.remove('active');
                console.log('Microphone disabled');
            }
        }
    }
    
    sendSignalingMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    sendMouseEvent(type, event) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
        
        const message = {
            type: type,
            x: event.clientX,
            y: event.clientY,
            button: event.button
        };
        
        this.dataChannel.send(JSON.stringify(message));
    }
    
    sendWheelEvent(event) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
        
        event.preventDefault();
        
        const message = {
            type: 'mouseWheel',
            delta: event.deltaY
        };
        
        this.dataChannel.send(JSON.stringify(message));
    }
    
    sendKeyEvent(type, event) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
        
        const message = {
            type: type,
            keyCode: event.keyCode,
            key: event.key
        };
        
        this.dataChannel.send(JSON.stringify(message));
    }
    
    startStatsMonitoring() {
        this.statsInterval = setInterval(async () => {
            if (!this.pc) return;
            
            const stats = await this.pc.getStats();
            stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                    // Calculate bitrate
                    if (this.lastBytesReceived !== undefined) {
                        const bitrate = ((report.bytesReceived - this.lastBytesReceived) * 8) / 1000;
                        this.bitrateDisplay.textContent = Math.round(bitrate);
                    }
                    this.lastBytesReceived = report.bytesReceived;
                    
                    // Display latency
                    if (report.jitter !== undefined) {
                        this.latencyDisplay.textContent = Math.round(report.jitter * 1000);
                    }
                }
            });
        }, 1000);
    }
    
    disconnect() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
            this.micToggle.checked = false;
            this.micStatus.classList.remove('active');
        }
        
        this.videoPlayer.srcObject = null;
        this.overlay.classList.remove('hidden');
        this.isConnected = false;
        this.updateConnectionUI(false);
        this.updateStatus('Desconectado');
        this.latencyDisplay.textContent = '-';
        this.bitrateDisplay.textContent = '-';
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
        console.log('Status:', message);
    }
    
    updateConnectionUI(connected) {
        this.connectBtn.disabled = connected;
        this.disconnectBtn.disabled = !connected;
        this.connectionStatus.textContent = connected ? 'Conectado' : 'Desconectado';
        this.connectionStatus.style.color = connected ? '#48bb78' : '#f56565';
    }
}

// Initialize client when page loads
let client;
document.addEventListener('DOMContentLoaded', () => {
    console.log('StreamPixel-MH Client initializing...');
    client = new PixelStreamingClient();
});
