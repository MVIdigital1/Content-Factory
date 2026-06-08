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
  success: { background: "var(--success-bg)", color: "var(--success-text)" },
  warning: { background: "var(--warning-bg)", color: "var(--warning-text)" },
  danger: { background: "var(--danger-bg)", color: "var(--danger-text)" },
  info: { background: "var(--info-bg)", color: "var(--info-text)" },
  accent: { background: "var(--primary)", color: "var(--on-primary)" },
  muted: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
  purple: { background: "var(--purple-bg)", color: "var(--purple-text)" },
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
