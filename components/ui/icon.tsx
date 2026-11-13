import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  inbox: "M4 4h16v16H4z M4 13h5l2 3h2l2-3h5",
  file: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7",
  bag: "M5 7h14l1 14H4L5 7z M9 7V5a3 3 0 0 1 6 0v2",
  box: "m3 7 9-4 9 4v11l-9 4-9-4V7z M3 7l9 4 9-4 M12 11v11",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M18 8a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2h4l1 3 3 1 3 1v4l-2 2 1 3-3 3-3-1-2 2H8l-1-3-3-1-2-3 2-3-1-3 3-3 3 1 1-3z",
  search: "m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  plus: "M12 5v14 M5 12h14",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12 M18 6 6 18",
  logout: "M9 3H4v18h5 M10 12h11 M16 7l5 5-5 5",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  trend: "m3 17 6-6 4 4 8-10 M15 5h6v6",
  leaf: "M20 3C6 2 1 10 6 16c5 6 15 1 14-13Z M4 21 16 9",
  edit: "m15 4 5 5 M3 21l5-1L21 7l-5-5L3 15v6z",
  location:
    "M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1 1 16 0 M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  mail: "M3 5h18v14H3z M3 5l9 8 9-8",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  help: "M9 9a3 3 0 1 1 4 3v3 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  link: "M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2",
  wallet: "M3 6h17v15H3z M3 6V3h15v3 M15 12h6v5h-6z",
  fish: "M3 12c4-8 11-8 15 0-4 8-11 8-15 0Z M18 12l4-5v10l-4-5 M7 11h.01",
};
export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}
