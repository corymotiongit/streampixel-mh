# Configuración de Unreal Engine para Pixel Streaming

Esta guía detalla cómo configurar tu proyecto de Unreal Engine para trabajar con Pixel Streaming y audio bidireccional.

## Requisitos del Proyecto

- Unreal Engine 5.0 o superior
- Plugin de Pixel Streaming (incluido con UE)
- MetaHuman (desde MetaHuman Creator o Quixel Bridge)

## Configuración Paso a Paso

### 1. Habilitar el Plugin de Pixel Streaming

1. Abre tu proyecto de Unreal Engine
2. Ve a **Edit → Plugins**
3. Busca "Pixel Streaming"
4. Marca la casilla para habilitarlo
5. **Reinicia el editor** cuando te lo pida

### 2. Configurar Project Settings

#### Pixel Streaming Settings

Ve a **Edit → Project Settings → Plugins → Pixel Streaming**:

```
✓ Enable Pixel Streaming: true
  Streamer Port: 8888
  Signaling Server URL: ws://127.0.0.1:80
✓ Start on Launch: false (lo iniciaremos manualmente)
```

#### Rendering Settings

**Project Settings → Engine → Rendering**:

Para mejor rendimiento en streaming:
```
Anti-Aliasing Method: FXAA o TAA
Default RHI: DirectX 11 o 12
✓ Forward Shading: true (recomendado)
```

#### Input Settings

**Project Settings → Engine → Input**:

Asegúrate de tener configurados los inputs que necesitas para tu MetaHuman, si aplica.

### 3. Configurar Audio Bidireccional

#### 3.1. Habilitar Audio Input

En **Project Settings → Plugins → Pixel Streaming**:

```
✓ Enable Audio Input: true
```

#### 3.2. Capturar Audio del Navegador

En tu nivel o Blueprint principal, agrega lógica para capturar el audio:

**Opción A: Blueprint**

1. Abre el Level Blueprint o Blueprint de tu MetaHuman
2. Agrega el nodo **Get Pixel Streaming Audio Input**
3. Conecta la salida a tu sistema de procesamiento de audio

```
[Event BeginPlay]
    |
    v
[Get Pixel Streaming Audio Input]
    |
    v
[Audio Analyzer / Your Audio Processing System]
```

**Opción B: C++ (Avanzado)**

```cpp
#include "PixelStreamingAudioComponent.h"

void AMyCharacter::BeginPlay()
{
    Super::BeginPlay();

    // Obtener componente de audio de Pixel Streaming
    UPixelStreamingAudioComponent* PSAudio =
        NewObject<UPixelStreamingAudioComponent>(this);

    if (PSAudio)
    {
        PSAudio->OnAudioReceived.AddDynamic(
            this,
            &AMyCharacter::OnBrowserAudioReceived
        );
    }
}

void AMyCharacter::OnBrowserAudioReceived(const TArray<float>& AudioData)
{
    // Procesar audio del navegador
    // Ej: enviar a sistema de lip sync
}
```

### 4. Configurar MetaHuman para Lip Sync

Para que el MetaHuman reaccione al audio del micrófono:

#### Usando Audio2Face o Similar

1. Instala un plugin de lip sync (ej: Audio2Face, OVRLipSync)
2. Conecta el audio input de Pixel Streaming al plugin
3. El plugin generará las animaciones faciales automáticamente

#### Ejemplo con Blueprint Simple

```
[Pixel Streaming Audio Input]
    |
    v
[Analyze Audio Volume/Frequency]
    |
    v
[Map to Morph Targets]
    |
    v
[MetaHuman Face Rig]
```

**Nodos útiles:**
- Get Audio Volume
- Get Audio Frequency Spectrum
- Set Morph Target
- Play Animation

### 5. Configurar la Escena

#### Iluminación Recomendada

Para MetaHumans se recomienda:
- **Directional Light** (sol) con intensidad 3-5
- **Sky Light** con HDRI para mejor realismo
- **Post Process Volume** con ajustes de color

#### Cámara

Configura una cámara fija o sistema de cámara:

```
[Camera Component]
  Field of View: 90
  Location: Frente al MetaHuman
  Rotation: Apuntando al rostro
```

Marca la cámara como activa para que sea la que se transmita.

### 6. Optimización de Rendimiento

#### Graphics Settings

Para mejor rendimiento en streaming:

