import { EventEmitter } from 'node:events';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from './logger.js';

/**
 * In-process event bus (D-02).
 *
 * Why: three developers own nine modules each. Confirming an order must create a dispatch (C),
 *      an invoice (A) and a subsidy file (A). If projects.service imported all three, nobody
 *      could change a line without breaking two other people.
 * Rules (docs/ARCHITECTURE.md section 6):
 *   1. Emit AFTER the transaction commits — a listener must be able to read the row.
 *   2. Payloads carry ids only; listeners fetch current data.
 *   3. Listeners live in the OWNING module's listeners file.
 *   4. A failing listener is logged and swallowed — it never fails the HTTP request.
 *   5. If it must be atomic with the trigger, it is not a listener (see BR-09).
 */
const bus = new EventEmitter();
bus.setMaxListeners(100);

/**
 * Registers a listener for an event.
 *
 * Why: rule 4 — one bad listener must not take down the others or the request.
 * Flow: wrap the handler so every rejection is caught and logged with the event and payload.
 * Example:
 *   onEvent("project.confirmed", async ({ projectId }) => { ... })
 * Throws: nothing.
 */
export function onEvent(event, handler) {
  bus.on(event, (payload) => {
    Promise.resolve()
      .then(() => handler(payload))
      .catch((err) => {
        logger.error(
          { err, event, payload, listener: handler.name || 'anonymous' },
          'event listener failed',
        );
      });
  });
}

/**
 * Emits an event to every registered listener.
 *
 * Why: rule 1 — call this on the line AFTER prisma.$transaction returns, never inside it.
 * Flow: log the emission then hand the payload to each listener (each isolated by onEvent).
 * Example:
 *   emitEvent("project.confirmed", { projectId: "prj_7xk" })
 * Throws: nothing — listener errors are swallowed by design.
 */
export function emitEvent(event, payload) {
  const listeners = bus.listenerCount(event);
  logger.info({ event, payload, listeners }, 'event emitted');
  if (listeners === 0) {
    // Not an error: an event may legitimately have no subscriber while a module is still
    // being built. Logged so a missing side effect is easy to spot during the hackathon.
    logger.warn({ event }, 'event emitted with no listeners');
  }
  bus.emit(event, payload);
}

/**
 * Imports and registers every module listeners file, once, at boot.
 *
 * Why: listeners must be attached before the server accepts requests, and a module with no
 *      listeners should simply have no file rather than an empty one.
 * Flow: scan src/modules then import each <name>.listeners.js and call its default export.
 * Example:
 *   await registerListeners()
 *   // → logs { modules: ["dispatches", "invoices"], count: 2 }
 * Throws: nothing — an import failure is logged so the server still starts.
 */
export async function registerListeners() {
  const modulesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules');
  if (!existsSync(modulesDir)) return;

  const registered = [];
  const dirs = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const moduleName of dirs) {
    const file = join(modulesDir, moduleName, `${moduleName}.listeners.js`);
    if (!existsSync(file)) continue;

    try {
      const mod = await import(pathToFileURL(file).href);
      if (typeof mod.default === 'function') {
        mod.default();
        registered.push(moduleName);
      } else {
        logger.warn({ moduleName }, 'listeners file has no default export function');
      }
    } catch (err) {
      logger.error({ err, moduleName }, 'failed to register module listeners');
    }
  }

  logger.info({ modules: registered, count: registered.length }, 'registered listeners');
}

/** Test helper: drops every listener so one test file cannot leak into the next. */
export function resetListeners() {
  bus.removeAllListeners();
}
