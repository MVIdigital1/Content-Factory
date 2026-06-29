type LogoVariant = "light" | "dark";

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  horizontal?: boolean;
  className?: string;
}

const SIGN_COLOR = {
  light: "#f0ebe3",
  dark: "#2d1b4e",
};

function PrismSign({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size * (178 / 180)}
      viewBox="0 0 180 178"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="15" y1="140" x2="115" y2="10" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <line x1="165" y1="140" x2="65" y2="10" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <text
        x="90"
        y="168"
        fontFamily="Georgia, serif"
        fontSize="22"
        fill="#c9847a"
        textAnchor="middle"
        letterSpacing="7"
      >
        ira
      </text>
    </svg>
  );
}

export default function Logo({ variant = "dark", size = 48, horizontal = false, className = "" }: LogoProps) {
  const color = SIGN_COLOR[variant];
  const textColor = variant === "light" ? "#f0ebe3" : "#2d1b4e";

  if (horizontal) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <PrismSign color={color} size={size} />
        <div className="flex flex-col leading-none">
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 300,
              fontSize: size * 0.44,
              color: textColor,
              letterSpacing: "0.06em",
            }}
          >
            mvira
          </span>
          <span
            style={{
              fontSize: size * 0.17,
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              color: "#c9847a",
              marginTop: 3,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Marketing AI
          </span>
        </div>
      </div>
    );
  }

  return <PrismSign color={color} size={size} className={className} />;
}
