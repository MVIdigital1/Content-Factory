interface Props {
  abbr: string;
  color: string;
  textColor?: string;
  size?: "sm" | "md" | "lg";
}

export function PlatformLogo({
  abbr,
  color,
  textColor = "#fff",
  size = "sm",
}: Props) {
  const sz =
    size === "sm"
      ? { width: 22, height: 16, fontSize: 8 }
      : size === "md"
        ? { width: 28, height: 20, fontSize: 9 }
        : { width: 36, height: 26, fontSize: 11 };
  return (
    <div
      style={{
        ...sz,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        color: textColor,
        background: color,
        flexShrink: 0,
      }}
    >
      {abbr}
    </div>
  );
}
