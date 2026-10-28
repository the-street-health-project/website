/**
 * An animated cutaway of an Iowa field: rain soaks into the soil, picks up nitrate (gold dots),
 * drains into the perforated tile line, and pours out into the ditch. With motion turned off,
 * the dots are drawn at fixed points along the same path.
 */
const PATHS = [
  // from the root zone, down through the soil, into the tile, along it, and out to the creek
  'M120 150 C 125 190, 110 230, 140 275 L 610 292 C 650 296, 690 312, 760 330',
  'M240 150 C 250 200, 230 240, 260 279 L 610 292 C 650 296, 690 312, 770 334',
  'M360 150 C 350 195, 375 245, 380 283 L 610 292 C 650 296, 690 312, 750 336',
  'M480 150 C 490 200, 470 245, 500 287 L 610 292 C 650 296, 690 312, 765 340',
];

export function TileDrainageAnimation({ reducedMotion }: { reducedMotion: boolean }) {
  const dots = PATHS.flatMap((path, i) => [0, 1, 2].map((j) => ({ path, begin: -(i * 1.3 + j * 2.4), key: `${i}-${j}` })));
  const rain = Array.from({ length: 22 }, (_, i) => ({ x: 40 + i * 26, delay: (i * 0.37) % 1.6 }));

  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-card">
      <svg viewBox="0 0 800 360" className="block h-auto w-full" role="img" aria-labelledby="tile-title tile-desc">
        <title id="tile-title">How nitrate gets from a field to a creek</title>
        <desc id="tile-desc">
          Rain falls on a corn field and soaks through the soil, carrying nitrate down to a perforated tile drainage pipe about four feet underground. The pipe
          carries the water and nitrate straight out to a ditch or creek.
        </desc>
        <defs>
          <linearGradient id="cc-tile-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#020604" />
            <stop offset="1" stopColor="#0b2a1b" />
          </linearGradient>
          <linearGradient id="topsoil" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5b3d26" />
            <stop offset="1" stopColor="#7a5636" />
          </linearGradient>
          <linearGradient id="subsoil" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a07a52" />
            <stop offset="1" stopColor="#b8946a" />
          </linearGradient>
        </defs>

        {/* sky, cloud, and rain */}
        <rect width="800" height="150" fill="url(#cc-tile-sky)" />
        <g fill="#1d3a2b">
          <ellipse cx="300" cy="42" rx="120" ry="26" />
          <ellipse cx="380" cy="34" rx="90" ry="28" />
          <ellipse cx="230" cy="40" rx="70" ry="20" />
        </g>
        <g stroke="#39ff88" strokeWidth="3" strokeLinecap="round">
          {rain.map((r) => (
            <line key={r.x} x1={r.x + 140} y1="70" x2={r.x + 136} y2="84" className={reducedMotion ? '' : 'cc-rain'} style={{ animationDelay: `${r.delay}s` }} />
          ))}
        </g>

        {/* field surface with corn */}
        <rect y="150" width="800" height="70" fill="url(#topsoil)" />
        <rect y="220" width="800" height="140" fill="url(#subsoil)" />
        {[60, 140, 220, 300, 380, 460, 540].map((x) => (
          <g key={x} transform={`translate(${x} 150)`}>
            <line y2="-58" stroke="#2e6b30" strokeWidth="5" strokeLinecap="round" />
            <path d="M0 -22 C 14 -30, 24 -26, 32 -18 M0 -36 C -14 -44, -24 -40, -32 -32 M0 -48 C 12 -56, 20 -54, 26 -46" stroke="#3f8f3f" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* roots */}
            <path d="M0 0 C -6 16, -14 26, -18 40 M0 0 C 4 18, 12 28, 16 44 M0 0 L 0 46" stroke="#e8d3a7" strokeWidth="2" fill="none" opacity="0.7" />
          </g>
        ))}

        {/* ditch / creek on the right */}
        <path d="M630 150 C 680 150, 700 200, 720 300 L 800 300 L 800 150 Z" fill="url(#cc-tile-sky)" />
        <path d="M640 160 C 690 165, 705 220, 722 300" stroke="#5b3d26" strokeWidth="6" fill="none" />
        <rect x="715" y="300" width="85" height="60" fill="#2f7fd1" />
        <path d="M715 300 Q 740 292 760 300 T 800 300" fill="#4c97e0" className={reducedMotion ? '' : 'cc-wave'} />

        {/* the tile line: a perforated pipe about 4 feet down, sloping to the ditch */}
        <path d="M60 272 L 625 290" stroke="#2c3138" strokeWidth="22" strokeLinecap="round" />
        <path d="M60 272 L 625 290" stroke="#59616b" strokeWidth="16" strokeLinecap="round" />
        <path d="M60 272 L 625 290" stroke="#39ff88" strokeWidth="6" strokeLinecap="round" strokeDasharray="14 12" className={reducedMotion ? '' : 'cc-flow'} />
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={90 + i * 30} cy={273 + i * 0.95 - 8} r="2.2" fill="#1d2228" />
        ))}
        <path d="M625 290 L 716 300" stroke="#59616b" strokeWidth="16" />

        {/* nitrate riding the water */}
        <g>
          {dots.map((d) =>
            reducedMotion ? null : (
              <circle key={d.key} r="6" fill="#f2b324" stroke="#6b4e00" strokeWidth="1.5">
                <animateMotion dur="7.2s" begin={`${d.begin}s`} repeatCount="indefinite" path={d.path} rotate="0" />
              </circle>
            ),
          )}
          {reducedMotion &&
            [
              [128, 200],
              [250, 230],
              [372, 250],
              [480, 270],
              [560, 289],
              [690, 307],
            ].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="6" fill="#f2b324" stroke="#6b4e00" strokeWidth="1.5" />)}
        </g>

        {/* labels */}
        <g fontFamily="Atkinson Hyperlegible, system-ui, sans-serif" fontWeight="700" fontSize="17">
          <text x="470" y="40" fill="#eafff2">Rain</text>
          {/* white labels get a dark outline so they stay readable on any soil color */}
          <g fill="#fff" stroke="#1d1208" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
            <text x="20" y="182">Soil nitrate</text>
            <text x="638" y="350">Ditch / creek</text>
            <text x="80" y="320">Tile line, about 4 ft down</text>
          </g>
        </g>
        <g transform="translate(560 182)">
          <circle r="7" fill="#f2b324" stroke="#6b4e00" strokeWidth="1.5" />
          <text x="14" y="6" fontFamily="Atkinson Hyperlegible, system-ui, sans-serif" fontWeight="700" fontSize="16" fill="#fff" stroke="#1d1208" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
            = nitrate
          </text>
        </g>
      </svg>
      <figcaption className="px-4 py-3 text-ink-2">
        Tile lines drain wet fields so they can be farmed, but they also give nitrate a fast route to streams, skipping the soil and plants that could have
        used it.
      </figcaption>
    </figure>
  );
}
