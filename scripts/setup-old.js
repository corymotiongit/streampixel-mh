#!/usr/bin/env node

/**
 * Script de configuración inicial
 * Ayuda a preparar el entorno de Pixel Streaming
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

class Setup {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.config = {};
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    question(query) {
        return new Promise(resolve => this.rl.question(query, resolve));
    }

    async run() {
        this.log('\n==============================================', 'blue');
        this.log('  SETUP DE PIXEL STREAMING - METAHUMAN', 'bold');
        this.log('==============================================\n', 'blue');

        // 1. Verificar Node.js
        await this.checkNodeVersion();

        // 2. Verificar/Clonar Pixel Streaming Infrastructure
        await this.setupPixelStreamingInfra();

        // 3. Configurar variables de entorno
        await this.setupEnvironment();

        // 4. Hacer ejecutables los scripts
        await this.makeScriptsExecutable();

        // 5. Instrucciones finales
        this.showFinalInstructions();

        this.rl.close();
    }

    async checkNodeVersion() {
        try {
            const version = execSync('node --version', { encoding: 'utf8' }).trim();
            this.log(`✓ Node.js version: ${version}`, 'green');

            const majorVersion = parseInt(version.slice(1).split('.')[0]);
            if (majorVersion < 14) {
                this.log('⚠ Advertencia: Se recomienda Node.js 14 o superior', 'yellow');
            }
        } catch (error) {
            this.log('✗ Node.js no está instalado', 'red');
            this.log('Instala Node.js desde: https://nodejs.org/', 'yellow');
            process.exit(1);
        }
    }

    async setupPixelStreamingInfra() {
        this.log('\n--- Pixel Streaming Infrastructure ---', 'blue');

        const infraPath = path.join(process.cwd(), 'PixelStreamingInfrastructure');

        if (fs.existsSync(infraPath)) {
            this.log('✓ PixelStreamingInfrastructure ya existe', 'green');

            const update = await this.question('¿Quieres actualizarlo? (y/N): ');
            if (update.toLowerCase() === 'y') {
                try {
                    this.log('Actualizando repositorio...', 'yellow');
                    execSync('git pull', { cwd: infraPath, stdio: 'inherit' });
                    this.log('✓ Repositorio actualizado', 'green');
                } catch (error) {
                    this.log('✗ Error al actualizar repositorio', 'red');
                }
            }
        } else {
            const clone = await this.question('¿Quieres clonar PixelStreamingInfrastructure? (Y/n): ');
            if (clone.toLowerCase() !== 'n') {
                try {
                    this.log('Clonando repositorio...', 'yellow');
                    execSync(
                        'git clone https://github.com/EpicGamesExt/PixelStreamingInfrastructure',
                        { stdio: 'inherit' }
                    );
                    this.log('✓ Repositorio clonado correctamente', 'green');

                    // Instalar dependencias de Cirrus
                    const cirrusPath = path.join(infraPath, 'SignallingWebServer');
                    if (fs.existsSync(cirrusPath)) {
                        this.log('Instalando dependencias de Cirrus...', 'yellow');
                        try {
                            execSync('npm install', { cwd: cirrusPath, stdio: 'inherit' });
                            this.log('✓ Dependencias instaladas', 'green');
                        } catch (error) {
                            this.log('⚠ Error al instalar dependencias. Hazlo manualmente.', 'yellow');
                        }
                    }
                } catch (error) {
                    this.log('✗ Error al clonar repositorio', 'red');
                    this.log('Clona manualmente: git clone https://github.com/EpicGamesExt/PixelStreamingInfrastructure', 'yellow');
                }
            }
        }

        this.config.cirrusPath = infraPath;
    }

    async setupEnvironment() {
        this.log('\n--- Configuración de Variables de Entorno ---', 'blue');

        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        if (fs.existsSync(envPath)) {
            this.log('✓ Archivo .env ya existe', 'green');
            const overwrite = await this.question('¿Quieres reconfigurarlo? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                return;
            }
        }

        this.log('\nConfiguración de puertos:', 'yellow');
        const httpPort = await this.question('Puerto HTTP [80]: ') || '80';
        const streamerPort = await this.question('Puerto Streamer [8888]: ') || '8888';

        this.log('\nConfiguración de Unreal Engine:', 'yellow');
        this.log('(Déjalo vacío si lo configurarás después)', 'yellow');
        const uePath = await this.question('Ruta al ejecutable de UE [vacío]: ') || '';

        // Crear archivo .env
        const envContent = fs.readFileSync(envExamplePath, 'utf8')
            .replace(/HTTP_PORT=.*/,`HTTP_PORT=${httpPort}`)
            .replace(/STREAMER_PORT=.*/, `STREAMER_PORT=${streamerPort}`)
            .replace(/UE_EXE_PATH=.*/, `UE_EXE_PATH=${uePath}`);

        fs.writeFileSync(envPath, envContent);
        this.log('✓ Archivo .env creado', 'green');
    }

    async makeScriptsExecutable() {
        if (process.platform !== 'win32') {
            try {
                execSync('chmod +x scripts/*.js', { stdio: 'ignore' });
                this.log('✓ Scripts marcados como ejecutables', 'green');
            } catch (error) {
                // No es crítico
            }
        }
    }

    showFinalInstructions() {
        this.log('\n==============================================', 'green');
        this.log('  ✓ SETUP COMPLETADO', 'bold');
        this.log('==============================================\n', 'green');

        this.log('Próximos pasos:', 'blue');
        this.log('1. Configura tu proyecto de Unreal Engine para Pixel Streaming', 'yellow');
        this.log('   - Habilita el plugin de Pixel Streaming', 'yellow');
        this.log('   - Configura el MetaHuman en tu escena', 'yellow');
        this.log('   - Compila el proyecto', 'yellow');

        this.log('\n2. Actualiza la ruta UE_EXE_PATH en el archivo .env', 'yellow');

        this.log('\n3. Inicia el servidor:', 'yellow');
        this.log('   npm start', 'green');

        this.log('\n4. Accede al frontend:', 'yellow');
        this.log('   http://localhost:' + (this.config.httpPort || '80'), 'green');

        this.log('\n5. Para detener todo:', 'yellow');
        this.log('   npm stop', 'green');

        this.log('\nDocumentación adicional en: docs/SETUP.md\n', 'blue');
    }
}

// Ejecutar
if (require.main === module) {
    const setup = new Setup();
    setup.run().catch(error => {
        console.error('Error durante el setup:', error);
        process.exit(1);
    });
}

module.exports = Setup;
