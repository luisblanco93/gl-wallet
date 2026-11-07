# Billetera personal

Billetera web para ver saldos y movimientos, registrar ingresos y gastos y transferir dinero entre cuentas propias o a otra persona, sobre el mock API del ejercicio. El principio que guía la app: que el usuario siempre entienda el estado real de su dinero (**disponible**, **en proceso** y **acreditado**).

Hecha con React 19, TypeScript estricto, Vite, TanStack Query, Tailwind CSS v4, y Vitest con Testing Library.

**Por qué una billetera.** De las opciones de la consigna elegí la billetera porque un control de gastos ya lo venía haciendo como proyecto aparte: [Daily Expenses](https://dailyexpenses2.netlify.app/) (capturas: [vista del mes](docs/images/daily-expenses-mes.jpeg) y [vista de tarjetas](docs/images/daily-expenses-tarjetas.jpeg)).

## Requisitos

- Node.js 22 o superior (probado con Node 24) y npm.
- El mock API del ejercicio (carpeta `mock-api` del repositorio de la consigna). No forma parte de este repositorio y no se modifica.

## Puesta en marcha

### 1. Levantar el mock API

```bash
cd mock-api
npm install
npm run seed   # crea data.db con los usuarios y movimientos de prueba
npm run dev    # http://localhost:3000
```

`npm run seed` también sirve para volver a los datos iniciales en cualquier momento.

### 2. Levantar la app

En otra terminal, desde la raíz de este repositorio:

```bash
npm install
npm run dev    # http://localhost:5173
```

La app usa `http://localhost:3000` como API por defecto. Si el mock corre en otra dirección, copia `.env.example` a `.env` y cambia `VITE_API_URL`.

### 3. Entrar

| Email | Contraseña | Cuentas |
|---|---|---|
| `demo@example.com` | `demo123` | Cuenta Pesos (ARS, `acc-1`) y Cuenta Dolares (USD, `acc-2`) |
| `test@example.com` | `test123` | Cuenta Principal (ARS, `acc-3`) |
| `ana@example.com` | `ana123` | Cuenta de Ana (ARS, `acc-4`) |

Para probar una transferencia a otra persona, entra como `demo@example.com` y envía a `acc-4` o `acc-3` desde la pestaña «Otra persona».

### 4. Panel de demostración (opcional)

Casi todo lo importante de una billetera aparece cuando algo falla, y el mock API no tiene forma de fallar a pedido. Para probar esos casos hay un panel oculto que los simula sin tocar el mock.

- **Cómo abrirlo:** toca **5 veces el logo** (arriba a la izquierda, o en la pantalla de login) en menos de 2 segundos. Se cierra con la X o con `Escape`. Mientras haya una simulación activa y el panel esté cerrado, una franja arriba lo avisa y permite reabrirlo.
- **Qué simula:** API sin conexión, error del servidor, respuesta lenta o inválida, sesión vencida, pendientes que no cargan (los débitos se bloquean), respuesta perdida después de enviar, validación y fondos insuficientes del servidor, liquidación demorada o fallida, falla del seguimiento, y cotización caída o con datos inválidos.
- **Dónde está disponible:** siempre con `npm run dev`. En un build de producción solo si se define `VITE_DEMO_TOOLS=true`; si no, el panel no se incluye.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm test` | Corre todos los tests una vez (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run typecheck` | Chequeo de tipos (`tsc -b`) |
| `npm run lint` | ESLint |
| `npm run build` | Chequeo de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |

Los tests no necesitan el mock API: usan una API falsa en memoria.

## Qué incluye

- **Sesión:** login, rutas protegidas y cierre de sesión cuando la API responde 401.
- **Inicio:** saldo por cuenta con su disponible y lo que está en proceso, cada moneda por separado; total estimado en pesos como referencia (al tipo de cambio oficial, con fecha); últimos movimientos y alta de cuenta.
- **Movimientos:** búsqueda, filtros y paginación guardados en la URL; detalle en un panel lateral, con edición de categoría y descripción de ingresos y gastos.
- **Nuevo movimiento:** ingreso o gasto; un gasto que supera el disponible no se puede enviar.
- **Transferir:** en tres pasos (Datos, Revisión y Resultado).
  - Destino entre tus cuentas o a otra persona por ID de cuenta.
  - Las cuentas en otra moneda aparecen deshabilitadas, con el motivo y una equivalencia estimada.
  - Avisos antes de confirmar una transferencia a otra persona.
  - Seguimiento del estado hasta que se acredita, o aviso si tarda más de lo normal.
  - Resultados claros para fondos insuficientes, destino inexistente y error de conexión.

## Cómo está organizado

```
src/domain/     reglas de negocio puras: montos en centavos, disponible, regla de débito, monedas, estado de transferencias, cotización
src/api/        cliente HTTP, conversión entre la API y el dominio, errores normalizados (la única capa que conoce la API)
src/features/   hooks y pantallas por funcionalidad; usan el dominio y no contienen reglas propias
src/shared/ui/  componentes de presentación genéricos
src/app/        providers, rutas y layout
```

El dominio no importa React, TanStack Query ni la capa API; ESLint lo hace cumplir.

## Documentación

- [`ARCHITECTURE.md`](ARCHITECTURE.md): cómo está organizado el código, dónde vive cada regla de negocio, cómo fluyen los datos y cómo se manejan el estado, los errores y los tests.
- [`DECISIONS.md`](DECISIONS.md): las decisiones de producto y sus trade-offs, incluidos los tres puntos ambiguos de la consigna (multi-moneda, liquidación asíncrona y fondos insuficientes) y lo que quedó afuera.
- [`PROMPT_LOG.md`](PROMPT_LOG.md): cómo usé la IA durante el desarrollo.
- [`docs/plan.md`](docs/plan.md) y [`docs/report.html`](docs/report.html): el plan de trabajo con el avance por tareas, los diagramas del flujo y la arquitectura, y el detalle de cada entrega. El HTML se abre directo en el navegador.
- [`openspec/changes/`](openspec/changes/): las especificaciones de comportamiento (`wallet-core` y `transfers`), con escenarios, diseño y tareas.
