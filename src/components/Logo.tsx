import { useId } from "react";

type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

/**
 * Local coordinate space for a single chopstick, centered on (0,0),
 * spanning roughly x=-39 (blunt butt) to x=39 (pointed tip). Consumers
 * wrap it in a <g transform="translate(cx,cy) rotate(deg)"> to place it.
 */
function ChopstickBody({ gradientId }: { gradientId: string }) {
  return (
    <path
      d="M -34,-4.6 Q -39,-4.6 -39,0 Q -39,4.6 -34,4.6 C -18,5.3 2,4.6 20,3.1 C 30,2.3 35.5,1.4 39,0 C 35.5,-1.4 30,-2.3 20,-3.1 C 2,-4.6 -18,-5.3 -34,-4.6 Z"
      fill={`url(#${gradientId})`}
    />
  );
}

/** A single tapered, rounded chopstick with a soy-wood body and a salmon tip accent. */
export function Chopstick({ className }: { className?: string }) {
  const uid = useId();
  const gradientId = `chopstick-grad-${uid}`;
  return (
    <g className={className}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="-39"
          x2="39"
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--color-soy)" />
          <stop offset="60%" stopColor="var(--color-soy)" />
          <stop offset="86%" stopColor="var(--color-salmon)" />
          <stop offset="100%" stopColor="var(--color-salmon-dark)" />
        </linearGradient>
      </defs>
      <ChopstickBody gradientId={gradientId} />
    </g>
  );
}

/**
 * The "All You Can Fight" mark: two crossed chopsticks in a clashing-swords
 * pose. Pure inline SVG, scales cleanly with `size`.
 */
export function Logo({ size = 64, withWordmark = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="All You Can Fight"
        className="shrink-0"
      >
        <g transform="translate(50,50) rotate(-45)">
          <Chopstick />
        </g>
        <g transform="translate(50,50) rotate(45)">
          <Chopstick />
        </g>
      </svg>
      {withWordmark && (
        <span className="font-display text-xl font-extrabold uppercase leading-none tracking-tight text-nori sm:text-2xl">
          All You Can <span className="text-salmon">Fight</span>
        </span>
      )}
    </span>
  );
}
