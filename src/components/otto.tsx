// Otto, the Order Desk robot, redrawn small from orderdesk.com's artwork.
// The body is a stub that ends at the bottom edge: he is only ever seen
// peeking over the Order Desk link or holding a package in front of him.
export function Otto({
  armClassName,
  carrying = false,
  height = 26,
}: {
  armClassName?: string;
  carrying?: boolean;
  height?: number;
}) {
  return (
    <svg
      viewBox="0 0 34 40"
      width={(height * 34) / 40}
      height={height}
      className="block"
    >
      <path
        d="M15 10q-1.6-1 0-2t0-2 0-2"
        fill="none"
        stroke="#008db7"
        strokeWidth={1}
        strokeLinecap="round"
      />
      <circle cx={15} cy={2.8} r={1.7} fill="#fccf5e" />
      <rect x={7} y={10} width={16} height={13} rx={2.2} fill="#008db7" />
      <ellipse cx={12} cy={15.6} rx={1.5} ry={2} fill="#fccf5e" />
      <ellipse cx={18} cy={15.6} rx={1.5} ry={2} fill="#fccf5e" />
      <path
        d="M12.6 19.6q2.4 1.2 4.8 0"
        fill="none"
        stroke="#006070"
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <rect x={13} y={23} width={4} height={2} fill="#0080aa" />
      <rect x={5} y={25} width={20} height={16} rx={1.5} fill="#008db7" />
      <rect x={8.5} y={27} width={13} height={6} rx={0.6} fill="#fff" />
      {carrying && (
        <g>
          <rect x={3} y={30} width={18} height={10} rx={1} fill="#c8904a" />
          <rect x={10.5} y={30} width={3} height={10} fill="#e9c58c" />
        </g>
      )}
      {/* The waving arm pivots on the shoulder. */}
      <g className={`origin-[25px_28px] [transform-box:view-box] motion-reduce:animate-none ${armClassName ?? ""}`}>
        <path
          d="M25 28 30 21"
          stroke="#008db7"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={30.6} cy={19.6} r={2.1} fill="#fccf5e" />
      </g>
    </svg>
  );
}
