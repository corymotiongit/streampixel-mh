#!/usr/bin/env node

/**
 * Script de inicio para Pixel Streaming
 * Inicia el servidor Cirrus y luego la aplicación de Unreal Engine
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m'
};

class PixelStreamingLauncher {
    constructor() {
        this.cirrusProcess = null;
        this.ueProcess = null;
        this.config = this.loadConfig();
        this.pidFile = path.join(__dirname, '.pids.json');
    }

    loadConfig() {
        // Cargar variables de entorno desde .env si existe
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const match = line.match(/^([^=:#]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim();
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
        }

        return {
            // Configuración de Cirrus
            cirrusPath: process.env.CIRRUS_PATH || path.join(__dirname, '..', 'PixelStreamingInfrastructure', 'SignallingWebServer'),
            cirrusPort: process.env.CIRRUS_PORT || '80',
            streamerPort: process.env.STREAMER_PORT || '8888',
            httpPort: process.env.HTTP_PORT || '80',

            // Configuración de Unreal Engine
            uePath: process.env.UE_EXE_PATH || '',
            ueArgs: process.env.UE_ARGS || '-RenderOffScreen -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888',

            // Tiempos de espera
            cirrusStartDelay: parseInt(process.env.CIRRUS_START_DELAY || '5000'),
            healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000')
        };
    }

    log(message, color = 'reset') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`${colors[color]}[${timestamp}]${colors.reset} ${message}`);
    }

    async start() {
        this.log('=== Iniciando Pixel Streaming ===', 'blue');
        this.log(`Cirrus Path: ${this.config.cirrusPath}`, 'blue');
        this.log(`UE Path: ${this.config.uePath || 'NO CONFIGURADO'}`, 'blue');

        // Verificar que las rutas existen
        if (!fs.existsSync(this.config.cirrusPath)) {
            this.log(`ERROR: No se encuentra Cirrus en ${this.config.cirrusPath}`, 'red');
            this.log('Por favor, clona el repositorio de Pixel Streaming Infrastructure', 'yellow');
            this.log('git clone https://github.com/EpicGamesExt/PixelStreamingInfrastructure', 'yellow');
            process.exit(1);
        }

        // Iniciar Cirrus
        await this.startCirrus();

        // Esperar a que Cirrus esté listo
        await this.waitForCirrus();

        // Iniciar Unreal Engine (si está configurado)
        if (this.config.uePath && fs.existsSync(this.config.uePath)) {
            await this.startUnrealEngine();
        } else {
            this.log('No se configuró UE_EXE_PATH. Inicia Unreal Engine manualmente.', 'yellow');
            this.log('El ejecutable debe conectarse a: 127.0.0.1:8888', 'yellow');
        }

        // Guardar PIDs
        this.savePids();

        // Iniciar monitoreo
        this.startHealthCheck();

        // Manejar señales de cierre
        this.setupSignalHandlers();

        this.log('=== Sistema iniciado correctamente ===', 'green');
        this.log(`Frontend disponible en: http://localhost:${this.config.httpPort}`, 'green');
    }

    startCirrus() {
        return new Promise((resolve, reject) => {
            this.log('Iniciando servidor Cirrus...', 'yellow');

            const cirrusScriptPath = path.join(this.config.cirrusPath, 'platform_scripts', 'cmd', 'Start_SignallingServer.ps1');
            const cirrusIndexPath = path.join(this.config.cirrusPath, 'cirrus.js');

            let command, args;

            // Detectar el tipo de sistema y script disponible
            if (process.platform === 'win32' && fs.existsSync(cirrusScriptPath)) {
                // Windows con PowerShell
                command = 'powershell.exe';
                args = ['-ExecutionPolicy', 'Bypass', '-File', cirrusScriptPath];
            } else if (fs.existsSync(cirrusIndexPath)) {
                // Ejecutar directamente con Node.js
                command = 'node';
                args = [cirrusIndexPath, '--HttpPort', this.config.httpPort, '--StreamerPort', this.config.streamerPort];
            } else {
                this.log('ERROR: No se encuentra el servidor Cirrus', 'red');
                reject(new Error('Cirrus no encontrado'));
                return;
            }

            this.cirrusProcess = spawn(command, args, {
                cwd: this.config.cirrusPath,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    HttpPort: this.config.httpPort,
                    StreamerPort: this.config.streamerPort
                }
            });

            this.cirrusProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    this.log(`[Cirrus] ${output}`, 'blue');
                }
            });

            this.cirrusProcess.stderr.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    this.log(`[Cirrus ERROR] ${output}`, 'red');
                }
            });

            this.cirrusProcess.on('close', (code) => {
                this.log(`Cirrus cerrado con código ${code}`, 'yellow');
                if (code !== 0 && code !== null) {
                    this.cleanup();
                }
            });

            // Esperar un poco antes de continuar
            setTimeout(() => {
                if (this.cirrusProcess && !this.cirrusProcess.killed) {
                    this.log('Servidor Cirrus iniciado', 'green');
                    resolve();
                } else {
                    reject(new Error('Cirrus falló al iniciar'));
                }
            }, this.config.cirrusStartDelay);
        });
    }

    async waitForCirrus() {
        this.log('Esperando a que Cirrus esté listo...', 'yellow');

        const maxAttempts = 10;
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                // Intentar conectar al puerto HTTP de Cirrus
                const response = await this.checkPort('localhost', this.config.httpPort);
                if (response) {
                    this.log('Cirrus está listo', 'green');
                    return true;
                }
            } catch (error) {
                // Puerto aún no disponible
            }

            attempts++;
            await this.sleep(2000);
        }

        this.log('Advertencia: No se pudo verificar que Cirrus esté listo', 'yellow');
        return false;
    }

    checkPort(host, port) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();

            socket.setTimeout(1000);

            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                resolve(false);
            });

            socket.connect(port, host);
        });
    }

    startUnrealEngine() {
        return new Promise((resolve) => {
            this.log('Iniciando Unreal Engine...', 'yellow');

            const args = this.config.ueArgs.split(' ').filter(arg => arg.length > 0);

            this.ueProcess = spawn(this.config.uePath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            this.ueProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    this.log(`[UE] ${output}`, 'green');
                }
            });

            this.ueProcess.stderr.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    this.log(`[UE] ${output}`, 'yellow');
                }
            });

            this.ueProcess.on('close', (code) => {
                this.log(`Unreal Engine cerrado con código ${code}`, 'yellow');
                this.cleanup();
            });

            setTimeout(() => {
                if (this.ueProcess && !this.ueProcess.killed) {
                    this.log('Unreal Engine iniciado', 'green');
                    resolve();
                } else {
                    this.log('Advertencia: Unreal Engine podría no haberse iniciado correctamente', 'yellow');
                    resolve();
                }
            }, 3000);
        });
    }

    savePids() {
        const pids = {
            cirrus: this.cirrusProcess ? this.cirrusProcess.pid : null,
            ue: this.ueProcess ? this.ueProcess.pid : null,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(this.pidFile, JSON.stringify(pids, null, 2));
        this.log(`PIDs guardados en ${this.pidFile}`, 'blue');
    }

    startHealthCheck() {
        setInterval(() => {
            const cirrusAlive = this.cirrusProcess && !this.cirrusProcess.killed;
            const ueAlive = this.ueProcess ? !this.ueProcess.killed : true;

            if (!cirrusAlive) {
                this.log('ERROR: Cirrus no está corriendo', 'red');
            }

            if (this.ueProcess && !ueAlive) {
                this.log('ERROR: Unreal Engine no está corriendo', 'red');
            }
        }, this.config.healthCheckInterval);
    }

    setupSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM'];

        signals.forEach(signal => {
            process.on(signal, () => {
                this.log(`\nSeñal ${signal} recibida, cerrando...`, 'yellow');
                this.cleanup();
            });
        });
    }

    cleanup() {
        this.log('Cerrando procesos...', 'yellow');

        if (this.cirrusProcess && !this.cirrusProcess.killed) {
            this.log('Cerrando Cirrus...', 'yellow');
            this.cirrusProcess.kill();
        }

        if (this.ueProcess && !this.ueProcess.killed) {
            this.log('Cerrando Unreal Engine...', 'yellow');
            this.ueProcess.kill();
        }

        // Eliminar archivo de PIDs
        if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
        }

        setTimeout(() => {
            this.log('Procesos cerrados', 'green');
            process.exit(0);
        }, 2000);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Ejecutar
if (require.main === module) {
    const launcher = new PixelStreamingLauncher();
    launcher.start().catch(error => {
        console.error('Error al iniciar:', error);
        process.exit(1);
    });
}

module.exports = PixelStreamingLauncher;
