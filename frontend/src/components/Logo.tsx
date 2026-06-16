// Logo da marca "T.I STORAGE": uma caixa com camadas empilhadas (gavetas),
// remetendo a armazenamento/gestão de ativos. Usada na barra e no login.
export function Logo({
  size = 28,
  withText = true,
}: {
  size?: number;
  withText?: boolean;
}) {
  return (
    <span className="logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="T.I STORAGE"
      >
        <defs>
          <linearGradient
            id="ti-logo-grad"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#2563eb" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="24" height="24" rx="6" fill="url(#ti-logo-grad)" />
        {/* camadas empilhadas = armazenamento */}
        <rect x="9" y="9" width="14" height="4" rx="1.4" fill="#fff" opacity="0.95" />
        <rect x="9" y="15" width="14" height="4" rx="1.4" fill="#fff" opacity="0.7" />
        <rect x="9" y="21" width="14" height="4" rx="1.4" fill="#fff" opacity="0.45" />
      </svg>
      {withText && (
        <span className="logo-text">
          <strong>T.I</strong> STORAGE
        </span>
      )}
    </span>
  );
}
