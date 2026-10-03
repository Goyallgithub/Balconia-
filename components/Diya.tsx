import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  size?: number;
  showGlow?: boolean;
};

/**
 * Line-art diya with flickering flame. Glow is a blurred solid circle (filter),
 * not a CSS gradient. Flame animation respects prefers-reduced-motion via CSS.
 */
export function Diya({ className, size = 64, showGlow = false }: Props) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showGlow ? (
        <span
          className="diya-glow absolute"
          style={{
            width: size * 0.55,
            height: size * 0.55,
            top: "18%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      ) : null}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        {/* Flame */}
        <path
          className="diya-flame"
          d="M32 10 C34.5 16 38 20 38 26 C38 30.4 35.3 33.5 32 33.5 C28.7 33.5 26 30.4 26 26 C26 20 29.5 16 32 10 Z"
          fill="currentColor"
          opacity="0.9"
        />
        {/* Wick */}
        <path d="M32 33.5 V38" stroke="currentColor" strokeWidth="1" />
        {/* Bowl */}
        <path
          d="M16 40 C18 48 24 52 32 52 C40 52 46 48 48 40 Z"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
        {/* Rim */}
        <path
          d="M14 40 C14 37.5 21 36 32 36 C43 36 50 37.5 50 40"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
        {/* Base tip */}
        <path d="M28 52 C30 56 34 56 36 52" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}
