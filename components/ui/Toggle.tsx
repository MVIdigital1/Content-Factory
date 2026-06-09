"use client";
import { useState } from "react";

interface ToggleProps {
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ defaultOn = false, onChange, disabled }: ToggleProps) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => {
        const n = !on;
        setOn(n);
        onChange?.(n);
      }}
      style={{
        position: "relative",
        width: 30,
        height: 17,
        borderRadius: 10,
        background: on ? "var(--primary)" : "var(--chip)",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
        transition: "background 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          width: 13,
          height: 13,
          background: "#fff",
          borderRadius: "50%",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          transition: "left 0.12s",
          left: on ? 15 : 2,
        }}
      />
    </button>
  );
}
