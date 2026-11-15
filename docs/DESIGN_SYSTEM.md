# Sistema de Diseno UI/UX y Arquitectura de Informacion — ConsejoScout

Documento de especificacion tecnica y visual para la aplicacion web progresiva (PWA) mobile-first **ConsejoScout**, asistente operativo y normativo para Jefes de Grupo de Scouts de Argentina Asociacion Civil (SAAC).

Regla transversal de producto: queda estrictamente prohibido el uso de emojis en codigo, textos de interfaz, plantillas de documentos generados, notificaciones y documentacion. Toda comunicacion visual no textual se resuelve mediante iconografia oficial de `lucide-react` y etiquetas de texto explicitas.

---

## 1. Principios de Diseno y Contexto de Uso

### 1.1 Contexto Dual de Operacion
1. **Contexto Escritorio / Reunion de Consejo:** Analisis de indicadores del Grupo, redaccion de actas, planificacion de salidas y revision de normativa en laptop, tablet o desktop.
2. **Contexto Patio / Campamento (Prioritario):** Operacion en exteriores bajo luz solar directa, conectividad intermitente y uso con una sola mano en telefono movil.

### 1.2 Reglas Estructurales de Usabilidad
- **Zona de Pulgar (Thumb-Zone First):** En pantallas menores a `768px`, la navegacion principal y las acciones primarias de confirmacion residen en el tercio inferior de la pantalla.
- **Objetivos Tactiles:** Todo elemento interactivo (botones, pestanas, chips de filtro, casillas de verificacion, enlaces de tarjeta, botones de cierre) debe cumplir un area tactil minima de `44px x 44px` (`min-h-[44px] min-w-[44px]`). Los botones de accion primaria y steppers en campo deben medir `48px` de altura (`h-12`).
- **Separacion entre Objetivos Tactiles:** Minimo `8px` (`gap-2`) entre controles adyacentes para evitar toques accidentales.
- **Alto Contraste (WCAG AA/AAA):** Texto principal con ratio superior a `15:1`, texto secundario superior a `7:1` y estados de semaforo con doble codificacion (color + icono `lucide-react` + etiqueta textual). Nunca transmitir un estado critico unicamente mediante color.
- **Resiliencia Offline:** Indicadores persistentes de estado de conexion y disponibilidad de datos locales sin bloquear la lectura ni la redaccion.

---

## 2. Tokens de Diseno (Design Tokens)

### 2.1 Paleta de Colores Institucional y Funcional

Todos los pares texto/fondo han sido seleccionados para superar WCAG AA (`>= 4.5:1` en texto normal, `>= 3:1` en texto grande y bordes de controles) y alcanzar AAA (`>= 7:1`) en lectura principal bajo luz solar.

| Token CSS | Valor HEX | Valor RGB | Equivalente Tailwind v4 / CSS | Uso Principal | Ratio de Contraste Referencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` | `248, 250, 252` | `bg-slate-50` | Fondo general de la aplicacion | Base |
| `--bg-surface` | `#FFFFFF` | `255, 255, 255` | `bg-white` | Tarjetas, modales, barra inferior, sidebar | Base |
| `--bg-surface-subtle` | `#F1F5F9` | `241, 245, 249` | `bg-slate-100` | Bloques de citas, cabeceras secundarias, inputs en reposo | Base secundaria |
| `--bg-surface-pressed` | `#E2E8F0` | `226, 232, 240` | `bg-slate-200` | Estado hover/active sobre superficies claras | Interaccion |
| `--border-default` | `#CBD5E1` | `203, 213, 225` | `border-slate-300` | Divisores, bordes de tarjetas | Estructural |
| `--border-control` | `#64748B` | `100, 116, 139` | `border-slate-500` | Bordes de inputs, checkboxes y selects | `4.75:1` sobre `#FFFFFF` |
| `--text-primary` | `#0F172A` | `15, 23, 42` | `text-slate-900` | Titulos, cuerpo principal, cifras clave | `17.4:1` sobre `#FFFFFF` (AAA) |
| `--text-secondary` | `#334155` | `51, 65, 85` | `text-slate-700` | Subtitulos, descripciones, etiquetas de formulario | `10.3:1` sobre `#FFFFFF` (AAA) |
| `--text-muted` | `#475569` | `71, 85, 105` | `text-slate-600` | Metadatos, fechas secundarias, placeholders accesibles | `7.5:1` sobre `#FFFFFF` (AAA) |
| `--brand-primary` | `#1B365D` | `27, 54, 93` | `bg-[#1B365D]` / `text-[#1B365D]` | Azul institucional SAAC: botones primarios, header, tab activo | `11.8:1` con `#FFFFFF` (AAA) |
| `--brand-primary-hover` | `#122643` | `18, 38, 67` | `hover:bg-[#122643]` | Hover/presionado de boton primario | `14.5:1` con `#FFFFFF` (AAA) |
| `--brand-primary-soft` | `#EBF2FA` | `235, 242, 250` | `bg-[#EBF2FA]` | Fondo de item de navegacion activo y resaltado informativo | `10.4:1` con `#1B365D` (AAA) |
| `--brand-accent` | `#5B21B6` | `91, 33, 182` | `bg-violet-800` / `text-violet-800` | Acento institucional secundario (insignia/resaltado normativo) | `9.2:1` con `#FFFFFF` (AAA) |

### 2.2 Tokens de Semaforo de Cumplimiento (Alto Contraste)

