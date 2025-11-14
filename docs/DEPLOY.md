# Guía de Deploy - MetaHuman Pixel Streaming

Esta guía explica cómo ejecutar y deployar tu aplicación de Pixel Streaming.

## Ejecución Local

### Iniciar Todo Automáticamente

```bash
npm start
```

Este comando:
1. Inicia el servidor Cirrus (signaling server)
2. Espera a que Cirrus esté listo
3. Inicia el ejecutable de Unreal Engine (si está configurado)
4. Monitorea el estado de ambos procesos

### Logs

Durante la ejecución verás logs de ambos procesos:

```
[HH:MM:SS] === Iniciando Pixel Streaming ===
[HH:MM:SS] Iniciando servidor Cirrus...
[HH:MM:SS] [Cirrus] Server listening on port 80
[HH:MM:SS] Servidor Cirrus iniciado
[HH:MM:SS] Cirrus está listo
[HH:MM:SS] Iniciando Unreal Engine...
[HH:MM:SS] [UE] LogPixelStreaming: Connecting to signaling server...
[HH:MM:SS] === Sistema iniciado correctamente ===
[HH:MM:SS] Frontend disponible en: http://localhost:80
```

### Detener Todo

```bash
npm stop
```

O simplemente presiona `Ctrl+C` en la terminal donde ejecutaste `npm start`.

### Inicio Manual (Alternativa)

Si prefieres controlar cada proceso por separado:

#### 1. Iniciar Cirrus

```bash
cd PixelStreamingInfrastructure/SignallingWebServer
node cirrus.js --HttpPort 80 --StreamerPort 8888
```

#### 2. Iniciar Unreal Engine

En otra terminal:

```bash
# Windows
"C:/Projects/MiMetaHuman/Binaries/Win64/MiMetaHuman.exe" -RenderOffScreen -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888

# Linux
./MiMetaHuman/Binaries/Linux/MiMetaHuman -RenderOffScreen -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888
```

## Acceso al Frontend

Una vez que todo esté corriendo:

1. Abre tu navegador
2. Ve a `http://localhost` (o el puerto que configuraste)
3. Espera a que se establezca la conexión
4. Haz clic en "Activar Micrófono" para habilitar audio bidireccional

## Deploy en Red Local (LAN)

Para acceder desde otros dispositivos en tu red local:

### 1. Obtén tu IP Local

**Windows:**
```bash
ipconfig
# Busca "IPv4 Address" en tu adaptador de red
```

**Linux/Mac:**
```bash
ip addr show
# o
ifconfig
```

### 2. Configura el Firewall

Permite las conexiones entrantes en los puertos:
- Puerto HTTP (80 por defecto)
- Puerto Streamer (8888 por defecto)

**Windows:**
```bash
netsh advfirewall firewall add rule name="Pixel Streaming HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Pixel Streaming Streamer" dir=in action=allow protocol=TCP localport=8888
```

**Linux:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 8888/tcp
```

### 3. Accede desde Otros Dispositivos

Desde cualquier dispositivo en la misma red, abre:
```
http://<TU_IP_LOCAL>
```

Ejemplo: `http://192.168.1.100`

## Deploy Público (Internet)

Para acceder desde internet, necesitas:

### 1. IP Pública o DDNS

**Opción A: IP Pública Fija**
- Contrata una IP fija con tu ISP
- Configura port forwarding en tu router

**Opción B: DDNS (Recomendado)**
- Regístrate en un servicio DDNS gratuito (ej: No-IP, DuckDNS)
- Configura tu router para actualizar la IP automáticamente
- Obtendrás un dominio como: `mimetahuman.ddns.net`

### 2. Port Forwarding en el Router

Configura tu router para redirigir:
- Puerto externo **80** → Puerto interno **80** (IP de tu PC)
- Puerto externo **8888** → Puerto interno **8888** (IP de tu PC)

**Pasos generales:**
1. Accede a la interfaz de tu router (generalmente `192.168.1.1` o `192.168.0.1`)
2. Busca "Port Forwarding" o "NAT"
3. Agrega reglas para los puertos 80 y 8888
4. Asigna la IP local de tu PC servidor

### 3. Configurar HTTPS (Opcional pero Recomendado)

Los navegadores modernos requieren HTTPS para acceder a micrófono/cámara desde dominios públicos.

#### Opción 1: Cloudflare Tunnel (Más Fácil)

