import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  color?: string;
  count?: number;
};

/**
 * Thin horizontal garland of marigold leaf/flower shapes on a hairline.
 * Subtle sway via .toran-leaf (disabled under prefers-reduced-motion).
 */
export function Toran({ className, color = "var(--marigold)", count = 17 }: Props) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className={cn("relative flex w-full items-start justify-center overflow-hidden py-2", className)}
      aria-hidden
      style={{ color }}
    >
      <div className="absolute left-0 right-0 top-0 h-px bg-current opacity-70" />
      <div className="flex w-full max-w-5xl items-start justify-between px-2 pt-0">
        {items.map((i) => {
          const isFlower = i % 3 === 1;
          return (
            <svg
              key={i}
              className="toran-leaf shrink-0"
              width={isFlower ? 14 : 10}
              height={isFlower ? 18 : 16}
              viewBox="0 0 14 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ marginTop: i % 2 === 0 ? 2 : 6 }}
            >
              {isFlower ? (
                <>
                  <path
                    d="M7 2 C8.5 5 11 6.5 11 9 C11 11.2 9.2 13 7 13 C4.8 13 3 11.2 3 9 C3 6.5 5.5 5 7 2 Z"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                  />
                  <circle cx="7" cy="9" r="1.2" stroke="currentColor" strokeWidth="1" fill="none" />
                  <path d="M7 13 V19" stroke="currentColor" strokeWidth="1" />
                </>
              ) : (
                <path
                  d="M7 1 C10 5 11 9 7 14 C3 9 4 5 7 1 Z"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                  transform="translate(0 2)"
                />
              )}
            </svg>
          );
        })}
      </div>
    </div>
  );
}
