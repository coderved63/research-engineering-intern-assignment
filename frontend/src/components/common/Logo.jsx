export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="logo-gradient-light" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="32" cy="32" r="28" stroke="url(#logo-gradient)" strokeWidth="3" fill="none" />

      {/* Middle ring */}
      <circle cx="32" cy="32" r="20" stroke="url(#logo-gradient-light)" strokeWidth="2" fill="none" opacity="0.7" />

      {/* Crosshair lines */}
      <line x1="32" y1="2" x2="32" y2="14" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="50" x2="32" y2="62" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="32" x2="14" y2="32" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="32" x2="62" y2="32" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" />

      {/* Network nodes inside */}
      <circle cx="22" cy="24" r="3" fill="url(#logo-gradient)" />
      <circle cx="42" cy="22" r="3" fill="url(#logo-gradient)" />
      <circle cx="32" cy="38" r="3" fill="url(#logo-gradient)" />
      <circle cx="20" cy="40" r="2.5" fill="url(#logo-gradient-light)" />
      <circle cx="44" cy="40" r="2.5" fill="url(#logo-gradient-light)" />

      {/* Connecting lines */}
      <line x1="22" y1="24" x2="42" y2="22" stroke="url(#logo-gradient-light)" strokeWidth="1.5" opacity="0.6" />
      <line x1="22" y1="24" x2="32" y2="38" stroke="url(#logo-gradient-light)" strokeWidth="1.5" opacity="0.6" />
      <line x1="42" y1="22" x2="32" y2="38" stroke="url(#logo-gradient-light)" strokeWidth="1.5" opacity="0.6" />
      <line x1="20" y1="40" x2="32" y2="38" stroke="url(#logo-gradient-light)" strokeWidth="1.5" opacity="0.6" />
      <line x1="44" y1="40" x2="32" y2="38" stroke="url(#logo-gradient-light)" strokeWidth="1.5" opacity="0.6" />

      {/* Center dot */}
      <circle cx="32" cy="32" r="2" fill="url(#logo-gradient)" />
    </svg>
  )
}
