# Uso de IA

Cómo usé IA para construir la billetera: con qué herramientas, cómo estructuré el trabajo y con qué criterio acepté, modifiqué o rechacé lo que me propuso.

## Herramientas y roles

- **Claude Code** como agente principal: specs, planes, implementación con TDD, revisiones y pruebas contra el mock API.
- **Codex** para los diseños, en paralelo, mientras Claude implementaba las tareas. La parte de diseño la trabajé con las skills de Impeccable. El handoff de diseño (pantallas, tokens y componentes de referencia) salió de Claude Design.
- **Git worktrees** para trabajar varias tareas al mismo tiempo: cada bloque se implementaba en su propio worktree y rama, aislado del resto, y yo hacía el merge al terminar y pasar la revisión.
- **Subagentes** para el trabajo mecánico: instalaciones, scripts temporales y scaffolding. Lo que reportaban lo verificaba antes de darlo por cierto.
- **Dos agentes revisores** que definí para el final de cada bloque, antes del merge: `product-owner` (cumplimiento de las specs, el diseño, las tareas y las reglas del repo) y `security-gate` (seguridad del frontend). Todo hallazgo BLOCKER, CRITICAL o HIGH lo corregí o lo dejé justificado antes de seguir.
- **Skills y agentes de ECC** ([Everything Claude Code](https://github.com/affaan-m/everything-claude-code)), que ya tenía instalados a nivel de sistema (reglas de estilo, testing y seguridad, agentes de revisión, `/plan`, entre otros). Por eso en el repositorio se ven pocos agentes y skills: solo los específicos del proyecto.
- **Impeccable** para refinar la interfaz ya implementada: jerarquía visual, espaciado, estados y detalles de accesibilidad.
- **codebase-memory-mcp** para indexar el código como un grafo (símbolos, llamadas y dependencias), y así consultar la estructura y el impacto de un cambio sin leer archivo por archivo.

## Cómo estructuré los prompts

1. **Brainstorming antes de especificar.** Mucho ida y vuelta con la IA usando el modo explore de OpenSpec (`/opsx:explore`): preguntas sobre la consigna y la API, ideas, alternativas y sus riesgos, hasta tener claro qué construir. Recién después se escribía la spec.
2. **Un archivo de reglas permanente** ([`AGENTS.md`](AGENTS.md)) que escribí para que la IA lo siga en cada sesión: las capas y qué puede importar cada una, las reglas de dinero (centavos, nunca sumar monedas distintas, disponible = saldo − transferencias pendientes, fallar cerrado si el disponible es desconocido, sin reintentos de operaciones), TDD para el dominio y "evidencia antes que supuestos": nunca afirmar cómo se comporta la API sin leer su código o reproducirlo.
3. **Spec primero (SDD).** Para evitar que la IA inventara comportamientos o requisitos, trabajé con Spec-Driven Development, y por eso usé OpenSpec. Cada comportamiento empezó en un change ([`openspec/changes/`](openspec/changes/)) con requisitos y escenarios, y mis prompts de implementación apuntaban a esos escenarios, no a una descripción libre. Lo que no estaba en la spec no se construía.
4. **Por capas y por funcionalidad.** Dominio → capa API → hooks → pantallas, primero para `wallet-core` (sesión, cuentas, movimientos) y después para `transfers`. Cada capa en un bloque con su gate (typecheck, lint, tests) y su revisión.
5. **TDD.** Por cada módulo de lógica, primero un commit `test:` con los tests de los escenarios de la spec, fallando, y después uno `feat:` con la implementación que los hace pasar. Los componentes visuales compartidos quedaron afuera: para ellos decidí no escribir tests y concentrarlos en los flujos críticos y las reglas de dinero.
6. **Plan corto antes de cada bloque**, siempre con `/plan`, y con las preguntas de producto aparte, para no mezclar decisiones con implementación.

## Los tres puntos ambiguos

**Multi-moneda.** Decidí bloquear las transferencias entre monedas distintas y mostrar una equivalencia estimada al tipo de cambio oficial, como referencia. Comprobé en el código del mock que la API no convierte: acredita el mismo número en los dos lados, así que la estimación solo puede ser informativa y siempre va etiquetada como tal. Al revisar el plan encontré dos casos más:
- Con el bloqueo, ningún usuario de prueba podía transferir entre cuentas propias. Por eso agregué el alta mínima de cuenta.
- El campo para transferir a otra persona permitía saltar el bloqueo escribiendo el ID de una cuenta propia en otra moneda. Agregué el escenario a la spec antes de codificar.

**Estado asíncrono (`pending` → `completed`).** Polling cada 1 s con un tope de 10 s, decidido por una función pura del dominio. Dos hallazgos cambiaron la implementación:
- Al revisar el plan vi que, si el tiempo se medía hasta la última respuesta exitosa, con el servidor caído se consultaría para siempre. Ahora cuenta hasta la última respuesta, buena o mala.
- Al probar sin conexión encontré que la transferencia quedaba en espera y **se enviaba sola** al volver la red. Lo corregí: sin conexión, el envío falla y la pantalla avisa que no se pudo confirmar.

**Fondos insuficientes (422).** Valido antes de enviar contra el disponible (saldo menos lo que está en proceso), repito el chequeo al confirmar porque el disponible puede cambiar entre la revisión y el envío, y si la API igual responde 422 refresco los saldos antes de mostrar el error, con el disponible actualizado. No di por hecho que TanStack espera ese refresco antes de marcar el error: lo verifiqué en el código de la librería.

## Aceptado, modificado y rechazado

| Propuesta | Qué hice | Por qué |
|---|---|---|
| Mi idea inicial: TypeScript sin framework, con Zustand | Cambié a React | Evalué los riesgos y pesaron dos: XSS con descripciones escritas por otros usuarios y pérdida de foco al re-renderizar. |
| TanStack Query en lugar de Zustand | Aceptado | El estado es casi todo del servidor; la caché, el polling y las mutaciones salen resueltos. |
| Plan inicial con muchos changes de OpenSpec y más pantallas de las necesarias | Recortado | Era sobreingeniería; lo recorté y verifiqué que no se cayera ningún requisito mínimo. |
| Detalles del handoff de diseño que contradecían las specs | Ganó la spec | Por ejemplo, el diseño permitía transferir entre monedas con un aviso; los dejé anotados como desvíos en el design. |
| Muchos tests unitarios de helpers | Recortados | Me quedé con los de flujos críticos y reglas de dinero. |

## Cómo verifiqué lo que hacía la IA

- **Antes de implementar.** Consultar mucho con OpenSpec antes de escribir código fue lo más útil para evitar problemas: las dudas, los casos borde y las contradicciones aparecían en la spec, donde corregirlos era barato, y no en el código.
- **Contra las specs.** Cada bloque tenía su spec en OpenSpec, con escenarios y una lista de tareas. Lo que entregaba la IA tenía que cumplir esos escenarios, con tests escritos a partir de ellos y el gate en verde (typecheck, lint y tests). Una tarea solo se marcaba hecha si cumplía todo eso, y el revisor de producto lo controlaba contra la spec antes del merge.
- **Contra la API real.** No di por cierto ningún comportamiento del mock sin leer su código o reproducirlo.
- **Prueba en el navegador.** Ahí aparecieron cosas que los tests no simulan: el envío diferido sin conexión y una transferencia trabada en `pending` al cortar el servidor.

## Errores de la IA que corregí

- Hizo los primeros commits sin mi confirmación. Los rehice y desde entonces solo se commitea lo que pido.
- Agregó alcance que nadie había pedido (un requisito de UI en el diseño); lo saqué.
- Marcó una tarea como hecha sin tests de pantalla para varios estados; agregué los de dinero (error de red, moneda distinta, estimación).
