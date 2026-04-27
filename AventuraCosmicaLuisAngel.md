# Aventura Cósmica - Luis Ángel 🌌

## Contexto del proyecto
Juego interactivo tipo aventura de texto/visual como regalo de cumpleaños para Luis Ángel (cumpleaños: lunes 27 de abril de 2026). Se le dará una tarjeta con un código QR que abrirá este juego. Temática de **Super Mario Galaxy** — cosmos, estrellas, planetas — con tono divertido, emocionante y fantástico.

El reveal sorpresa final es una **entrada a la Sinfonía de Super Mario Galaxy** en el Teatro Pablo de Villavicencio, Culiacán, Sinaloa, el **sábado 16 de mayo a las 4:00 PM**. Zona: Mezannine, Asiento S-21.

---

## Tecnología
- Tres archivos: `index.html`, `style.css`, `game.js` + carpeta `src/` para audios
- Se prueba en local con **XAMPP** → `http://localhost/AventuraCosmica/`
- Al terminar, se sube a **GitHub Pages** para obtener la URL del QR

---

## Archivos de audio (todos en `src/`)
| Nombre de archivo | Fase donde se usa |
|---|---|
| `Gusty Garden Galaxy - Super Mario Galaxy.mp3` | Fase 1 — Intro |
| `Good Egg Galaxy - Super Mario Galaxy.mp3` | Fase 2 — Quiz Galáctico |
| `Honeyhive Galaxy - Super Mario Galaxy.mp3` | Fase 3 — Minijuegos (música general) |
| `Big Bad Bugaboom - Super Mario Galaxy.mp3` | Fase 3 — Reto especial Lumas (modo challenge) |
| `Final Grand Star - Super Mario Galaxy.mp3` | Fase 3 → 5 — Transición Grand Star (se reproduce una vez) |
| `Dawn A New Morning - Super Mario Galaxy.mp3` | Fase 5 — Créditos |
| `Birth - Super Mario Galaxy.mp3` | Fase 6 — Reveal (intro cinemática, una vez) |
| `Birth - Super Mario Galaxy extract.m4a` | Fase 6 — Reveal (loop del extracto tras la intro) |
| `Family - Super Mario Galaxy.mp3` | Fase 7 — Pantalla final |

---

## Arquitectura del código

### Módulos en `game.js`
| Módulo | Responsabilidad |
|---|---|
| `FXManager` | Efectos en canvas: partículas, anillos, flash, estrellas fugaces, warp, Grand Star |
| `StarsCanvas` | Animación de estrellas parpadeantes en canvas de fondo |
| `AudioManager` | Reproducción, fadeOut, swap, playThen y loop personalizado |
| `TypeWriter` | Efecto de escritura letra a letra (generation counter anti-concurrencia) |
| `UI` | Cache de elementos DOM + métodos de manipulación de interfaz |
| `GameState` | Constantes de estados: INTRO, QUIZ, LOVE, MINIGAMES, CREDITS, REVEAL, FINALE |
| `Phases` | Datos y lógica de cada fase (State Machine data-driven) |
| `ConstellationGame` | Minijuego 1: conecta estrellas numeradas en orden, esquiva impostoras |
| `LumaGame` | Minijuego 2: atrapa Lumas flotantes en 20s, con reto bonus si las atrapas todas |
| `NaveGame` | Minijuego 3: esquiva meteoros con el dedo/mouse, pide ayuda capturando Lumas |
| `AssetLoader` | Precarga todos los audios antes de mostrar el botón de inicio |
| `Game` | Máquina de estados central: `go()`, `skipTo()`, `addStar()` |

### Patrones aplicados
- **State Machine** — `Game.go(newState)` controla transiciones, llama `onExit` + `onEnter`
- **Data-driven phases** — cada fase es un objeto con `tag`, `music`, `onEnter()`, `onExit()`
- **Module pattern** — responsabilidades separadas por módulo (objeto literal)
- **DOM caching** — `UI.init()` cachea todos los elementos al arrancar
- **Generation counter** — TypeWriter usa `_gen` para cancelar cadenas de escritura concurrentes