Aplicables a afiliaciones Cruz del Sur, fichas medicas, ratios de campamento, curso A Salvo del Peligro y estado Push.

| Estado | Token Fondo | Token Borde | Token Texto / Icono | Solido (CTA / Badge lleno) | Icono `lucide-react` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Conforme / Vigente (Verde)** | `#DCFCE7` (`bg-green-100`) | `#15803D` (`border-green-700`) | `#14532D` (`text-green-900`, `>8.5:1` AAA) | `#15803D` (`bg-green-700`, texto `#FFFFFF` `5.1:1`) | `CheckCircle2` |
| **Atencion / Por vencer (Ambar)** | `#FEF3C7` (`bg-amber-100`) | `#B45309` (`border-amber-700`) | `#78350F` (`text-amber-900`, `>8.1:1` AAA) | `#B45309` (`bg-amber-700`, texto `#FFFFFF` `5.0:1`) | `AlertTriangle` |
| **Critico / Bloqueante (Rojo)** | `#FEE2E2` (`bg-red-100`) | `#B91C1C` (`border-red-700`) | `#7F1D1D` (`text-red-900`, `>8.0:1` AAA) | `#B91C1C` (`bg-red-700`, texto `#FFFFFF` `6.4:1`) | `XCircle` / `ShieldAlert` |
| **Informativo / En curso (Azul)** | `#DBEAFE` (`bg-blue-100`) | `#1D4ED8` (`border-blue-700`) | `#1E3A8A` (`text-blue-900`, `>8.2:1` AAA) | `#1D4ED8` (`bg-blue-700`, texto `#FFFFFF` `6.7:1`) | `Info` |

### 2.3 Tokens de Ramas Scouts (Filtros y Etiquetas)

| Rama / Estamento | Fondo (`bg`) | Borde (`border`) | Texto (`text`) | Etiqueta Corta |
| :--- | :--- | :--- | :--- | :--- |
| **Manada (7-11 anos)** | `#FEF3C7` (`bg-amber-100`) | `#B45309` (`border-amber-700`) | `#78350F` (`text-amber-900`) | `Manada` |
| **Unidad Scout (11-14 anos)** | `#DCFCE7` (`bg-green-100`) | `#15803D` (`border-green-700`) | `#14532D` (`text-green-900`) | `Unidad` |
| **Caminantes (14-17 anos)** | `#DBEAFE` (`bg-blue-100`) | `#1D4ED8` (`border-blue-700`) | `#1E3A8A` (`text-blue-900`) | `Caminantes` |
| **Rovers (17-21 anos)** | `#FEE2E2` (`bg-red-100`) | `#B91C1C` (`border-red-700`) | `#7F1D1D` (`text-red-900`) | `Rovers` |
| **Educadores / Consejo** | `#F1F5F9` (`bg-slate-100`) | `#475569` (`border-slate-600`) | `#0F172A` (`text-slate-900`) | `Adultos` |

### 2.4 Tipografia

- **Familia Principal (UI y Lectura):** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Familia Monospace (Articulos normativos, codigos, cifras tabulares):** `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`.
- **Regla iOS Anti-Zoom:** Todos los `<input>`, `<textarea>` y `<select>` deben tener `font-size >= 16px` (`text-base`).

| Nivel | Tamano / Line-height | Peso | Clases Tailwind | Uso |
| :--- | :--- | :--- | :--- | :--- |
| `title-page` (`h1`) | `24px / 32px` | `700` | `text-2xl font-bold tracking-tight` | Titulo principal de cada vista |
| `title-section` (`h2`) | `18px / 26px` | `600` | `text-lg font-semibold` | Encabezados de bloques y modales |
| `title-card` (`h3`) | `16px / 24px` | `600` | `text-base font-semibold` | Titulos de tarjetas y pasos |
| `body-base` | `16px / 24px` | `400` | `text-base leading-6` | Inputs, burbujas de chat, vista previa de notas |
| `body-sm` | `14px / 20px` | `400/500` | `text-sm leading-5` | Descripciones de tarjetas, listas de miembros |
| `label-badge` | `12px / 16px` | `600` | `text-xs font-semibold` | Pills de semaforo, citas de articulos, etiquetas de bottom nav |
| `kpi-number` | `28px / 32px` | `700` | `text-[28px] font-bold tabular-nums` | Porcentajes y conteos en tablero |

### 2.5 Espaciados, Radios y Elevacion

- **Grilla base:** `4px`.
- **Padding de pagina:** `16px` (`px-4 py-4`) en mobile; `24px` (`px-6 py-6`) en tablet/desktop.
- **Padding interno de tarjeta:** `16px` (`p-4`) en mobile; `20px` (`p-5`) en desktop.
- **Separacion entre tarjetas:** `12px` (`gap-3`) o `16px` (`gap-4`).
- **Radios de borde:**
  - Controles, inputs, botones: `8px` (`rounded-lg`).
  - Tarjetas, alertas, paneles: `12px` (`rounded-xl`).
  - Modales y bottom sheets: `16px` (`rounded-2xl` / `rounded-t-2xl`).
  - Chips y badges de estado: `9999px` (`rounded-full`).
- **Elevacion:** Minima y funcional; preferir bordes de `1px` en `#CBD5E1` sobre sombras difusas para mantener nitidez al aire libre. Unicamente `shadow-sm` en tarjetas y `shadow-lg` en barras flotantes o modales.

---

## 3. Arquitectura de Informacion y Navegacion

### 3.1 Mapa de Navegacion

