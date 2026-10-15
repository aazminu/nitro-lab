// Same drawing as app/icon.svg, but using the current text color
export default function Mark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 14.5 16 4l12 10.5V28H4z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="9.5" y="15" width="13" height="4.2" rx="1.2" fill="currentColor" />
      <rect x="9.5" y="21" width="13" height="4.2" rx="1.2" fill="currentColor" />
      <circle cx="19.6" cy="17.1" r="1" fill="var(--up)" />
      <circle cx="19.6" cy="23.1" r="1" fill="var(--up)" />
    </svg>
  );
}
