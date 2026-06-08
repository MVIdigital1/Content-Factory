interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "ghost",
  size = "md",
  children,
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 7,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    lineHeight: 1,
    transition: "opacity 0.12s",
    fontSize: size === "sm" ? 10 : size === "lg" ? 13 : 11,
    padding:
      size === "sm" ? "4px 10px" : size === "lg" ? "10px 18px" : "5px 12px",
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--primary)",
      color: "var(--on-primary)",
      border: "none",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "0.5px solid var(--border)",
    },
    danger: { background: "var(--danger)", color: "#fff", border: "none" },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}
