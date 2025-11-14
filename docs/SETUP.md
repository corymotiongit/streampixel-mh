# Guía de Setup - MetaHuman Pixel Streaming

Esta guía te ayudará a configurar el entorno de Pixel Streaming para tu MetaHuman.

## Requisitos Previos

### Software Requerido

- **Node.js 14+** - [Descargar](https://nodejs.org/)
- **Git** - [Descargar](https://git-scm.com/)
- **Unreal Engine 5.x** con plugin de Pixel Streaming habilitado
- **PC con GPU NVIDIA** (recomendado para renderizado)

### Conocimientos Recomendados

- Uso básico de línea de comandos
- Conceptos básicos de Unreal Engine
- Nociones de redes (puertos, IP local/pública)

## Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd streampixel-mh
```

### 2. Ejecutar Setup Automático

```bash
npm run setup
```

Este script te guiará a través de:
- Verificación de Node.js
- Clonación de Pixel Streaming Infrastructure de Epic Games
- Instalación de dependencias
- Configuración de variables de entorno

### 3. Configurar Unreal Engine

#### 3.1. Habilitar Plugin de Pixel Streaming

1. Abre tu proyecto de Unreal Engine
2. Ve a **Edit → Plugins**
3. Busca "Pixel Streaming"
4. Marca la casilla para habilitarlo
5. Reinicia el editor

#### 3.2. Configurar el Proyecto

En **Project Settings → Pixel Streaming**:

- **Streamer Port**: 8888 (debe coincidir con `STREAMER_PORT` en `.env`)
- **Signaling Server URL**: `ws://127.0.0.1:80` (o tu configuración)

#### 3.3. Configurar el MetaHuman

1. Importa tu MetaHuman al proyecto (desde Quixel Bridge o MetaHuman Creator)
2. Agrega el MetaHuman a tu nivel
3. Configura la iluminación y cámara según tus necesidades
4. **Importante**: Habilita el audio input del MetaHuman para recibir audio del navegador

#### 3.4. Configurar Audio Bidireccional

Para que el MetaHuman reciba audio del micrófono del navegador:

1. En tu Blueprint del MetaHuman, agrega un nodo de **Pixel Streaming Audio Input**
2. Conecta la salida de audio a tu sistema de audio (ej: para lip sync o análisis de voz)
3. Puedes usar el plugin **Audio2Face** o sistemas custom de lip sync

Ejemplo en Blueprint:
```
[Pixel Streaming Audio Input] → [Audio Analyzer] → [MetaHuman Lip Sync]
```

#### 3.5. Compilar el Proyecto

1. Ve a **File → Package Project → Windows** (o tu plataforma)
2. Selecciona una carpeta de destino
3. Espera a que compile (puede tardar varios minutos)
4. Anota la ruta del ejecutable generado (ej: `MiProyecto/Binaries/Win64/MiProyecto.exe`)

### 4. Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto:

```env
# Ruta al servidor Cirrus (generalmente no necesitas cambiar esto)
CIRRUS_PATH=./PixelStreamingInfrastructure/SignallingWebServer

# Puertos
HTTP_PORT=80              # Puerto del frontend web
STREAMER_PORT=8888        # Puerto para conexión de UE

# ¡IMPORTANTE! Ruta al ejecutable compilado de Unreal Engine
UE_EXE_PATH=C:/Projects/MiMetaHuman/Binaries/Win64/MiMetaHuman.exe

# Argumentos de UE (no necesitas cambiar estos)
UE_ARGS=-RenderOffScreen -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888
```

### 5. Verificar la Configuración

Revisa que todo esté en orden:

- [ ] Node.js instalado (`node --version`)
- [ ] Repositorio de PixelStreamingInfrastructure clonado
- [ ] Dependencias de Cirrus instaladas (`npm install` en SignallingWebServer)
- [ ] Proyecto de UE compilado
- [ ] Ruta `UE_EXE_PATH` correcta en `.env`
- [ ] Puertos disponibles (80 y 8888 por defecto)

## Solución de Problemas

### Error: Puerto 80 en uso

Si el puerto 80 está ocupado, cámbialo en `.env`:

```env
HTTP_PORT=8080
CIRRUS_PORT=8080
```

Y actualiza la configuración del frontend si es necesario.

### Error: No se encuentra Cirrus

Asegúrate de que el repositorio de Pixel Streaming Infrastructure esté clonado:

```bash
git clone https://github.com/EpicGamesExt/PixelStreamingInfrastructure
cd PixelStreamingInfrastructure/SignallingWebServer
npm install
```

### UE no se conecta a Cirrus

Verifica que:
1. Cirrus esté corriendo (debería mostrar logs)
2. El puerto `STREAMER_PORT` en `.env` coincida con el configurado en UE
3. No haya firewall bloqueando las conexiones locales

### Audio del micrófono no funciona

1. Verifica que el navegador tenga permisos de micrófono
2. Asegúrate de hacer clic en "Activar Micrófono" en el frontend
3. En UE, confirma que estés capturando el audio input de Pixel Streaming

## Siguiente Paso

Una vez completado el setup, ve a [DEPLOY.md](./DEPLOY.md) para aprender a ejecutar y deployar tu aplicación.
