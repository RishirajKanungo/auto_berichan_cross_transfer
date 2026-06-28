"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onMouseDown={onClose}
    >
      <div
        className={cn("card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden shadow-2xl", className)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-lg font-semibold">{title}</div>
            <button className="btn btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "var(--border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