---

## Estructura del juego — TODAS LAS FASES COMPLETAS ✅

### Pantalla de inicio ✅
- Botón "✦ Comenzar aventura ✦" oculto mientras carga; `AssetLoader` precarga todos los audios
- `#loadingMessage` visible durante la precarga; se oculta al terminar
- Al dar clic: intenta bloquear orientación landscape + solicita fullscreen, luego fade out y arranca

### Fase 1 — Intro cinemática ✅
- Música: `Gusty Garden Galaxy`
- Logo dorado + subtítulo azul con fade-in escalonado
- 5 escenas de texto con TypeWriter, botón "Continuar ›" entre cada una
- Última escena: botón dorado "¡Estoy listo! ★" con animación Stellar Pulse
- Al pulsar: fade out audio + FXManager.play() (flash + anillos + partículas) → pasa a Quiz

### Fase 2 — Quiz Galáctico ✅
- Música: `Good Egg Galaxy` (swap desde Fase 1)
- 5 preguntas sobre SMG y sobre Leslie en grilla 2×2:
  1. Guardiana del Observatorio Cometa → Rosalina
  2. Criatura estrella de Mario → Luma
  3. Base espacial de Rosalina → Observatorio Cometa
  4. Villano principal → Bowser
  5. Qué recolecta Mario → Estrella de Poder
- Correcto: +1 estrella. Incorrecto: shake rojo, revela correcta

### Fase 3 — Reto de Amor ✅
- Sin música propia (continúa la del Quiz)
- 3 preguntas personales sobre Leslie:
  1. Fecha de nacimiento (1997-04-27) — con segunda oportunidad si falla
  2. Comida favorita → Tacos
  3. Color favorito → Azul
- Respuestas correctas acumulan "estrellas secretas" (no visibles en barra)
- Mensaje final varía según cuántas acertó (0, 1-2, o 3)
- Al terminar: botón "¡Vamos allá! ✦" → FXManager.playWarp() → Minijuegos

### Fase 4 — Minijuegos Galácticos ✅
- Música: `Honeyhive Galaxy`
- **Minijuego 1: Constelación del Amor** — Conecta 5 estrellas numeradas en orden (1→5), esquiva 3 impostoras (★) que congelan 1.5s si las tocas. Al completar: ♥ en el centro + estrella secreta.
- **Minijuego 2: Atrapa las Lumas** — 20 Lumas flotan 20 segundos. Si las atrapas todas con 5s+ restantes: reto bonus (25 Lumas rápidas con `Big Bad Bugaboom`). Cada Luma atrapada = +1 estrella.
- **Minijuego 3: Nave Estelar** — Mueve nave con dedo/mouse, esquiva meteoros 60s. Al bajar de 50% HP: aparece tutorial de Lumas. Cada 3 Lumas capturadas: diálogo de amor con 3 opciones que restauran HP (40/70/100%). Safety net a 14% HP.
- Al sobrevivir: `FXManager.playGrandStar()` (3 actos: tensión 2.8s + explosión + reveal) → overlay "FINAL GRAND STAR"

### Fase 5 — Créditos ✅
- Música: `Dawn A New Morning` (fade in tras Grand Star)
- Lista de 12 créditos con animación staggered (cada 2.5s desde los 10s)
- Dedicatoria final: "Para Luis Ángel — el cosmonauta favorito del cosmos ✦"
- Fade out y texto puente → "El universo tiene una última sorpresa para ti"

### Fase 6 — Reveal del boleto ✅
- Música: `Birth` (una vez) → loop de `Birth extract.m4a`
- Sección cinemática: "Bienvenido Luis Ángel, bienvenida a una nueva galaxia" + "★ GALAXIA LESLIE ★" (aparece tenue → brilla)
- Cometas decorativos (6 en oleadas durante ~10s)
- Boleto CSS con datos reales: Teatro Pablo de Villavicencio · Sábado 16 Mayo · 4:00 PM · Mezannine S-21
- Botón "Ver mensaje de Leslie ✦" → layout split: boleto izquierda + mensaje derecha
- Mensaje completo de Leslie escrito con TypeWriter
- En móvil (≤620px): layout se apila verticalmente