```text
ConsejoScout (PWA Shell)
|-- TopAppBar (Mobile/Tablet) / Header Contextual (Desktop)
|   |-- Identidad de Grupo (Shield + Nombre del Grupo Scout)
|   |-- Indicador de Conectividad (Online: Wifi / Offline: WifiOff)
|   |-- Acceso a PushNotificationManager (Bell / BellRing / BellOff)
|   |-- Acceso a Ajustes de Grupo y Sincronizacion (Settings)
|
|-- Navegacion Principal (4 destinos fijos)
|   |-- 1. Tablero (Dashboard)               [LayoutDashboard]
|   |-- 2. Normativa (NormativaChat)         [BookOpenCheck]
|   |-- 3. Salidas (CampPlanner)             [Tent]
|   |-- 4. Actas y Notas (DocGenerator)      [FileText]
|
|-- Capas Transversales (Overlays / Modales)
    |-- PushNotificationManager (BottomSheet en mobile / Modal en desktop)
    |-- InstallPrompt (Banner contextual sobre BottomNavBar + Modal guia iOS)
    |-- Configuracion de Grupo (Modal: datos del Grupo, Distrito, Zona)
```

### 3.2 Layout Responsivo y Zonas Seguras

#### Mobile (`< 768px`)
1. **TopAppBar Fija:** Altura `56px` + `env(safe-area-inset-top)`. Fondo `#FFFFFF`, borde inferior `1px solid #CBD5E1`.
   - Izquierda: Icono `Shield` (`#1B365D`) + Titulo de vista actual y subtitulo corto del Grupo (`text-xs text-slate-600`).
   - Derecha:
     - Indicador compacto de red (`Wifi` o `WifiOff` con tooltip/texto accesible).
     - Boton `Push` (`44x44px`, icono `BellRing` en verde si activo, `Bell` con punto ambar si pendiente, `BellOff` si bloqueado).
     - Boton `Ajustes` (`44x44px`, icono `Settings`).
2. **Area de Contenido:** Scroll vertical natural (excepto `NormativaChat` que usa contenedor flex de altura fija `100dvh`), con `padding-bottom: calc(84px + env(safe-area-inset-bottom))`.
3. **BottomNavBar Fija:** Altura `64px` + `env(safe-area-inset-bottom)`. Fondo `#FFFFFF`, borde superior `1px solid #CBD5E1`, `z-40`.
   - 4 items en grid `grid-cols-4`, cada item con `min-h-[48px]` y area tactil completa de columna.
   - Item activo: pildora contenedora de icono en `#EBF2FA`, icono `20px` y texto `12px` en `#1B365D` con `font-semibold`, atributo `aria-current="page"`.
   - Item inactivo: icono `20px` y texto `12px` en `#475569` con `font-medium`.

#### Tablet / Desktop (`>= 768px` y `>= 1024px`)
- **Sidebar Lateral Izquierda Fija (`w-64` en `lg:`, `w-20` colapsable o rail en `md:`):**
  - Cabecera con identidad institucional SAAC / Grupo Scout.
  - Lista vertical de las 4 vistas (`min-h-[48px]` por item, `rounded-lg`).
  - Seccion inferior fija: Widget de estado de conexion, acceso directo a `PushNotificationManager` y boton `Ajustes del Grupo`.
- **Contenedor Principal:** `max-w-7xl mx-auto`, grillas adaptativas de 2 o 3 columnas segun la vista.

---

## 4. Especificacion de Componentes Transversales

### 4.1 `PushNotificationManager`

Accesible desde dos puntos: el widget de estado en `Dashboard` y el icono de campana en `TopAppBar` / `Sidebar` / `Ajustes`. Se presenta como `BottomSheet` en mobile y `Modal` centrado (`max-w-lg`) en desktop.

#### Maquina de Estados y UI por Estado

1. **Estado `checking` (Verificando capacidades):**
   - Evalua `'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window`.
   - Muestra esqueleto/spinner con icono `Loader2` (`animate-spin`) y texto "Verificando compatibilidad de alertas...".

2. **Estado `ios-browser-unsupported` (iOS Safari sin instalar como PWA standalone):**
   - Condicion de deteccion: Agente iOS (`iPhone|iPad|iPod`, incluyendo iPadOS con `maxTouchPoints > 1`) y `window.matchMedia('(display-mode: standalone)').matches === false && window.navigator.standalone !== true`.
   - Banner informativo `#DBEAFE` / borde `#1D4ED8`, icono `Smartphone`.
   - Titulo: "Instala ConsejoScout para recibir alertas en iPhone o iPad".
   - Explicacion breve: "Apple requiere agregar la aplicacion a la Pantalla de Inicio para habilitar notificaciones push."
   - **Guia paso a paso con iconos exactos de `lucide-react`:**
     - Paso 1: "Toca el boton Compartir en la barra de Safari." -> Icono `Share` (`20px`, en recuadro `#EBF2FA`).
     - Paso 2: "Desliza y selecciona Agregar a inicio." -> Icono `PlusSquare` (`20px`, en recuadro `#EBF2FA`).
     - Paso 3: "Abre ConsejoScout desde el icono nuevo y activa las alertas aqui." -> Icono `BellRing` (`20px`, en recuadro `#EBF2FA`).

3. **Estado `unsupported` (Navegador incompatible):**
   - Alerta ambar `#FEF3C7`, icono `AlertCircle`.
   - Texto: "Este navegador no admite notificaciones push web. Puedes consultar todos los vencimientos directamente desde el Tablero."