**Scalability Settings:**
```
View Distance: Medium/High
Anti-Aliasing: Medium
Post Processing: Medium/High
Shadows: Medium
Textures: High
Effects: Medium
```

#### Pixel Streaming Codec

En **Project Settings → Pixel Streaming**:

```
Video Codec: H264 (mejor compatibilidad)
Max Bitrate: 5000-10000 kbps
Min Bitrate: 2000 kbps
Frame Rate: 30-60 FPS
Resolution: 1920x1080 o menor
```

### 7. Packaging (Compilación)

#### Windows

1. Ve a **File → Package Project → Windows → Windows (64-bit)**
2. Selecciona carpeta de destino
3. Espera a que compile (puede tardar 10-30 minutos)

**Configuraciones de Build:**
- Development: Para testing (más rápido)
- Shipping: Para producción (optimizado)

#### Configuraciones Adicionales

**Project Settings → Project → Packaging**:

```
Build Configuration: Shipping o Development
✓ Full Rebuild: true (primera vez)
✓ Compress Content: true
✓ Create compressed cooked packages: true
```

### 8. Argumentos de Línea de Comandos

El ejecutable compilado debe iniciarse con estos argumentos:

```bash
MiMetaHuman.exe -RenderOffScreen -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888
```

**Argumentos disponibles:**

- `-RenderOffScreen` - Renderiza sin mostrar ventana (headless)
- `-PixelStreamingIP=<IP>` - IP del servidor Cirrus
- `-PixelStreamingPort=<PORT>` - Puerto del servidor Cirrus
- `-AudioMixer` - Usar el nuevo audio mixer (recomendado)
- `-PixelStreamingEncoderTargetBitrate=<KBPS>` - Bitrate del video
- `-PixelStreamingEncoderMaxBitrate=<KBPS>` - Bitrate máximo

Ejemplo completo:
```bash
MiMetaHuman.exe \
  -RenderOffScreen \
  -AudioMixer \
  -PixelStreamingIP=127.0.0.1 \
  -PixelStreamingPort=8888 \
  -PixelStreamingEncoderTargetBitrate=5000 \
  -PixelStreamingEncoderMaxBitrate=10000
```

Actualiza estos argumentos en tu archivo `.env`:
```env
UE_ARGS=-RenderOffScreen -AudioMixer -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888
```

### 9. Testing en el Editor

Antes de compilar, puedes probar Pixel Streaming en el editor:

1. En el editor, ve a **Edit → Editor Preferences → Level Editor → Play**
2. Configura **Play Mode** como **Standalone Game**
3. Presiona **Alt+P** para jugar en modo standalone

En otra terminal, inicia Cirrus:
```bash
cd PixelStreamingInfrastructure/SignallingWebServer
node cirrus.js
```

Abre el navegador en `http://localhost` y deberías ver tu escena.

### 10. Troubleshooting

#### No se conecta a Cirrus

Revisa los logs de UE:
```
Saved/Logs/MyProject.log
```

Busca líneas como:
```
LogPixelStreaming: Connecting to signaling server ws://127.0.0.1:80...
LogPixelStreaming: Connected successfully
```

#### Audio no llega a UE

- Verifica que "Enable Audio Input" esté activado
- Revisa que el navegador tenga permisos de micrófono
- Comprueba que el audio input de Pixel Streaming esté conectado en Blueprint

#### Performance pobre

- Reduce la resolución de renderizado
- Baja la calidad de gráficos (scalability)
- Reduce el bitrate del video
- Asegúrate de usar GPU dedicada, no integrada

#### Latencia alta

- Verifica tu red local
- Reduce el buffer de audio
- Usa codec H264 en lugar de VP8/VP9
- Reduce la resolución del stream

## Recursos Adicionales

- [Documentación oficial de Pixel Streaming](https://docs.unrealengine.com/5.3/en-US/pixel-streaming-in-unreal-engine/)
- [MetaHuman Documentation](https://docs.metahuman.unrealengine.com/)
- [Audio2Face Plugin](https://www.nvidia.com/en-us/omniverse/apps/audio2face/)

## Próximos Pasos

Una vez configurado y compilado tu proyecto:

1. Actualiza `UE_EXE_PATH` en `.env`
2. Ejecuta `npm start`
3. Abre el navegador en `http://localhost`
4. ¡Disfruta de tu MetaHuman en streaming!