1. Crea una cuenta en [Cloudflare](https://www.cloudflare.com/)
2. Instala `cloudflared`
3. Crea un túnel:
```bash
cloudflared tunnel create metahuman
cloudflared tunnel route dns metahuman mimetahuman.tudominio.com
```
4. Ejecuta el túnel:
```bash
cloudflared tunnel run metahuman
```

#### Opción 2: Let's Encrypt + Nginx

Más complejo pero con más control. Ver [documentación de Nginx](https://nginx.org/en/docs/).

### 4. Actualizar Frontend

Si usas HTTPS o un dominio custom, actualiza `frontend/index.html`:

```javascript
window.SIGNALING_SERVER = 'mimetahuman.tudominio.com';
window.USE_SSL = true;
```

## Embeber en un Sitio Web

El frontend está diseñado para ser embebido en iframes:

```html
<iframe
    src="http://localhost/frontend/"
    width="100%"
    height="600px"
    frameborder="0"
    allow="microphone"
></iframe>
```

**Importante:** El atributo `allow="microphone"` es necesario para que funcione el micrófono.

## Automatización con Systemd (Linux)

Para que el servicio inicie automáticamente en Linux:

### 1. Crear Servicio

Crea `/etc/systemd/system/metahuman-streaming.service`:

```ini
[Unit]
Description=MetaHuman Pixel Streaming
After=network.target

[Service]
Type=simple
User=tuusuario
WorkingDirectory=/ruta/a/streampixel-mh
ExecStart=/usr/bin/node scripts/start.js
ExecStop=/usr/bin/node scripts/stop.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Habilitar y Ejecutar

```bash
sudo systemctl daemon-reload
sudo systemctl enable metahuman-streaming
sudo systemctl start metahuman-streaming
```

### 3. Verificar Estado

```bash
sudo systemctl status metahuman-streaming
```

## Automatización con Task Scheduler (Windows)

1. Abre **Task Scheduler**
2. Crea nueva tarea básica
3. Trigger: Al iniciar el sistema
4. Acción: Iniciar programa
   - Programa: `node`
   - Argumentos: `scripts/start.js`
   - Directorio: `C:\ruta\a\streampixel-mh`

## Monitoreo y Logs

### Ver Estado en Tiempo Real

Los scripts muestran el estado de conexión en consola. Para logging más avanzado:

```bash
npm start > logs/app.log 2>&1
```

### Archivos de PID

Cuando el sistema está corriendo, se crea `scripts/.pids.json` con los IDs de proceso:

```json
{
  "cirrus": 12345,
  "ue": 67890,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Solución de Problemas

### No se puede conectar desde internet

1. Verifica que el port forwarding esté configurado correctamente
2. Verifica tu IP pública: `curl ifconfig.me`
3. Prueba la conectividad: `telnet tu-ip-publica 80`
4. Revisa logs del firewall

### Conexión lenta o video entrecortado

1. Aumenta el bitrate en la configuración de Pixel Streaming de UE
2. Reduce la resolución de renderizado
3. Verifica el ancho de banda de tu conexión de internet
4. Considera usar un servidor más cercano al usuario

### Audio no funciona en HTTPS

El navegador requiere permisos especiales. Asegúrate de:
1. Usar HTTPS (no HTTP)
2. Tener certificado SSL válido
3. Tener el atributo `allow="microphone"` en el iframe (si aplica)

## Optimizaciones de Rendimiento

### Configuración de Unreal Engine

En tu proyecto de UE, ajusta estas settings para mejor rendimiento:

**Project Settings → Engine → Rendering:**
- Forward Shading: Enabled
- Default RHI: DX11 o DX12
- Anti-Aliasing Method: FXAA

**Pixel Streaming Settings:**
- Video Codec: H264 (mejor compatibilidad) o VP8/VP9
- Max Bitrate: 5000-10000 kbps
- Min Bitrate: 2000 kbps

### Hardware

Para mejor experiencia:
- GPU NVIDIA GTX 1060 o superior (recomendado RTX 2060+)
- 16GB RAM mínimo
- CPU: Intel i5/AMD Ryzen 5 o superior
- Conexión de internet: 10 Mbps upload mínimo

## Siguiente Paso

Para personalizar aún más el frontend, revisa el código en `frontend/` y la [documentación oficial de Pixel Streaming](https://docs.unrealengine.com/5.3/en-US/pixel-streaming-in-unreal-engine/).