4. **Estado `default` (Permiso pendiente de solicitud):**
   - Icono central en insignia `#EBF2FA`: `BellRing` (`28px`, `#1B365D`).
   - Titulo: "Alertas operativas del Grupo Scout".
   - Lista de beneficios (3 puntos con icono `Check` en verde `#15803D`):
     - "Avisos de vencimiento de carpeta distrital antes de campamentos."
     - "Alertas por fichas medicas proximas a vencer."
     - "Recordatorios de reuniones y tareas del Consejo."
   - Boton primario (`h-12 w-full bg-[#1B365D] text-white rounded-lg font-semibold`): **"Activar alertas del Grupo"** con icono `Bell`.

5. **Estado `subscribing` (Solicitando permiso y registrando suscripcion VAPID):**
   - Ejecuta `Notification.requestPermission()`, espera `navigator.serviceWorker.ready`, obtiene suscripcion con `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` usando la clave publica VAPID y envia el payload al backend.
   - Boton deshabilitado con icono `Loader2` (`animate-spin`) y etiqueta "Configurando suscripcion segura...".

6. **Estado `granted` (Alertas activas y suscripcion VAPID confirmada):**
   - Cabecera de estado verde (`bg-green-100 border-green-700 text-green-900`): icono `CheckCircle2` + texto "Alertas activas en este dispositivo".
   - Sub-bloque de preferencias por categoria (switches tactiles `min-h-[44px]`):
     - `Vencimientos de carpeta distrital`
     - `Fichas medicas y afiliaciones`
     - `Tareas del Consejo de Grupo`
   - **Boton de prueba instantanea:** Boton secundario con borde `#1B365D`, texto `#1B365D`, altura `44px`, icono `Send`: **"Enviar notificacion de prueba"**. Al ejecutarse muestra confirmacion en linea ("Notificacion de prueba enviada") o error de red con icono `AlertTriangle`.
   - Accion secundaria discreta al pie: **"Desactivar alertas en este dispositivo"** (`text-red-700 min-h-[44px]`, icono `BellOff`).

7. **Estado `denied` (Permiso bloqueado en el navegador):**
   - Panel de advertencia rojo/ambar (`bg-red-100 border-red-700 text-red-900`), icono `ShieldAlert`.
   - Titulo: "Las notificaciones estan bloqueadas en este navegador".
   - Instruccion clara sin jerga tecnica: "Toca el icono de configuracion o candado junto a la barra de direcciones, habilita el permiso de Notificaciones y presiona Comprobar nuevamente." (Iconos de referencia: `Lock` y `Settings`).
   - Boton `h-11` secundario: **"Comprobar estado"** con icono `RefreshCw`.

---

### 4.2 `InstallPrompt` (Instalacion Contextual PWA)

Componente no intrusivo que gestiona la instalacion de la PWA segun la plataforma y se oculta automaticamente si la aplicacion ya corre en modo `standalone` o si el usuario descarto el aviso recientemente (cooldown persistido en `localStorage`, por ejemplo 7 dias).

1. **Flujo Android / Chrome / Edge (`beforeinstallprompt`):**
   - Captura el evento `beforeinstallprompt`, previene el prompt automatico prematuro y lo guarda en estado.
   - Renderiza un banner flotante limpio ubicado justo por encima de la `BottomNavBar` en mobile (`bottom-[calc(72px+env(safe-area-inset-bottom))] left-4 right-4`) o en la esquina inferior derecha en desktop (`max-w-md`).
   - Superficie `#FFFFFF`, borde `1px solid #1B365D`, `shadow-lg`, `rounded-xl`, `p-4`:
     - Icono izquierdo: `Download` en contenedor `40x40px` `#EBF2FA` (`#1B365D`).
     - Texto: Titulo `text-sm font-semibold text-slate-900` ("Instala ConsejoScout") + Subtitulo `text-xs text-slate-600` ("Acceso inmediato y consulta offline en campamento").
     - Acciones: Boton primario `h-11 px-4` ("Instalar") + boton cerrar `44x44px` (`X`, `aria-label="Cerrar aviso de instalacion"`).

2. **Flujo iOS Safari (Deteccion sin `beforeinstallprompt`):**
   - Se muestra solo en Safari iOS cuando no esta en modo `standalone`.
   - Banner compacto con icono `Smartphone`, titulo "Agrega ConsejoScout a tu inicio", boton `h-11` **"Ver pasos"** (`Info`) y boton cerrar `44x44px` (`X`).
   - Al tocar "Ver pasos", abre modal/bottom-sheet con los 3 pasos ilustrados con `Share` y `PlusSquare` de `lucide-react` y boton de cierre `h-12` **"Entendido"**.

---

## 5. Especificacion de las 4 Vistas Principales

### 5.1 Vista 1: `Dashboard` (Tablero del Grupo)

Objetivo: Brindar al Jefe de Grupo un diagnostico completo en menos de 5 segundos y acceso directo a las plataformas oficiales de SAAC y pendientes del Consejo.

#### Estructura Visual (Mobile-First -> Desktop Grid 12 cols)

1. **Cabecera de Grupo y Widget Estado Push:**
   - Titulo: "Tablero del Grupo" (`h1`) + subtitulo dinamico ("Grupo Scout Nro. XX - Distrito YY").
   - **`PushStatusWidget`** (tarjeta compacta clicable, `min-h-[56px]`, `rounded-xl`):
     - Muestra el estado actual del `PushNotificationManager` con icono `BellRing` / `Bell` / `BellOff` / `Smartphone`, texto de estado y chevron `ChevronRight`. Tocar en cualquier parte de la fila abre el gestor Push.

