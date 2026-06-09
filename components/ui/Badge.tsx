export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "muted"
  | "purple";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const STYLES: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: "var(--pos-dim)", color: "var(--pos)" },
  warning: { background: "rgba(181,80,10,0.08)", color: "var(--c-3)" },
  danger: { background: "rgba(193,18,31,0.08)", color: "var(--neg)" },
  info: { background: "rgba(37,99,235,0.08)", color: "#2563eb" },
  accent: { background: "var(--primary)", color: "var(--on-accent)" },
  muted: { background: "var(--chip)", color: "var(--tx-2)" },
  purple: { background: "rgba(124,58,237,0.08)", color: "#7c3aed" },
};

export function Badge({ variant, children, style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 6px",
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 600,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        ...STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
