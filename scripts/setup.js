#!/usr/bin/env node

/**
 * Script de setup simplificado
 * Evita compilar el monorepo - usa Cirrus pre-compilado
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
    log('\n==============================================', 'blue');
    log('  SETUP SIMPLIFICADO - PIXEL STREAMING', 'bold');
    log('==============================================\n', 'blue');

    // 1. Verificar Node.js
    log('1. Verificando Node.js...', 'blue');
    try {
        const version = execSync('node --version', { encoding: 'utf8' }).trim();
        log(`   ✓ ${version}`, 'green');
    } catch (error) {
        log('   ✗ Node.js no instalado', 'red');
        log('   Instala desde: https://nodejs.org/', 'yellow');
        process.exit(1);
    }

    // 2. Clonar PixelStreamingInfrastructure si no existe
    const infraPath = path.join(process.cwd(), 'PixelStreamingInfrastructure');

    log('\n2. Verificando Pixel Streaming Infrastructure...', 'blue');
    if (!fs.existsSync(infraPath)) {
        log('   Clonando repositorio de Epic Games...', 'yellow');
        try {
            execSync(
                'git clone --depth 1 https://github.com/EpicGamesExt/PixelStreamingInfrastructure',
                { stdio: 'inherit' }
            );
            log('   ✓ Repositorio clonado', 'green');
        } catch (error) {
            log('   ✗ Error al clonar', 'red');
            process.exit(1);
        }
    } else {
        log('   ✓ Ya existe', 'green');
    }

    // 3. Instalar SOLO dependencias runtime de Cirrus (no compilar)
    const cirrusPath = path.join(infraPath, 'SignallingWebServer');

    log('\n3. Instalando dependencias runtime de Cirrus...', 'blue');
    log('   (Solo las necesarias para ejecutar, no para compilar)', 'yellow');

    if (fs.existsSync(cirrusPath)) {
        try {
            // Crear package.json mínimo si no existe node_modules
            const nodeModulesPath = path.join(cirrusPath, 'node_modules');

            if (!fs.existsSync(nodeModulesPath)) {
                log('   Instalando dependencias básicas...', 'yellow');

                // Instalar solo las dependencias críticas para ejecutar
                const runtimeDeps = [
                    'express',
                    'ws',
                    'yargs',
                    'log-timestamp'
                ];

                process.chdir(cirrusPath);

                // Inicializar npm si no hay package.json
                if (!fs.existsSync(path.join(cirrusPath, 'package.json'))) {
                    execSync('npm init -y', { stdio: 'ignore' });
                }

                // Instalar dependencias una por una (más robusto)
                for (const dep of runtimeDeps) {
                    try {
                        log(`   Instalando ${dep}...`, 'yellow');
                        execSync(`npm install ${dep} --save --legacy-peer-deps`, {
                            stdio: 'ignore',
                            timeout: 60000
                        });
                    } catch (err) {
                        log(`   ⚠ Error con ${dep}, continuando...`, 'yellow');
                    }
                }

                process.chdir(process.cwd().replace('/PixelStreamingInfrastructure/SignallingWebServer', ''));
                log('   ✓ Dependencias instaladas', 'green');
            } else {
                log('   ✓ Dependencias ya instaladas', 'green');
            }
        } catch (error) {
            log('   ⚠ Advertencia: Algunas dependencias pueden faltar', 'yellow');
            log('   Continuando...', 'yellow');
        }
    }

    // 4. Verificar que cirrus.js existe
    log('\n4. Verificando Cirrus...', 'blue');
    const cirrusJs = path.join(cirrusPath, 'cirrus.js');

    if (fs.existsSync(cirrusJs)) {
        log('   ✓ cirrus.js encontrado (pre-compilado)', 'green');
    } else {
        log('   ✗ cirrus.js no encontrado', 'red');
        log('   El repositorio puede estar corrupto', 'yellow');
        process.exit(1);
    }

    // 5. Crear archivo .env
    log('\n5. Configurando variables de entorno...', 'blue');
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            log('   ✓ Archivo .env creado', 'green');
            log('   Edita .env y configura UE_EXE_PATH', 'yellow');
        }
    } else {
        log('   ✓ Archivo .env ya existe', 'green');
    }

    // 6. Instrucciones finales
    log('\n==============================================', 'green');
    log('  ✓ SETUP COMPLETADO', 'bold');
    log('==============================================\n', 'green');

    log('Próximos pasos:', 'blue');
    log('1. Configura tu proyecto de Unreal Engine', 'yellow');
    log('   - Habilita el plugin de Pixel Streaming', 'yellow');
    log('   - Compila tu proyecto', 'yellow');

    log('\n2. Edita el archivo .env:', 'yellow');
    log('   UE_EXE_PATH=C:/Ruta/A/Tu/Proyecto.exe', 'green');

    log('\n3. Inicia el servidor:', 'yellow');
    log('   npm start', 'green');

    log('\n4. Abre el navegador:', 'yellow');
    log('   http://localhost\n', 'green');
}

main().catch(error => {
    console.error('Error durante el setup:', error);
    process.exit(1);
});