2. **Tarjetas de Semaforo Operativo (Grid `1 col` mobile, `3 cols` `md:`):**
   - **Tarjeta 1: Afiliaciones Cruz del Sur**
     - Icono cabecera: `BadgeCheck` (Verde) / `AlertTriangle` (Ambar) / `XCircle` (Rojo).
     - Metrica principal: porcentaje vigente (ej. `92%`) + detalle (`46 vigentes / 4 pendientes`).
     - Barra de progreso visual accesible (`h-2 rounded-full`).
     - Accion de tarjeta: "Ver pendientes" (filtra la lista inferior por afiliacion pendiente).
   - **Tarjeta 2: Fichas Medicas**
     - Icono cabecera: `HeartPulse`.
     - Metrica principal: conteo de alertas (`6 por vencer / 2 vencidas`).
     - Pill de semaforo explicita ("Requiere atencion" en ambar o "Al dia" en verde).
     - Regla visual: ventana de alerta temprana de 30 dias previos al vencimiento.
   - **Tarjeta 3: Proximos Campamentos**
     - Icono cabecera: `Tent`.
     - Contenido: nombre de la proxima salida, fecha, destino y estado de carpeta distrital (ej. `En preparacion - Faltan 12 dias`).
     - Boton directo `h-11`: "Abrir planificador" (navega a `CampPlanner` con esa salida).

3. **Accesos Directos Oficiales SAAC (Grid `2 cols` mobile, `4 cols` `lg:`):**
   - Encabezado de seccion: "Plataformas SAAC" con subtitulo de enlace externo.
   - Cuatro botones-tarjeta (`min-h-[76px]`, `p-3`, `rounded-xl`, `bg-white border border-slate-300 hover:border-[#1B365D]`):
     1. **Cruz del Sur** — Icono `Users` + `ExternalLink` (`14px` en esquina superior derecha). Subtitulo: "Afiliaciones y nomina".
     2. **Rumbo Sur** — Icono `Compass` + `ExternalLink`. Subtitulo: "Gestion administrativa".
     3. **Biblioteca SAAC** — Icono `Library` + `ExternalLink`. Subtitulo: "Reglamentos y guias".
     4. **Campus SAAC** — Icono `GraduationCap` + `ExternalLink`. Subtitulo: "Formacion de adultos".

4. **Listado Rapido de Tareas del Consejo y Miembros con Filtros por Rama:**
   - **Selector Segmentado (`min-h-[44px]`):** `Tareas del Consejo` (icono `ClipboardList`) | `Miembros y Fichas` (icono `Users`).
   - **Barra de Filtros por Rama (scroll horizontal tactil, `gap-2`, cada chip `min-h-[44px] px-4 rounded-full`):**
     - `Todas` | `Manada` | `Unidad` | `Caminantes` | `Rovers` | `Adultos`
   - **Vista Tareas del Consejo:**
     - Boton rapido "+ Nueva tarea" (`h-11`, icono `Plus`).
     - Cada fila (`min-h-[60px]`): boton checkbox `44x44px` (`CheckSquare` / `Square`), titulo de tarea, badge de rama, fecha limite con indicador de vencimiento (`Calendar`) y responsable.
   - **Vista Miembros y Fichas:**
     - Buscador rapido por nombre (`h-11`, icono `Search`).
     - Tarjeta/fila por miembro (`p-3`): Nombre, chip de rama, dos badges semaforo compactos con icono + texto: `Afiliacion` (`CheckCircle2`/`AlertTriangle`/`XCircle`) y `Ficha Medica` (`HeartPulse`). En estamento `Adultos`, badge adicional `A Salvo del Peligro` (`ShieldCheck` / `ShieldAlert`).

---

### 5.2 Vista 2: `NormativaChat` (Asistente Normativo)

Objetivo: Resolver dudas reglamentarias de SAAC de forma inmediata, con cita verificable de documento/articulo y disponibilidad desde el minuto cero sin depender de internet.

#### Estructura Visual (Contenedor `flex flex-col` de altura de viewport disponible)

1. **Cabecera de Estado de Conocimiento (`shrink-0`, `p-3 border-b bg-slate-100`):**
   - Muestra fuente activa con icono + etiqueta:
     - Modo Online sincronizado: icono `Cloud` o `Database` + "Conectado a saac_knowledge_base + Base local offline".
     - Modo Offline / Sin conexion: icono `HardDrive` + "Modo Offline: respondiendo desde base normativa local precargada".
   - Boton secundario `44x44px` para limpiar conversacion (`RotateCcw`, `aria-label="Nueva consulta"`).

2. **Estado Inicial y Chips de Preguntas Frecuentes:**
   - Se muestra cuando el hilo esta vacio (y accesible opcionalmente desde un boton "Sugerencias" `HelpCircle`).
   - Titulo breve: "Consulta normativa oficial SAAC".
   - Lista de chips tactiles (`min-h-[44px] px-4 py-2.5 text-left rounded-xl border border-slate-300 bg-white`):
     - Icono `BookOpen` + "¿Cuales son los ratios de adultos por rama en campamento?"
     - Icono `CalendarClock` + "¿Con cuanta anticipacion se presenta la carpeta distrital?"
     - Icono `ShieldCheck` + "¿Quienes deben tener vigente el curso A Salvo del Peligro?"
     - Icono `FileCheck2` + "¿Que documentacion exige la ficha medica y autorizacion?"

