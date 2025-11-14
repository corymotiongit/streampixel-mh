# StreamPixel-MH

Servidor local de Pixel Streaming para deployar MetaHumans de Unreal Engine vía web. Incluye servidor de señalización Cirrus customizado, frontend embebible y scripts de automatización.

## 🚀 Características

- **Stream Remoto**: Visualiza MetaHumans renderizados en tiempo real desde Unreal Engine
- **Audio Bidireccional**: Input de micrófono del usuario → Unreal Engine en tiempo real
- **WebRTC**: Conexión peer-to-peer de baja latencia con video y audio
- **Frontend Embebible**: Interfaz HTML/JS lista para demos y producciones
- **Automatización**: Scripts para inicio/apagado automático del servidor
- **Multiplataforma**: Funciona en Windows, Linux y macOS

## 📋 Requisitos

- **Node.js** 14.0.0 o superior
- **Unreal Engine** con Pixel Streaming Plugin habilitado
- Navegador moderno con soporte WebRTC (Chrome, Firefox, Edge)

## 🛠️ Instalación

1. **Clonar el repositorio**:
```bash
git clone https://github.com/corymotiongit/streampixel-mh.git
cd streampixel-mh
```

2. **Instalar dependencias**:
```bash
npm install
```

## 🎮 Uso

### Inicio Rápido

**Linux/macOS**:
```bash
./start.sh [puerto]
# Ejemplo: ./start.sh 8080
```

**Windows**:
```cmd
start.bat [puerto]
# Ejemplo: start.bat 8080
```

Si no se especifica puerto, usa el configurado en `config.json` (puerto 80 por defecto).

**Nota**: Los puertos < 1024 requieren permisos de administrador (sudo en Linux/macOS).

### Detener el Servidor

**Linux/macOS**:
```bash
./stop.sh
```

**Windows**:
```cmd
stop.bat
```

O simplemente presiona `Ctrl+C` en la terminal donde corre el servidor.

### Inicio Manual

```bash
node cirrus.js [opciones]
```

**Opciones**:
- `--HttpPort [puerto]`: Puerto HTTP/WebSocket (default: 80)
- `--StreamerPort [puerto]`: Puerto para streamer UE (default: 8888)
- `--debug`: Activa logs verbosos

## ⚙️ Configuración

Edita `config.json` para personalizar el servidor:

```json
{
  "HttpPort": 80,              // Puerto del servidor web
  "StreamerPort": 8888,        // Puerto para UE streamer
  "MaxPlayerCount": -1,        // Max jugadores (-1 = ilimitado)
  "peerConnectionOptions": {
    "iceServers": [            // Servidores STUN/TURN
      {
        "urls": ["stun:stun.l.google.com:19302"]
      }
    ]
  },
  "LogToFile": true,           // Guardar logs en archivos
  "HomepageFile": "player.html", // Página principal
  "LogVerbose": true           // Logs detallados
}
```

## 🎨 Configuración de Unreal Engine

1. **Habilitar Pixel Streaming Plugin**:
   - Editor → Edit → Plugins → buscar "Pixel Streaming"
   - Activar y reiniciar el editor

2. **Configurar el Proyecto**:
   - Project Settings → Pixel Streaming
   - Streamer Port: 8888 (debe coincidir con config.json)
   - Signaling Server URL: `ws://localhost:80/ws` (ajusta según tu config)

3. **Empaquetar el Proyecto**:
   - File → Package Project → Windows/Linux
   - En los argumentos de línea de comando al ejecutar:
     ```
     -PixelStreamingIP=localhost -PixelStreamingPort=8888 -RenderOffScreen
     ```

4. **Ejecutar el Streamer**:
   ```bash
   # Linux
   ./YourProject.sh -PixelStreamingIP=localhost -PixelStreamingPort=8888 -RenderOffScreen

   # Windows
   YourProject.exe -PixelStreamingIP=localhost -PixelStreamingPort=8888 -RenderOffScreen
   ```

## 🌐 Acceso al Frontend

Una vez el servidor esté corriendo:

1. Abre tu navegador en: `http://localhost:80` (o el puerto configurado)
2. Asegúrate de que Unreal Engine esté ejecutándose con Pixel Streaming
3. Haz click en "Conectar" en la interfaz web
4. Permite el acceso al micrófono si deseas audio bidireccional

## 📁 Estructura del Proyecto

```
streampixel-mh/
├── cirrus.js           # Servidor de señalización WebSocket
├── config.json         # Configuración del servidor
├── package.json        # Dependencias Node.js
├── start.sh           # Script de inicio (Linux/macOS)
├── start.bat          # Script de inicio (Windows)
├── stop.sh            # Script de detención (Linux/macOS)
├── stop.bat           # Script de detención (Windows)
├── public/            # Frontend web
│   ├── index.html     # Redirección
│   ├── player.html    # Interfaz principal
│   ├── app.js         # Cliente WebRTC
│   └── style.css      # Estilos
└── logs/              # Logs del servidor (generados)
```

## 🔧 Troubleshooting

### El servidor no inicia
- Verifica que Node.js esté instalado: `node --version`
- Verifica que el puerto no esté en uso
- Para puertos < 1024, ejecuta con sudo (Linux/macOS)

### Unreal Engine no se conecta
- Verifica que los puertos coincidan entre config.json y UE
- Asegúrate de que el firewall permita las conexiones
- Revisa los logs en `logs/cirrus-[fecha].log`

### No se ve video en el navegador
- Verifica que UE esté ejecutándose con `-PixelStreamingIP` y `-PixelStreamingPort`
- Abre la consola del navegador (F12) para ver errores
- Asegúrate de que el navegador soporte WebRTC

### Audio no funciona
- Permite permisos de micrófono en el navegador
- Verifica que UE tenga configurado el audio input
- Revisa la configuración de audio en el sistema operativo

## 📊 Estadísticas y Monitoreo

El frontend muestra en tiempo real:
- **Estado de conexión**: Conectado/Desconectado
- **Latencia**: Tiempo de respuesta en ms
- **Bitrate**: Tasa de bits en kbps

Los logs del servidor se guardan automáticamente en `logs/` si `LogToFile` está habilitado en config.json.

## 🔒 Seguridad

Para producción se recomienda:
- Usar HTTPS/WSS (configura certificados SSL)
- Implementar autenticación de usuarios
- Configurar TURN servers propios para NAT traversal
- Limitar `MaxPlayerCount` según capacidad del servidor

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

MIT License - ver archivo LICENSE para más detalles

## 🙏 Agradecimientos

Basado en el Pixel Streaming Plugin de Epic Games para Unreal Engine.

---

**Stack Tecnológico**:
- Unreal Engine (Pixel Streaming Plugin)
- Node.js + Express (Servidor web)
- WebSocket (ws) (Señalización)
- WebRTC (Streaming peer-to-peer)
- HTML5/CSS3/JavaScript (Frontend)
