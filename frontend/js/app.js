/**
 * MetaHuman Pixel Streaming Client
 * Implementación simplificada y robusta basada en el protocolo de Epic Games  
 */

class PixelStreamingClient {
    constructor() {
        this.ws = null;
        this.peerConnection = null;
        this.localStream = null;
        this.isMicActive = false;
        this.dataChannel = null;

        // Configuración WebRTC
        this.config = {
            sdpSemantics: 'unified-plan',
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
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

        // Cleanup en cierre
        window.addEventListener('beforeunload', () => this.disconnect());
    }

    connectToSignalingServer() {
        const protocol = window.USE_SSL ? 'wss:' : 'ws:';
        const host = window.SIGNALING_SERVER || window.location.hostname;
        const port = window.SIGNALING_PORT || 80;
        const url = `${protocol}//${host}:${port}`;

        this.updateStatus('connecting', 'Conectando al servidor...');

        console.log('Connecting to:', url);

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
        console.log('✓ Conectado al servidor de señalización');
        this.updateStatus('connecting', 'Configurando transmisión...');

        // Enviar mensaje de configuración (protocolo de Epic)
        this.sendMessage({
            type: 'config',
            peerConnectionOptions: this.config
        });
    }

    async onSignalingMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('← Mensaje recibido:', message.type);

            switch (message.type) {
                case 'config':
                    await this.handleConfig(message);
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
                case 'playerCount':
                    console.log('Jugadores conectados:', message.count);
                    break;
                default:
                    console.log('Tipo de mensaje no manejado:', message.type);
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    }

    async handleConfig(message) {
        console.log('Configuración recibida del servidor');

        // Aplicar configuración del servidor si viene
        if (message.peerConnectionOptions) {
            Object.assign(this.config, message.peerConnectionOptions);
        }

        // Crear peer connection después de recibir config
        await this.createPeerConnection();
    }

    async createPeerConnection() {
        if (this.peerConnection) {
            console.log('Peer connection ya existe');
            return;
        }

        console.log('Creando peer connection...');
        this.peerConnection = new RTCPeerConnection(this.config);

        // Manejar tracks remotos (video/audio del UE)
        this.peerConnection.ontrack = (event) => {
            console.log('→ Track remoto recibido:', event.track.kind);

            if (event.streams && event.streams[0]) {
                this.elements.video.srcObject = event.streams[0];

                // Intentar reproducir
                this.elements.video.play().then(() => {
                    console.log('✓ Video reproduciéndose');
                    this.hideLoading();
                    this.updateStatus('connected', 'Conectado');
                    this.elements.micToggle.disabled = false;
                }).catch(error => {
                    console.warn('Autoplay bloqueado:', error);
                    // Esperar interacción del usuario
                    this.elements.loadingOverlay.style.cursor = 'pointer';
                    this.elements.loadingOverlay.addEventListener('click', () => {
                        this.elements.video.play();
                        this.hideLoading();
                    }, { once: true });
                });
            }
        };

        // Manejar ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('→ Enviando ICE candidate');
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
                    this.hideLoading();
                    break;
                case 'disconnected':
                    this.updateStatus('error', 'Desconectado');
                    this.showLoading();
                    break;
                case 'failed':
                    this.updateStatus('error', 'Conexión fallida');
                    this.showLoading();
                    // Intentar reconectar
                    setTimeout(() => this.reconnect(), 3000);
                    break;
                case 'closed':
                    this.updateStatus('error', 'Conexión cerrada');
                    break;
            }
        };

        // Manejar data channel (opcional, para mensajes con UE)
        this.peerConnection.ondatachannel = (event) => {
            console.log('→ Data channel recibido:', event.channel.label);
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };

        console.log('✓ Peer connection creado');
    }

    setupDataChannel() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.log('✓ Data channel abierto');
        };

        this.dataChannel.onmessage = (event) => {
            console.log('← Data channel mensaje:', event.data);
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel cerrado');
        };
    }

    async handleOffer(message) {
        console.log('Manejando oferta del servidor...');

        try {
            // Asegurarse de que existe el peer connection
            if (!this.peerConnection) {
                await this.createPeerConnection();
            }

            await this.peerConnection.setRemoteDescription({
                type: 'offer',
                sdp: message.sdp
            });

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            console.log('→ Enviando respuesta');
            this.sendMessage({
                type: 'answer',
                sdp: answer.sdp
            });

        } catch (error) {
            console.error('Error al manejar oferta:', error);
            this.updateStatus('error', 'Error en negociación');
        }
    }

    async handleAnswer(message) {
        try {
            console.log('Recibiendo respuesta del servidor...');
            await this.peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: message.sdp
            });
            console.log('✓ Respuesta aceptada');
        } catch (error) {
            console.error('Error al manejar respuesta:', error);
        }
    }

    async handleIceCandidate(message) {
        try {
            if (message.candidate && this.peerConnection) {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(message.candidate)
                );
                console.log('✓ ICE candidate agregado');
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
            console.log('Solicitando acceso al micrófono...');

            // Solicitar acceso al micrófono
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                },
                video: false
            });

            // Agregar el track de audio a la conexión
            const audioTrack = this.localStream.getAudioTracks()[0];

            if (this.peerConnection) {
                this.peerConnection.addTrack(audioTrack, this.localStream);
                console.log('✓ Micrófono activado');

                this.isMicActive = true;
                this.updateMicUI();
            } else {
                console.error('No hay peer connection disponible');
                this.localStream.getTracks().forEach(track => track.stop());
            }

        } catch (error) {
            console.error('Error al activar micrófono:', error);
            alert('No se pudo acceder al micrófono.\nVerifica los permisos del navegador.');
        }
    }

    deactivateMicrophone() {
        if (this.localStream) {
            console.log('Desactivando micrófono...');

            // Detener todos los tracks de audio
            this.localStream.getTracks().forEach(track => track.stop());

            // Remover el sender de audio
            if (this.peerConnection) {
                const senders = this.peerConnection.getSenders();
                senders.forEach(sender => {
                    if (sender.track && sender.track.kind === 'audio') {
                        this.peerConnection.removeTrack(sender);
                    }
                });
            }

            this.localStream = null;
        }

        this.isMicActive = false;
        this.updateMicUI();
        console.log('✓ Micrófono desactivado');
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
            console.log('→ Mensaje enviado:', message.type);
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
            this.reconnect();
        }, 5000);
    }

    reconnect() {
        // Limpiar conexión anterior
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Reconectar
        this.connectToSignalingServer();
    }

    disconnect() {
        console.log('Desconectando...');

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
    console.log('=== MetaHuman Pixel Streaming Client ===');
    window.pixelStreamingClient = new PixelStreamingClient();
});
