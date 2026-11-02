let csrfTokenGetter: (() => string | null) | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function registerCsrfTokenGetter(getter: () => string | null): void {
  csrfTokenGetter = getter;
}

export function getCsrfToken(): string | null {
  return csrfTokenGetter?.() ?? null;
}

export function registerSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

export function handleExpiredSession(): void {
  sessionExpiredHandler?.();
}
