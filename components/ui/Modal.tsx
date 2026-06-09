"use client";
import { useEffect, useCallback } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

const WIDTHS = { sm: 420, md: 580, lg: 780, xl: 1000 };

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
}: ModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: WIDTHS[size],
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "0.5px solid var(--line)",
              position: "sticky",
              top: 0,
              background: "var(--panel)",
              zIndex: 1,
            }}
          >
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}
            >
              {title}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--tx-2)",
                fontSize: 18,
                lineHeight: 1,
                padding: "2px 6px",
                borderRadius: 5,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: "16px" }}>{children}</div>
      </div>
    </div>
  );
}
