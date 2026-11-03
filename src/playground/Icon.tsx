export type IconName =
  'mic' | 'stop' | 'mute' | 'play' | 'external' | 'headphones' | 'layers' | 'chevron' | 'wave';
export function Icon({ type, size = 18 }: { type: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === 'mic' && (
        <>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
        </>
      )}
      {type === 'stop' && (
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
      )}
      {type === 'play' && <path d="m9 5 10 7-10 7z" />}
      {type === 'mute' && (
        <>
          <path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v5M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3" />
        </>
      )}
      {type === 'external' && (
        <>
          <path d="M14 4h6v6m0-6L10 14" />
          <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
        </>
      )}
      {type === 'headphones' && (
        <>
          <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
          <rect x="3" y="12" width="4" height="8" rx="2" />
          <rect x="17" y="12" width="4" height="8" rx="2" />
        </>
      )}
      {type === 'layers' && (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
        </>
      )}
      {type === 'chevron' && <path d="m8 10 4 4 4-4" />}
      {type === 'wave' && <path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4" />}
    </svg>
  );
}
