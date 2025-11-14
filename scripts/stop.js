#!/usr/bin/env node

/**
 * Script de apagado para Pixel Streaming
 * Detiene todos los procesos de forma segura
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m'
};

class PixelStreamingStopper {
    constructor() {
        this.pidFile = path.join(__dirname, '.pids.json');
    }

    log(message, color = 'reset') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`${colors[color]}[${timestamp}]${colors.reset} ${message}`);
    }

    async stop() {
        this.log('=== Deteniendo Pixel Streaming ===', 'blue');

        // Leer PIDs guardados
        const pids = this.loadPids();

        if (!pids) {
            this.log('No se encontró información de procesos en ejecución', 'yellow');
            this.log('Intentando detener por nombre de proceso...', 'yellow');
            await this.killByProcessName();
            return;
        }

        // Detener procesos por PID
        await this.killProcess(pids.ue, 'Unreal Engine');
        await this.killProcess(pids.cirrus, 'Cirrus');

        // Eliminar archivo de PIDs
        this.deletePidFile();

        this.log('=== Todos los procesos detenidos ===', 'green');
    }

    loadPids() {
        if (!fs.existsSync(this.pidFile)) {
            return null;
        }

        try {
            const content = fs.readFileSync(this.pidFile, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            this.log(`Error al leer archivo de PIDs: ${error.message}`, 'red');
            return null;
        }
    }

    async killProcess(pid, name) {
        if (!pid) {
            this.log(`No hay PID para ${name}`, 'yellow');
            return;
        }

        this.log(`Deteniendo ${name} (PID: ${pid})...`, 'yellow');

        try {
            // Verificar si el proceso existe
            const exists = await this.processExists(pid);

            if (!exists) {
                this.log(`${name} ya no está en ejecución`, 'yellow');
                return;
            }

            // Intentar detener el proceso
            if (process.platform === 'win32') {
                // Windows
                await this.executeCommand(`taskkill /F /PID ${pid}`);
            } else {
                // Linux/Mac
                await this.executeCommand(`kill -15 ${pid}`);

                // Esperar un momento
                await this.sleep(2000);

                // Si aún existe, forzar
                const stillExists = await this.processExists(pid);
                if (stillExists) {
                    this.log(`Forzando cierre de ${name}...`, 'yellow');
                    await this.executeCommand(`kill -9 ${pid}`);
                }
            }

            this.log(`${name} detenido correctamente`, 'green');
        } catch (error) {
            this.log(`Error al detener ${name}: ${error.message}`, 'red');
        }
    }

    async killByProcessName() {
        const processes = [
            { name: 'node.*cirrus', displayName: 'Cirrus' },
            { name: 'UE4Editor', displayName: 'Unreal Engine' },
            { name: 'UnrealEditor', displayName: 'Unreal Engine' },
        ];

        for (const proc of processes) {
            try {
                if (process.platform === 'win32') {
                    await this.executeCommand(`taskkill /F /IM ${proc.name}* 2>nul`);
                } else {
                    await this.executeCommand(`pkill -f "${proc.name}"`);
                }
                this.log(`${proc.displayName} detenido`, 'green');
            } catch (error) {
                // Es normal que falle si el proceso no existe
                this.log(`${proc.displayName} no está en ejecución`, 'yellow');
            }
        }
    }

    processExists(pid) {
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                exec(`tasklist /FI "PID eq ${pid}"`, (error, stdout) => {
                    if (error) {
                        resolve(false);
                        return;
                    }
                    resolve(stdout.includes(pid.toString()));
                });
            } else {
                exec(`ps -p ${pid}`, (error) => {
                    resolve(!error);
                });
            }
        });
    }

    executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    // No rechazar en algunos casos esperados
                    if (error.code === 1 && process.platform !== 'win32') {
                        // pkill retorna 1 si no encuentra procesos
                        resolve(stdout);
                        return;
                    }
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });
    }

    deletePidFile() {
        if (fs.existsSync(this.pidFile)) {
            try {
                fs.unlinkSync(this.pidFile);
                this.log('Archivo de PIDs eliminado', 'blue');
            } catch (error) {
                this.log(`Error al eliminar archivo de PIDs: ${error.message}`, 'red');
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Ejecutar
if (require.main === module) {
    const stopper = new PixelStreamingStopper();
    stopper.stop().catch(error => {
        console.error('Error al detener:', error);
        process.exit(1);
    });
}

module.exports = PixelStreamingStopper;