3. **Hilo de Conversacion (`flex-1 overflow-y-auto p-4 space-y-4`):**
   - **Mensaje de Usuario:** Alineado a la derecha (`max-w-[85%]`, `bg-[#1B365D] text-white rounded-2xl rounded-br-sm px-4 py-3`).
   - **Mensaje del Asistente:** Alineado a la izquierda (`max-w-[92%] md:max-w-[78%]`, `bg-white border border-slate-300 rounded-2xl rounded-bl-sm p-4`).
     - Texto estructurado en parrafos cortos y listas con vinetas limpias.
     - **Tarjeta Obligatoria de Cita Normativa (al pie del mensaje):**
       - Contenedor `bg-slate-100 border-l-4 border-[#1B365D] rounded-r-lg p-3 mt-3`.
       - Encabezado con icono `FileText` (`16px`): Nombre del documento oficial (ej. `Normativa de Actividades al Aire Libre - SAAC`).
       - Linea de referencia en `font-mono text-xs text-slate-700`: Articulo / Capitulo / Version + Origen (`Local` o `saac_knowledge_base`).
       - Boton `h-9 px-3` (con area tactil `min-h-[44px]` via padding/wrapper) **"Copiar cita"** (`Copy` -> `Check`).
     - **Acciones Contextuales Post-Respuesta (cuando aplique):**
       - Boton chip `min-h-[44px]` "Validar en Planificador" (`Tent`) o "Redactar Nota" (`FileText`).
   - **Indicador de respuesta / busqueda:** Burbuja con `Loader2` (`animate-spin`) y texto "Consultando normativa SAAC...".

4. **Barra de Entrada Fija (Encima de BottomNavBar):**
   - Contenedor `bg-white border-t border-slate-300 p-3`.
   - Textarea auto-ajustable (`min-h-[44px] max-h-32 text-base rounded-lg border-slate-500`), placeholder: "Pregunta sobre ratios, acampes, habilitaciones..."
   - Boton Enviar (`48x48px`, `bg-[#1B365D] text-white rounded-lg`, icono `Send`, `aria-label="Enviar consulta"`).

---

### 5.3 Vista 3: `CampPlanner` (Gestor de Salidas y Campamentos)

Objetivo: Guiar al Jefe de Grupo paso a paso en la planificacion operativa, validar automaticamente ratios y capacitacion obligatoria, y evitar vencimientos de carpetas distritales.

#### Estructura Visual

- **Mobile:** Stepper superior compacto de 3 pasos clicables (`min-h-[44px]`) + **Barra Resumen Flotante de Cumplimiento** (muestra semaforo global `Apto para presentar` / `Faltan requisitos` siempre visible).
- **Desktop (`lg:`):** Layout de 2 columnas (`7 cols` formulario paso a paso a la izquierda, `5 cols` panel sticky de Validacion Normativa en tiempo real a la derecha).

#### Paso 1: Datos Basicos y Destino
- **Tipo de actividad (Selector segmentado `h-12`):** `Salida por el dia` | `Acampe / Campamento`.
- **Nombre de la salida** (input `h-11`, ej. "Acampe de Primavera").
- **Fechas:** Fecha de inicio y Fecha de regreso (`type="date"`, `h-11`).
- **Destino con Presets de Centros Scouts SAAC:**
  - Titulo de grupo: "Destinos frecuentes y Centros Scouts".
  - Chips tactiles (`min-h-[44px]`, icono `MapPin`):
    - `Centro Scout Necochea`
    - `Centro Scout Mar del Plata`
    - `Campo Scout El Jaguel`
    - `Otro destino`
  - Al seleccionar un preset se rellena automaticamente el nombre oficial del predio, provincia/localidad y observaciones base de habilitacion del campo; si elige `Otro destino`, habilita campo de texto libre.

#### Paso 2: Participantes, Ratios y "A Salvo del Peligro"
- **Contadores Tactiles por Rama (`StepperRow`, altura minima `56px` por fila):**
  - Cada fila incluye: etiqueta de rama con badge de color institucional + regla de ratio visible en texto secundario (ej. `Manada: minimo 1 adulto cada 6 jovenes`), boton `-` (`48x48px`, icono `Minus`), campo numerico editable (`w-16 h-12 text-center font-mono text-lg font-bold`) y boton `+` (`48x48px`, icono `Plus`).
  - Ramas:
    1. `Manada` (7-11 anos)
    2. `Unidad Scout` (11-14 anos)
    3. `Caminantes` (14-17 anos)
    4. `Rovers` (17-21 anos)
- **Bloque de Adultos Responsables y Capacitacion:**
  - Stepper `Total de adultos acompanantes y educadores`.
  - Stepper `Adultos con curso A Salvo del Peligro vigente`.
  - Stepper `Adultos con habilitacion / Insignia de Madera / Jefatura de Campo` (segun tipo de actividad).
