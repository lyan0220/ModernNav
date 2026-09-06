// App-wide user-facing notification emitter. ToastContainer subscribes here;
// non-React modules (e.g. TanStack Query mutations) can raise toasts without
// importing component code or creating import cycles.
type NotifyType = "success" | "error" | "info";
type NotifyListener = (type: NotifyType, message: string) => void;

const listeners: NotifyListener[] = [];

export function subscribeNotifications(listener: NotifyListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

export function notify(type: NotifyType, message: string): void {
  listeners.forEach((listener) => listener(type, message));
}
