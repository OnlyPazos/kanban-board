/**
 * Utilidad de tests (AC-044): registra los rechazos de promesa que nadie
 * captura mientras está activa. En Vitest (Node + jsdom) llegan como el evento
 * `unhandledRejection` del proceso, no como `unhandledrejection` de `window`.
 */
type NodeProcess = {
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
  off(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
};

export function trackUnhandledRejections() {
  const proc = (globalThis as unknown as { process: NodeProcess }).process;
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => reasons.push(reason);
  proc.on('unhandledRejection', listener);
  return {
    reasons,
    /** Deja pasar un ciclo del event loop para que Node notifique los rechazos pendientes. */
    async flush() {
      await new Promise((resolve) => setTimeout(resolve, 20));
    },
    stop() {
      proc.off('unhandledRejection', listener);
    },
  };
}
