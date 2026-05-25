interface PAUMShieldProps {
  className?: string;
}

export default function PAUMShield({ className = '' }: PAUMShieldProps) {
  return (
    <svg
      viewBox="0 0 640 640"
      className={className}
      role="img"
      aria-label="Escudo del Profesional Asociado en Urgencias Medicas de la BUAP"
    >
      <defs>
        <linearGradient id="paumOuterRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B67B2" />
          <stop offset="100%" stopColor="#155AA5" />
        </linearGradient>
        <linearGradient id="paumShieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFDA1F" />
          <stop offset="100%" stopColor="#F8B400" />
        </linearGradient>
        <linearGradient id="paumHandShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F22F3B" />
          <stop offset="100%" stopColor="#E00024" />
        </linearGradient>
        <path id="paumBottomArc" d="M 126 428 A 194 194 0 0 0 514 428" />
      </defs>

      <circle cx="320" cy="320" r="274" fill="#FFFFFF" />
      <circle cx="320" cy="320" r="260" fill="none" stroke="url(#paumOuterRing)" strokeWidth="14" />
      <circle cx="320" cy="320" r="188" fill="#FFFFFF" stroke="#155AA5" strokeWidth="10" />

      <path
        d="M 88 318 L 168 318 L 186 314 L 202 322 L 221 280 L 237 336 L 254 318 L 388 318 L 407 326 L 421 258 L 438 340 L 456 318 L 552 318"
        fill="none"
        stroke="#E5162B"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      <g transform="translate(320 320)">
        <g fill="#2F2A76" stroke="#FFFFFF" strokeWidth="13" strokeLinejoin="round">
          <rect x="-154" y="-50" width="308" height="100" rx="8" />
          <rect x="-154" y="-50" width="308" height="100" rx="8" transform="rotate(60)" />
          <rect x="-154" y="-50" width="308" height="100" rx="8" transform="rotate(120)" />
        </g>
        <g fill="none" stroke="#19175C" strokeWidth="5" opacity="0.85">
          <rect x="-146" y="-43" width="292" height="86" rx="6" />
          <rect x="-146" y="-43" width="292" height="86" rx="6" transform="rotate(60)" />
          <rect x="-146" y="-43" width="292" height="86" rx="6" transform="rotate(120)" />
        </g>
      </g>

      <rect x="302" y="122" width="36" height="388" rx="18" fill="#8A4A24" stroke="#5A2A14" strokeWidth="4" />
      <path
        d="M 338 138 C 274 114 248 186 302 214 C 354 240 352 294 306 316 C 262 338 268 394 324 416 C 364 432 366 474 326 500"
        fill="none"
        stroke="#0A9D48"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 336 140 C 322 136 310 138 300 144 C 312 146 322 154 330 164"
        fill="none"
        stroke="#0A9D48"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <g transform="translate(320 278)">
        <path d="M -11 -50 L 11 -50 L 17 -20 L -17 -20 Z" fill="#E4BE00" />
        <path d="M -22 -14 L -12 -52 L 0 -18 L 12 -52 L 22 -14 Z" fill="#F9D648" />
        <circle cx="0" cy="4" r="26" fill="#F7DE63" stroke="#202020" strokeWidth="3" />
        <path d="M -28 2 C -22 -22 22 -22 28 2 L 28 -4 C 18 -24 -18 -24 -28 -4 Z" fill="#171717" />
        <path d="M -15 11 C -6 3 6 3 15 11" fill="none" stroke="#202020" strokeWidth="3" strokeLinecap="round" />
        <path d="M -10 28 C -28 40 -34 64 -32 86 L 32 86 C 34 64 28 40 10 28 Z" fill="#F7DE63" stroke="#202020" strokeWidth="3" />
        <path d="M -16 92 C -9 76 -4 68 0 66 C 4 68 9 76 16 92" fill="none" stroke="#F3C100" strokeWidth="8" strokeLinecap="round" />
      </g>

      <g transform="translate(320 384)">
        <path
          d="M 0 -64 L 70 -40 L 56 42 C 36 70 12 92 0 100 C -12 92 -36 70 -56 42 L -70 -40 Z"
          fill="url(#paumShieldFill)"
          stroke="#E8BB00"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M 0 -52 L 58 -32 L 45 34 C 29 57 10 73 0 81 C -10 73 -29 57 -45 34 L -58 -32 Z"
          fill="url(#paumHandShield)"
          stroke="#FFD53C"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M -18 -6 C -14 -30 14 -30 18 -10 C 28 0 34 18 28 24 C 24 30 20 26 16 20 C 16 28 12 34 6 34 C 2 34 -2 30 -2 24 C -2 32 -6 38 -12 38 C -18 38 -20 32 -18 24 C -22 28 -28 28 -30 22 C -34 14 -26 0 -18 -6 Z"
          fill="#FFD89A"
          stroke="#F5C77B"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>

      <text
        x="320"
        y="124"
        textAnchor="middle"
        fontSize="82"
        fontWeight="900"
        letterSpacing="12"
        fill="#151515"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        BUAP
      </text>

      <text
        fill="#151515"
        fontSize="31"
        fontWeight="900"
        letterSpacing="1.4"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        <textPath href="#paumBottomArc" startOffset="50%" textAnchor="middle">
          PROFESIONAL ASOCIADO EN URGENCIAS MEDICAS
        </textPath>
      </text>
    </svg>
  );
}
