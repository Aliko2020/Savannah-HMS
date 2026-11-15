// Small inline SVG icons (no icon library needed). They take the current text colour.
const Svg = ({ children, size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const PharmacyIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 7.5v9M7.5 12h9" />
  </Svg>
);

export const PillIcon = (p) => (
  <Svg {...p}>
    <path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7z" />
    <path d="m8.5 8.5 7 7" />
  </Svg>
);

export const UserIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const LockIcon = (p) => (
  <Svg {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const EyeOffIcon = (p) => (
  <Svg {...p}>
    <path d="M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.16 3.19M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
  </Svg>
);

export const LoginIcon = (p) => (
  <Svg {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="m10 17 5-5-5-5M15 12H3" />
  </Svg>
);

export const PrinterIcon = (p) => (
  <Svg {...p}>
    <path d="M6 9V2h12v7" />
    <rect x="6" y="14" width="12" height="8" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
  </Svg>
);
