# MetaHuman Pixel Streaming

Servidor local de Pixel Streaming simplificado para deployar MetaHumans de Unreal Engine vía web con audio bidireccional.

## Características

- **Frontend Minimalista** - Interfaz web simple con solo video y botón de micrófono
- **Audio Bidireccional** - Captura de micrófono del navegador hacia Unreal Engine
- **Automatización Completa** - Scripts para iniciar/detener Cirrus + UE automáticamente
- **Configuración Simple** - Variables de entorno para fácil customización
- **Embebible** - Diseñado para ser usado en iframes
- **Un Solo Usuario** - Optimizado para demos y presentaciones

## Estructura del Proyecto

```
streampixel-mh/
├── frontend/           # Cliente web minimalista
│   ├── index.html      # Página principal
│   ├── css/
│   │   └── styles.css  # Estilos minimalistas
│   └── js/
│       └── app.js      # Lógica de Pixel Streaming + WebRTC
├── scripts/            # Scripts de automatización
│   ├── start.js        # Iniciar Cirrus + UE
│   ├── stop.js         # Detener todos los procesos
│   └── setup.js        # Configuración inicial
├── docs/               # Documentación
│   ├── SETUP.md        # Guía de instalación
│   └── DEPLOY.md       # Guía de deployment
├── .env.example        # Variables de entorno (template)
└── package.json        # Configuración npm
```

## Quick Start

### 1. Setup Inicial

```bash
# Instalar dependencias y configurar
npm run setup
```

Este comando te guiará a través de:
- Clonación de Pixel Streaming Infrastructure de Epic Games
- Instalación de dependencias
- Configuración de variables de entorno

### 2. Configurar Unreal Engine

Edita `.env` y configura la ruta a tu ejecutable de UE:

```env
UE_EXE_PATH=C:/Projects/MiMetaHuman/Binaries/Win64/MiMetaHuman.exe
```

Ver [docs/SETUP.md](docs/SETUP.md) para instrucciones detalladas de configuración de Unreal Engine.

### 3. Iniciar Todo

```bash
npm start
```

Esto iniciará:
1. Servidor Cirrus (signaling server)
2. Tu aplicación de Unreal Engine
3. Monitoreo automático de procesos

### 4. Acceder al Frontend

Abre tu navegador en:
```
http://localhost
```

### 5. Detener Todo

```bash
npm stop
```

O simplemente presiona `Ctrl+C` en la terminal.

## Requisitos

### Software

- **Node.js 14+** - [Descargar](https://nodejs.org/)
- **Unreal Engine 5.x** - Con plugin de Pixel Streaming habilitado
- **Git** - Para clonar dependencias

### Hardware

- **GPU NVIDIA** - GTX 1060 o superior (recomendado RTX 2060+)
- **16GB RAM** - Mínimo
- **CPU** - Intel i5 / AMD Ryzen 5 o superior

### Red

- **Puerto 80** - Frontend web (configurable)
- **Puerto 8888** - Conexión Streamer UE (configurable)

## Configuración de Unreal Engine

Para que tu MetaHuman funcione con Pixel Streaming:

### 1. Habilitar Plugin

En tu proyecto de UE:
- **Edit → Plugins**
- Buscar "Pixel Streaming"
- Habilitar y reiniciar

### 2. Configurar Audio Input

Para recibir audio del micrófono del navegador, en tu Blueprint:

```
[Pixel Streaming Audio Input] → [Tu Sistema de Audio]
```

Esto permite:
- Lip sync en tiempo real
- Análisis de voz
- Interacción por voz con el MetaHuman

### 3. Compilar

- **File → Package Project → [Tu Plataforma]**
- Anotar la ruta del ejecutable generado
- Actualizar `UE_EXE_PATH` en `.env`

## Configuración Avanzada

### Variables de Entorno

Edita `.env` para personalizar:

```env
# Puertos
HTTP_PORT=80                # Frontend web
STREAMER_PORT=8888          # Conexión UE

# Rutas
CIRRUS_PATH=./PixelStreamingInfrastructure/SignallingWebServer
UE_EXE_PATH=                # Ruta a tu .exe de UE

# Argumentos de UE
UE_ARGS=-RenderOffScreen -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888
```

### Customizar Frontend

El frontend es simple y fácil de modificar:

- **HTML**: `frontend/index.html`
- **CSS**: `frontend/css/styles.css`
- **JavaScript**: `frontend/js/app.js`

Puedes agregar:
- Controles custom
- Branding
- Lógica de negocio adicional
- Integración con otros sistemas

### Embeber en tu Sitio

```html
<iframe
    src="http://localhost/frontend/"
    width="100%"
    height="600px"
    frameborder="0"
    allow="microphone"
></iframe>
```

## Documentación

- **[SETUP.md](docs/SETUP.md)** - Guía completa de instalación y configuración
- **[DEPLOY.md](docs/DEPLOY.md)** - Deployment local, LAN y público

## Arquitectura

```
┌─────────────┐         WebSocket (WS/WSS)         ┌─────────────┐
│             │◄──────────────────────────────────►│             │
│  Navegador  │                                     │   Cirrus    │
│  (Cliente)  │         WebRTC (Video/Audio)        │  Signaling  │
│             │◄────────────────────────────────────┤   Server    │
└─────────────┘                │                    └─────────────┘
                               │                           │
                               │                           │
                               │    Custom Protocol        │
                               └──────────────────────────►│
                                                            │
                                                    ┌───────▼──────┐
                                                    │   Unreal     │
                                                    │   Engine     │
                                                    │ (MetaHuman)  │
                                                    └──────────────┘
```

1. El navegador se conecta al servidor Cirrus vía WebSocket
2. Cirrus negocia la conexión WebRTC entre navegador y UE
3. Stream de video/audio fluye directamente (P2P) entre navegador y UE
4. El audio del micrófono del navegador se envía a UE para procesamiento

## Solución de Problemas

### Puerto 80 en uso

Cambia el puerto en `.env`:
```env
HTTP_PORT=8080
```

### UE no se conecta

Verifica:
- Cirrus está corriendo
- Puertos coinciden entre `.env` y configuración de UE
- Firewall no bloquea las conexiones

### Audio no funciona

- Habilita permisos de micrófono en el navegador
- Haz clic en "Activar Micrófono" en el frontend
- Verifica que UE esté capturando el audio input de Pixel Streaming

Ver más en [docs/DEPLOY.md](docs/DEPLOY.md#solución-de-problemas)

## Contribuir

Este es un proyecto simplificado para uso personal/demo. Si quieres agregar features:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Abre un Pull Request

## Recursos

- [Pixel Streaming Infrastructure (Epic Games)](https://github.com/EpicGamesExt/PixelStreamingInfrastructure)
- [Documentación oficial de Pixel Streaming](https://docs.unrealengine.com/5.3/en-US/pixel-streaming-in-unreal-engine/)
- [MetaHuman Creator](https://www.unrealengine.com/en-US/metahuman)

## Licencia

MIT

## Soporte

Para issues o preguntas, abre un issue en este repositorio o consulta la documentación en `docs/`. 
