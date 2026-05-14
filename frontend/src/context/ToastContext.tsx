import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type ToastVariant = "info" | "success" | "error";

type ToastRecord = {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving: boolean;
};

const DISPLAY_MS = 3200;
const LEAVE_ANIM_MS = 420;

let pushToast: ((message: string, variant: ToastVariant) => void) | null =
  null;

export function toast(message: string, variant: ToastVariant = "info") {
  pushToast?.(message, variant);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const show = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++seq.current;
      setToasts((t) =>
        [...t, { id, message, variant, leaving: false }].slice(-5)
      );

      const displayTm = setTimeout(() => {
        timers.current.delete(id);
        setToasts((ts) =>
          ts.map((x) => (x.id === id ? { ...x, leaving: true } : x))
        );
        const removeTm = setTimeout(() => {
          timers.current.delete(id);
          setToasts((ts) => ts.filter((x) => x.id !== id));
        }, LEAVE_ANIM_MS);
        timers.current.set(id, removeTm);
      }, DISPLAY_MS);
      timers.current.set(id, displayTm);
    },
    []
  );

  useEffect(() => {
    pushToast = show;
    return () => {
      pushToast = null;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, [show]);

  return (
    <>
      {children}
      <div
        className="toast-viewport"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-item toast-item--${t.variant}${
              t.leaving ? " toast-item--leave" : ""
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
