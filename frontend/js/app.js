/**
 * MetaHuman Pixel Streaming Client
 * Simplified frontend for single-user pixel streaming with microphone support
 */

class PixelStreamingClient {
    constructor() {
        this.ws = null;
        this.peerConnection = null;
        this.localStream = null;
        this.isMicActive = false;

        // Configuración WebRTC
        this.config = {
            sdpSemantics: 'unified-plan',
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };

        // Elementos del DOM
        this.elements = {
            video: document.getElementById('stream-video'),
            statusBanner: document.getElementById('connection-status'),
            statusText: document.getElementById('status-text'),
            loadingOverlay: document.getElementById('loading-overlay'),
            micToggle: document.getElementById('mic-toggle'),
            micStatus: document.getElementById('mic-status'),
            micOnIcon: document.getElementById('mic-on-icon'),
            micOffIcon: document.getElementById('mic-off-icon')
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.connectToSignalingServer();
    }

    setupEventListeners() {
        this.elements.micToggle.addEventListener('click', () => this.toggleMicrophone());

        // Auto-reconexión si se pierde la conexión
        window.addEventListener('beforeunload', () => this.disconnect());
    }

    connectToSignalingServer() {
        const protocol = window.USE_SSL ? 'wss:' : 'ws:';
        const host = window.SIGNALING_SERVER || window.location.hostname;
        const port = window.SIGNALING_PORT || 80;
        const url = `${protocol}//${host}:${port}`;

        this.updateStatus('connecting', 'Conectando al servidor...');

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => this.onSignalingConnected();
            this.ws.onmessage = (event) => this.onSignalingMessage(event);
            this.ws.onerror = (error) => this.onSignalingError(error);
            this.ws.onclose = () => this.onSignalingClosed();
        } catch (error) {
            console.error('Error al crear WebSocket:', error);
            this.updateStatus('error', 'Error de conexión');
        }
    }

    onSignalingConnected() {
        console.log('Conectado al servidor de señalización');
        this.updateStatus('connecting', 'Configurando transmisión...');

        // Crear peer connection
        this.createPeerConnection();
    }

    async onSignalingMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('Mensaje recibido:', message.type);

            switch (message.type) {
                case 'config':
                    this.handleConfig(message);
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
                default:
                    console.log('Tipo de mensaje desconocido:', message.type);
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.config);

        // Manejar tracks remotos (video del UE)
        this.peerConnection.ontrack = (event) => {
            console.log('Track remoto recibido:', event.track.kind);
            if (event.track.kind === 'video' || event.track.kind === 'audio') {
                this.elements.video.srcObject = event.streams[0];
                this.hideLoading();
                this.updateStatus('connected', 'Conectado');
                this.elements.micToggle.disabled = false;
            }
        };

        // Manejar ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage({
                    type: 'iceCandidate',
                    candidate: event.candidate
                });
            }
        };

        // Manejar cambios de estado de conexión
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Estado de conexión:', this.peerConnection.connectionState);

            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.updateStatus('connected', 'Conectado');
                    break;
                case 'disconnected':
                case 'failed':
                    this.updateStatus('error', 'Conexión perdida');
                    this.showLoading();
                    break;
                case 'closed':
                    this.updateStatus('error', 'Conexión cerrada');
                    break;
            }
        };

        // Crear y enviar oferta
        this.createOffer();
    }

    async createOffer() {
        try {
            // Agregar transceivers para recibir audio y video
            this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.sendMessage({
                type: 'offer',
                sdp: offer.sdp
            });
        } catch (error) {
            console.error('Error al crear oferta:', error);
            this.updateStatus('error', 'Error al iniciar conexión');
        }
    }

    handleConfig(message) {
        console.log('Configuración recibida:', message);
        // Aquí puedes manejar configuración adicional del servidor
    }

    async handleOffer(message) {
        try {
            await this.peerConnection.setRemoteDescription({
                type: 'offer',
                sdp: message.sdp
            });

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            this.sendMessage({
                type: 'answer',
                sdp: answer.sdp
            });
        } catch (error) {
            console.error('Error al manejar oferta:', error);
        }
    }

    async handleAnswer(message) {
        try {
            await this.peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: message.sdp
            });
        } catch (error) {
            console.error('Error al manejar respuesta:', error);
        }
    }

    async handleIceCandidate(message) {
        try {
            if (message.candidate) {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(message.candidate)
                );
            }
        } catch (error) {
            console.error('Error al agregar ICE candidate:', error);
        }
    }

    async toggleMicrophone() {
        if (!this.isMicActive) {
            await this.activateMicrophone();
        } else {
            this.deactivateMicrophone();
        }
    }

    async activateMicrophone() {
        try {
            // Solicitar acceso al micrófono
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            // Agregar el track de audio a la conexión
            const audioTrack = this.localStream.getAudioTracks()[0];
            const sender = this.peerConnection.addTrack(audioTrack, this.localStream);

            console.log('Micrófono activado');

            this.isMicActive = true;
            this.updateMicUI();

            // Notificar al servidor que el audio está activo
            this.sendMessage({
                type: 'micActive',
                active: true
            });

        } catch (error) {
            console.error('Error al activar micrófono:', error);
            alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
        }
    }

    deactivateMicrophone() {
        if (this.localStream) {
            // Detener todos los tracks de audio
            this.localStream.getTracks().forEach(track => track.stop());

            // Remover el sender de audio
            const senders = this.peerConnection.getSenders();
            senders.forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    this.peerConnection.removeTrack(sender);
                }
            });

            this.localStream = null;
        }

        this.isMicActive = false;
        this.updateMicUI();

        // Notificar al servidor que el audio está inactivo
        this.sendMessage({
            type: 'micActive',
            active: false
        });

        console.log('Micrófono desactivado');
    }

    updateMicUI() {
        const { micToggle, micStatus, micOnIcon, micOffIcon } = this.elements;

        if (this.isMicActive) {
            micToggle.classList.add('mic-active');
            micStatus.textContent = 'Desactivar Micrófono';
            micOnIcon.classList.add('hidden');
            micOffIcon.classList.remove('hidden');
        } else {
            micToggle.classList.remove('mic-active');
            micStatus.textContent = 'Activar Micrófono';
            micOnIcon.classList.remove('hidden');
            micOffIcon.classList.add('hidden');
        }
    }

    updateStatus(state, text) {
        this.elements.statusBanner.className = `status-banner ${state}`;
        this.elements.statusText.textContent = text;
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket no está conectado');
        }
    }

    onSignalingError(error) {
        console.error('Error en WebSocket:', error);
        this.updateStatus('error', 'Error de conexión');
    }

    onSignalingClosed() {
        console.log('Conexión de señalización cerrada');
        this.updateStatus('error', 'Desconectado');

        // Intentar reconectar después de 5 segundos
        setTimeout(() => {
            console.log('Intentando reconectar...');
            this.connectToSignalingServer();
        }, 5000);
    }

    disconnect() {
        this.deactivateMicrophone();

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.pixelStreamingClient = new PixelStreamingClient();
});