### Fase 7 — Pantalla final ✅
- Música: `Family` (swap)
- "Feliz cumpleaños, Luis Ángel 💜" — aparece con pulso dorado a los 1.2s
- Frase del cosmos — aparece a los 11.5s
- "Gracias por estar aquí" — aparece a los 18s como eco lejano

---

## Soporte móvil ✅
- `#orientationOverlay` — aparece en portrait ≤ 950px, pide rotar pantalla
- Media query `max-height: 500px` — compacta layout para landscape móvil
- `AssetLoader` — precarga audio antes del inicio para evitar silencios
- `screen.orientation.lock('landscape')` + `requestFullscreen()` al pulsar "Comenzar"
- Controles de `NaveGame` con Pointer Events (touch + mouse)
- Lumas con área de clic sin clip-path (más fácil de tocar en móvil)

---

## Sistema de estrellas ⭐
- Barra fija en esquina superior derecha (aparece al terminar Fase 1)
- Se acumulan en: Quiz (5 max) + Retos del Amor (3 max) + Constelación (1) + Lumas (por cada una atrapada)
- No hay pantalla de trofeo final explícita; la barra permanece visible

---

## Estilo visual
- Fondo negro espacial con estrellas parpadeantes animadas (canvas)
- Planetas flotantes decorativos: azul, morado, naranja
- Paleta: dorado `#f7c948`, púrpura `#9b6fd4`, azul claro `#aad4f5`, lavanda `#e8e0ff`
- Fuente: **Fredoka One** en todo el sitio
- Cuadros de texto: fondo `rgba(10,5,30,0.72)` con borde púrpura sutil
- Botones: relleno galaxia al hover (scaleX transform)

---

## Pendientes
- [ ] Subir a **GitHub Pages** para generar la URL del QR
- [ ] Probar en dispositivo móvil real (especialmente minijuegos con touch)
- [x] Quitar `#devPanel` de `index.html` antes de publicar

---

## Historial de sesiones

### Sesión 1 — 25 abril 2026
- Se definió concepto, estructura y estilo visual completo
- Se construyó la Fase 1 completa
- Decisión: audio se prueba en local, se hostea en GitHub Pages al final

### Sesión 2 — 25 abril 2026
- Refactorización completa: State Machine, Data-driven, Modules, 3 archivos separados
- Bugfixes: TypeWriter generation counter, AudioManager interval, StarsCanvas flag, UI caching
- Fase 2 (Quiz Galáctico) completa
- Pantalla de inicio con gate de interacción para audio autoplay

### Sesión 3 — 25 abril 2026
- Unificación de fuentes a Fredoka One
- Botón dorado "¡Estoy listo! ★" con Stellar Pulse + FXManager
- Transición cinemática Luma Burst + estrellas fugaces
- Quiz personalizado con preguntas sobre Leslie

### Sesión 4 — 27 abril 2026
- Fase 3 (Reto de Amor): 3 preguntas personales, segunda oportunidad en fecha de cumpleaños
- Fase 4 (Minijuegos): Constelación del Amor + Atrapa Lumas + Nave Estelar completos
- Fase 5 (Créditos): lista animada + dedicatoria
- Fase 6 (Reveal): animación cinemática + boleto CSS + mensaje de Leslie + layout split para móvil
- Fase 7 (Final): pantalla de cierre con pulso dorado
- Soporte móvil: AssetLoader, orientationOverlay, media queries, fullscreen/lock orientation
- Todos los nombres de audio confirmados
- Bugfix: elementos `#loadingMessage` y `#orientationOverlay` añadidos a `index.html`
