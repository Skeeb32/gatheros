export function EventArt({
  variant = 0,
  className = "",
}: {
  variant?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`art ${className}`}>
      <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
        {variant % 3 === 0 ? (
          <>
            <rect width="600" height="420" fill="#c99b79" />
            <circle cx="445" cy="105" r="95" fill="#eed9ac" />
            <path d="M0 270L600 180V420H0Z" fill="#657465" />
            <path d="M0 325L600 245V420H0Z" fill="#3c5148" />
            <path
              d="M65 420V60M88 420V62M65 100Q160 20 240 85"
              stroke="#394b3c"
              strokeWidth="15"
              fill="none"
            />
            <path d="M65 120Q-5 0 155 0Q165 85 65 120" fill="#526852" />
            <ellipse cx="365" cy="322" rx="160" ry="37" fill="#b66d45" />
            <path
              d="M230 327L210 420M490 327L510 420"
              stroke="#563e2e"
              strokeWidth="16"
            />
            <path d="M328 226H366L357 288H337Z" fill="#efd9a4" />
            <path
              d="M347 283V318M333 318H361"
              stroke="#f2e3c5"
              strokeWidth="4"
            />
            <path d="M406 255H429L425 312H410Z" fill="#d49f79" />
            <circle cx="280" cy="320" r="13" fill="#e4ceaa" />
          </>
        ) : variant % 3 === 1 ? (
          <>
            <rect width="600" height="420" fill="#839183" />
            <path d="M0 150L600 60V420H0Z" fill="#b88865" />
            <path d="M0 224L600 134V340L0 430Z" fill="#ead6ac" />
            {[100, 290, 490].map((x, i) => (
              <g key={x} transform={`translate(${x} ${270 - i * 30})`}>
                <ellipse rx="65" ry="38" fill="#f8ecd4" />
                <ellipse rx="46" ry="26" fill="#d1bb94" />
                <ellipse rx="30" ry="17" fill="#677653" />
                <path
                  d="M75 -45V35M86 -45V35"
                  stroke="#6d6957"
                  strokeWidth="4"
                />
                <path d="M-55 -82H-25L-30 -40H-50Z" fill="#a16445" />
              </g>
            ))}
            <path
              d="M235 60Q250 150 205 205"
              stroke="#4e624b"
              strokeWidth="5"
            />
            <ellipse cx="239" cy="75" rx="17" ry="45" fill="#526f47" />
          </>
        ) : (
          <>
            <rect width="600" height="420" fill="#d4c5a7" />
            <rect x="65" y="170" width="465" height="250" fill="#a7ab86" />
            <path d="M30 180L95 62H510L575 180Z" fill="#e9dec0" />
            {[85, 185, 285, 385, 485].map((x) => (
              <path key={x} d={`M${x} 62h48l20 118h-60z`} fill="#a95535" />
            ))}
            <rect x="85" y="193" width="425" height="145" fill="#677761" />
            <path d="M85 345H510V420H85Z" fill="#ae805b" />
            {[140, 240, 340, 440].map((x, i) => (
              <g key={x}>
                <rect
                  x={x - 25}
                  y={285 - (i % 2) * 22}
                  width="50"
                  height="52"
                  rx="10"
                  fill={i % 2 ? "#e3cda2" : "#c69058"}
                />
                <path d={`M${x} 286q-30 -50 0 -70q30 20 0 70`} fill="#95a276" />
              </g>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
