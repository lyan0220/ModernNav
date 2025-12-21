import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { storageService } from "../services/storage";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = storageService.subscribeNotifications(
      (type, message) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);

        // Auto dismiss
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
      }
    );

    return () => unsubscribe();
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md animate-fade-in-down transition-all
            ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100"
                : ""
            }
            ${
              toast.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-100"
                : ""
            }
            ${
              toast.type === "info"
                ? "bg-blue-500/10 border-blue-500/20 text-blue-100"
                : ""
            }
          `}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === "success" && (
              <CheckCircle size={18} className="text-emerald-400" />
            )}
            {toast.type === "error" && (
              <AlertCircle size={18} className="text-red-400" />
            )}
            {toast.type === "info" && (
              <Info size={18} className="text-blue-400" />
            )}
          </div>
          <p className="flex-1 text-xs font-medium leading-relaxed opacity-90">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