- **Panel de Validacion Normativa Automatica (Actualizacion en vivo):**
  - Regla 1 — **Calculo de Ratio por Rama y Total:** Desglosa cuantos adultos exige la suma de jovenes por rama (ej. `Requerido: 5 adultos | Declarados: 4`) y aplica regla minima de seguridad (`>= 2 adultos en toda salida`). Estado semaforo Verde (`CheckCircle2`) o Rojo (`XCircle`) indicando el faltante exacto ("Falta 1 adulto responsable para cubrir el ratio").
  - Regla 2 — **Curso A Salvo del Peligro:** Valida que `adultosConCurso === totalAdultos` (100% de los adultos declarados). Si `adultosConCurso < totalAdultos`, muestra alerta Roja bloqueante (`ShieldAlert`): "Faltan X adultos con A Salvo del Peligro vigente. Requisito obligatorio para autorizar la salida."
  - Regla 3 — **Acompañamiento Mixto / Conduccion:** Recordatorio informativo (`Info`) si hay ramas mixtas declaradas para verificar adultos referentes.

#### Paso 3: Carpeta Distrital y Alertas Push
- **Estado de Documentacion (Checklist interactivo, items `min-h-[52px]`):**
  - Cada documento tiene selector de estado de 3 opciones o ciclo tactil (`Pendiente` en gris/rojo, `En proceso` en ambar, `Completo` en verde):
    1. `Nomina de participantes (Cruz del Sur)`
    2. `Fichas medicas vigentes de todos los asistentes`
    3. `Autorizaciones firmadas por familias`
    4. `Programa de actividades y proyecto educativo`
    5. `Plan de emergencias y ficha de traslado`
    6. `Nota formal de Pedido de Acampe` -> incluye boton directo `h-11` **"Generar Nota"** (`FileText`) que abre `DocGenerator` pre-cargando fecha, destino, ramas y responsables.
- **Programacion de Alertas Push antes del Vencimiento Distrital:**
  - Calcula automaticamente la **Fecha Limite de Presentacion** ante el Distrito (por defecto `fechaInicio - 15 dias` o configurable segun normativa distrital) y la muestra en tarjeta destacada (`CalendarClock`).
  - Toggles (`min-h-[44px]`):
    - `Notificar 15 dias antes del vencimiento`
    - `Notificar 7 dias antes del vencimiento`
    - `Notificar 48 horas antes del vencimiento`
  - Si `PushNotificationManager` no esta en estado `granted`, muestra banner inline ambar con boton `h-11` **"Activar alertas Push"** (`BellRing`) para no perder la programacion.
- **Acciones finales de flujo:** Boton primario `h-12` **"Guardar planificacion"** (`Save`) y boton secundario `h-12` **"Generar Pedido de Acampe"** (`FileText`).

---

### 5.4 Vista 4: `DocGenerator` (Generador de Notas y Actas)

Objetivo: Producir en segundos documentos institucionales formales o comunicados claros para familias, listos para copiar y pegar sin errores de formato ni emojis.

#### Estructura Visual

- **Mobile:** Formulario arriba + boton sticky de acceso rapido a vista previa / copiar, o pestanas segmentadas superiores (`1. Completar datos` | `2. Vista previa y Copiar`, `h-11`).
- **Desktop (`lg:`):** Split-view `5 cols` selector y formulario / `7 cols` vista previa en vivo con boton de copiado prominente.

#### 1. Selector de Tipo de Documento (Grid `2 cols` mobile, `4 cols` arriba o lista lateral)
Cada opcion es un boton-tarjeta (`min-h-[68px] p-3 rounded-xl border`) con estado seleccionado marcado por borde `2px solid #1B365D` y fondo `#EBF2FA`:

1. **Pedido de Acampe** — Icono `Tent`
2. **Autorizacion de Salida** — Icono `FileSignature`
3. **Acta de Consejo de Grupo** — Icono `ScrollText`
4. **Comunicado para Familias (WhatsApp)** — Icono `MessageSquareShare`

#### 2. Formulario Rapido Adaptativo
- Barra superior opcional cuando existen salidas guardadas en `CampPlanner`: boton **"Cargar datos de proxima salida"** (`Download`, `h-11`) que autocompleta lugar, fechas y participantes.
- **Campos segun tipo:**
  - *Pedido de Acampe:* Grupo Scout, Distrito, Destinatario (Jefe/a de Distrito), Lugar/Campo Scout, Fecha inicio y fin, Cantidad de jovenes y adultos responsables, Responsable a cargo del campamento.
  - *Autorizacion de Salida:* Grupo Scout, Rama(s), Nombre de la actividad, Lugar exacto, Fecha y horario de salida / regreso, Punto de encuentro, Valor/Arancel (opcional), Telefono de contacto de guardia.
  - *Acta de Consejo de Grupo:* Numero de acta, Fecha y hora, Lugar, Miembros presentes, Orden del dia, Resoluciones / Acuerdos tomados, Proxima fecha de reunion.
  - *Comunicado para Familias (WhatsApp):* Rama(s) destinataria(s), Asunto/Actividad, Fecha y horario, Lugar, Que llevar (elementos basicos), Fecha limite de confirmacion/pago, Firma institucional.

#### 3. Vista Previa Limpia y Boton "Copiar texto"
- **Contenedor de Vista Previa:** Superficie blanca `#FFFFFF`, borde `#CBD5E1`, padding `20px`, texto en `#0F172A` (`text-[15px] leading-relaxed whitespace-pre-wrap`).
- **Regla de formato en plantillas:** Estructura formal institucional para Notas y Actas; formato limpio con negritas compatibles con WhatsApp (`*Texto*`) y vinetas con guion (`- `) para Comunicados. Cero emojis en todas las plantillas.
- **Barra de Accion Un Toque (`sticky bottom` en mobile):**
  - Boton primario `h-12 flex-1 bg-[#1B365D] text-white rounded-lg font-semibold`:
    - Reposo: icono `Copy` + **"Copiar texto"**
    - Confirmado (2.5 segundos, con `aria-live="polite"`): fondo verde `#15803D`, icono `Check` + **"Texto copiado al portapapeles"**
  - Boton secundario iconico `48x48px` (`Share2`, `aria-label="Compartir documento"`) cuando `navigator.share` este disponible, y descarga `.txt` (`Download`, `48x48px`, `aria-label="Descargar texto"`).

