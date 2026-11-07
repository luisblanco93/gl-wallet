# Decisiones

Las decisiones más relevantes del proyecto, con su trade-off. El comportamiento detallado de cada una está en las specs de [`openspec/changes/`](openspec/changes/).

---

## 1. Multi-moneda: se bloquea, con una equivalencia estimada como referencia

**Contexto.** La API no convierte: una transferencia registra el mismo `amount` en los dos lados, cada uno en la moneda de su cuenta. Transferir $ 100.000 desde una cuenta ARS a una USD acreditaría US$ 100.000.

**Decisión.**
- No se permite transferir entre cuentas de monedas distintas. Las cuentas propias de otra moneda aparecen deshabilitadas, con el motivo.
- Como referencia, se muestra cuánto equivaldría el monto al tipo de cambio oficial ([dolarapi.com](https://dolarapi.com), promedio entre compra y venta), siempre rotulado como estimación y con la fecha de la cotización. En Inicio hay además un "Total estimado en ARS".
- Si la cotización no está disponible, la estimación se oculta y el resto de la app funciona igual.
- Para que la transferencia entre cuentas propias siga siendo posible con los datos del seed (Demo tiene una cuenta ARS y una USD), se agregó un alta mínima de cuenta (nombre y moneda).

**Alternativas descartadas.**
- *Permitir con advertencia:* con un clic, el usuario crearía o perdería valor.
- *Convertir en el cliente:* la API recibe un solo `amount`, así que no hay forma de acreditar un monto distinto en cada lado. Simularlo con un gasto y un ingreso no sería una transferencia, no sería atómico y no tendría estado `pending`.

**Trade-off.**
- Se pierde la posibilidad de mover dinero entre monedas, a cambio de no mostrar nunca un saldo falso.
- **Riesgo residual en P2P:** la API no expone las cuentas de otros usuarios, así que no se puede conocer la moneda del destino antes de enviar. La revisión advierte que debe ser la misma moneda, y si la respuesta revela otra, se le informa al usuario. Es una limitación de la API que la UI hace explícita, no algo que se pueda evitar.

---

## 2. `pending` → `completed`: polling con tope

**Contexto.** Una transferencia nace `pending` y se liquida sola unos 1,5 s después, sin notificar a nadie. Verificamos además que si el servidor se reinicia en esa ventana, la transferencia queda `pending` para siempre: la liquidación es un temporizador en memoria y nada produce el estado `failed`.

**Decisión.**
- Después de enviar, se consulta `GET /transfers/:id` cada 1 s.
- Al llegar `completed`, se muestra "Acreditada" (anunciado también para lectores de pantalla) y se actualizan saldos y movimientos.
- Si a los 10 s sigue `pending`, se deja de consultar y se muestra "Está tardando más de lo normal", con un enlace a Movimientos.
- La lista de movimientos también se refresca sola mientras tenga filas pendientes, con el mismo tope.
- La política (cada cuánto consultar y cuándo cortar) es una función pura del dominio; TanStack Query solo la ejecuta.

**Alternativas descartadas.**
- *Refrescar solo al volver a la pantalla:* el usuario no ve la acreditación en el momento.
- *Mostrar "procesando" sin seguimiento:* deja datos desactualizados.
- *Consultar hasta que termine:* con una transferencia trabada, se consultaría para siempre.

**Trade-off.** Unas 10 consultas extra por transferencia, a cambio de que el usuario vea el cambio de estado en el momento y nunca quede frente a un spinner infinito.

---

## 3. Fondos insuficientes: saldo disponible calculado y una sola regla de débito

**Contexto.** El saldo de la API solo cuenta los movimientos `completed`. Verificamos que dos transferencias rápidas pasan las dos el control de fondos: con $ 720.000, dos transferencias de $ 500.000 respondieron 201 y la cuenta terminó en −$ 280.000. También verificamos que la API acepta un gasto mayor al saldo y deja la cuenta en negativo.

**Decisión.**
- El cliente calcula el **disponible**: saldo menos las transferencias salientes pendientes. Cada cuenta muestra el disponible y, si corresponde, "En proceso".
- Una sola regla de dominio, `canDebit`, decide si se puede debitar un monto. Aplica a transferencias **y a gastos**: un gasto mayor al disponible no se puede registrar.
- Se valida antes de enviar, y además se maneja el 422 del servidor (mensaje con el disponible actualizado y recarga de saldos), porque el dato del cliente puede estar desactualizado.
- Si no se puede calcular el disponible (por ejemplo, porque falló la consulta de pendientes), se bloquean los débitos de esa cuenta. Con dinero, un disponible desconocido no equivale a "todo el saldo".
- El botón de envío se deshabilita mientras hay un envío en curso, para que un doble clic no genere dos transferencias.

**Alternativas descartadas.**
- *Dejar que falle y mostrar el 422:* no cubre el doble gasto ni los gastos.
- *Avisar y permitir el gasto:* acepta saldos negativos en una billetera.

**Trade-off.** El cliente tiene que pedir las transferencias pendientes además de las cuentas, y bloquea operaciones que la API aceptaría. Es deliberado: la API es más permisiva de lo que debería ser un producto de dinero.

---

## 4. Montos en centavos y sin reintentos automáticos de operaciones

**Contexto.** La API guarda los montos como `REAL` (float) y acepta valores como `0.015`. Por otro lado, una transferencia que falla por red puede haberse creado igual en el servidor.

**Decisión.**
- Internamente, los montos son enteros en centavos. La conversión a decimal se hace solo en la frontera con la API, y la carga acepta como máximo 2 decimales.
- Los montos se formatean con el locale es-AR y el código de moneda.
- Las operaciones que mueven dinero nunca se reintentan solas. Si una transferencia falla por red, se le pide al usuario que revise Movimientos antes de volver a intentar.
- Las consultas no se reintentan ante errores 4xx, y se reintentan una sola vez ante errores de red o del servidor.

**Alternativas descartadas.**
- *Trabajar con floats:* `0.1 + 0.2 ≠ 0.3`, y con dinero eso no se tolera.
- *Reintentar automáticamente:* podría duplicar una transferencia.

**Trade-off.** Convertir en la frontera agrega un paso en cada request y respuesta, y el usuario hace un chequeo manual tras un error de red. A cambio, no hay errores de redondeo ni transferencias duplicadas.

---

## No implementé

- **Edición de cuentas:** no es requisito. Solo se implementó el alta mínima, necesaria por la decisión 1.
- **Optimistic updates:** descartado a propósito. Con dinero, mostrar un saldo antes de que la API lo confirme haría ver al usuario un estado que todavía no es real.