---

## 6. Inventario Consolidado de Iconos (`lucide-react`)

Prohibido reemplazar cualquiera de estos iconos por caracteres Unicode pictograficos o emojis.

| Contexto / Componente | Nombre exacto en `lucide-react` | Tamano recomendado |
| :--- | :--- | :--- |
| Identidad institucional / Grupo Scout | `Shield` | `20px` / `24px` |
| Red Online / Red Offline | `Wifi` / `WifiOff` | `18px` |
| Ajustes del Grupo | `Settings` | `20px` |
| Nav: Tablero (`Dashboard`) | `LayoutDashboard` | `20px` |
| Nav: Normativa (`NormativaChat`) | `BookOpenCheck` | `20px` |
| Nav: Salidas (`CampPlanner`) | `Tent` | `20px` |
| Nav: Actas (`DocGenerator`) | `FileText` | `20px` |
| Push: Pendiente / Activo / Bloqueado | `Bell` / `BellRing` / `BellOff` | `20px` / `28px` |
| Push: Programar alerta | `BellPlus` | `18px` |
| Guia iOS: Compartir en Safari | `Share` | `20px` |
| Guia iOS: Agregar a inicio | `PlusSquare` | `20px` |
| Guia iOS / Dispositivo movil | `Smartphone` | `20px` |
| Instalar PWA / Descargar | `Download` | `20px` |
| Cerrar modal / banner / limpiar | `X` | `20px` |
| Semaforo: Conforme / Vigente | `CheckCircle2` | `18px` / `20px` |
| Semaforo: Alerta / Por vencer | `AlertTriangle` | `18px` / `20px` |
| Semaforo: Critico / Error | `XCircle` / `ShieldAlert` | `18px` / `20px` |
| Informacion normativa | `Info` | `18px` |
| Afiliaciones al dia | `BadgeCheck` | `20px` |
| Fichas medicas | `HeartPulse` | `20px` |
| Curso A Salvo del Peligro vigente | `ShieldCheck` | `18px` |
| Acceso externo SAAC: Cruz del Sur | `Users` | `20px` |
| Acceso externo SAAC: Rumbo Sur | `Compass` | `20px` |
| Acceso externo SAAC: Biblioteca SAAC | `Library` | `20px` |
| Acceso externo SAAC: Campus SAAC | `GraduationCap` | `20px` |
| Indicador de enlace externo | `ExternalLink` | `14px` |
| Tareas del Consejo | `ClipboardList` | `18px` |
| Checkbox tarea / Paso completado | `CheckSquare` / `Square` / `Check` | `20px` |
| Buscador de miembros | `Search` | `18px` |
| Base local offline / Base remota | `HardDrive` / `Database` / `Cloud` | `16px` |
| Preguntas frecuentes / Reglamento | `BookOpen` / `HelpCircle` | `18px` |
| Cita normativa oficial | `FileCheck2` | `16px` |
| Enviar consulta / Probar push | `Send` | `18px` |
| Reiniciar chat / Comprobar permiso | `RotateCcw` / `RefreshCw` | `18px` |
| Cargando / Procesando | `Loader2` | `18px` |
| Destino / Centro Scout | `MapPin` | `18px` |
| Contadores de participantes | `Minus` / `Plus` | `20px` |
| Fecha limite / Vencimiento | `Calendar` / `CalendarClock` | `18px` |
| Guardar planificacion | `Save` | `18px` |
| Doc: Autorizacion de Salida | `FileSignature` | `20px` |
| Doc: Acta de Consejo | `ScrollText` | `20px` |
| Doc: Comunicado WhatsApp | `MessageSquareShare` | `20px` |
| Copiar texto / Compartir | `Copy` / `Share2` | `18px` |
| Navegacion secundaria / Candado | `ChevronRight` / `Lock` | `18px` |

---

## 7. Requisitos de Accesibilidad (WCAG 2.1 AA/AAA) y Handoff

1. **Indicador de Foco Visible:** Todos los elementos interactivos deben conservar foco visible con `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B365D] focus-visible:ring-offset-2`.
2. **Anuncios Dinamicos (`aria-live`):**
   - Copiado de texto en `DocGenerator` y `NormativaChat`: `aria-live="polite"`.
   - Errores bloqueantes en `CampPlanner` (falta de adultos o curso A Salvo del Peligro): `role="alert"`.
   - Estado de suscripcion Push: `aria-live="polite"`.
3. **Etiquetas de Formulario:** Todo `<input>`, `<select>` y `<textarea>` debe tener `<label>` asociado por `htmlFor`/`id` visible (no depender solo de `placeholder`).
4. **Movimiento Reducido:** Respetar `@media (prefers-reduced-motion: reduce)` desactivando animaciones de transicion y desplazamiento suave; mantener unicamente indicadores funcionales esenciales.
5. **Safe Areas PWA:** Configurar `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` y aplicar `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` en los contenedores fijos para compatibilidad con iPhone con Dynamic Island / Home Indicator y Android con navegacion por gestos.
