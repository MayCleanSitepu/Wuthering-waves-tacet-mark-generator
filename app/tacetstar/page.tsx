"use client";

import { useMemo, useRef, useState } from "react";

type Point = { x: number; topY: number; bottomY: number };
type StarMarker = { x: number; y: number; h: number };

// helper: bikin path melengkung (quadratic bezier) dari list titik
function buildSmoothPath(
  points: { x: number; y: number }[],
  moveToStart: boolean
): string {
  if (points.length < 2) return "";

  let d = "";

  if (moveToStart) {
    d += `M ${points[0].x} ${points[0].y}`;
  } else {
    d += `L ${points[0].x} ${points[0].y}`;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;

    // p0 = control point, midpoint = end point
    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

export default function TacetStarsPage() {
  const [lineLength, setLineLength] = useState(600);
  const [maxAmp, setMaxAmp] = useState(70);
  const [segments, setSegments] = useState(80);
  const [sharpness, setSharpness] = useState(2); // bentuk “buntut” sekitar star
  const [noiseAmount, setNoiseAmount] = useState(8);
  const [color, setColor] = useState("#333333");
  const [showGuides, setShowGuides] = useState(true);

  const [seed, setSeed] = useState(0); // buat reroll random
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { pathD, width, height, starMarkers } = useMemo(() => {
  const paddingX = 50;
  const paddingY = 40;

  const width = lineLength + paddingX * 2;
  const height = maxAmp * 2 + paddingY * 2;
  const centerY = height / 2;

  const pts: Point[] = [];
  const stepX = lineLength / segments;

  const numStars = 5;

  // 1) Tentukan index untuk 5 star → supaya spike bisa tepat di grid
  const starIndices = Array.from({ length: numStars }, (_, i) =>
    Math.round(((i + 1) * segments) / (numStars + 1)) // contoh: sekitar 1/6, 2/6, ... 5/6
  );

  // 2) Tinggi masing-masing star: outer < inner < center
  const heightFactors = [0.6, 0.8, 1, 0.8, 0.6]; // utk 5 star

  const starHeights = starIndices.map((_, i) => {
    const factor = heightFactors[i] ?? 1;
    const jitter = 0.9 + Math.random() * 0.2; // biar ga kaku banget (0.9–1.1)
    return maxAmp * factor * jitter;
  });

  // 3) Radius pengaruh tiap star dalam Satuan INDEX (bukan 0..1)
  const baseRadius = segments / (numStars * 2); // kira-kira setengah jarak antar star
  const radius = baseRadius * 1.2; // bisa kamu tweak kalau buntutnya mau lebih panjang/pendek

  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // masih bisa dipakai kalau butuh
    const x = paddingX + i * stepX;

    let amp = 0;

    // superposisi tapi pakai MAX, bukan SUM → puncak pas di garis vertikal star
    for (let s = 0; s < numStars; s++) {
      const centerIndex = starIndices[s];
      const peak = starHeights[s];

      const distIndex = Math.abs(i - centerIndex);

      // kalau di luar radius, star ini ga ngaruh
      if (distIndex > radius) continue;

      // 0 di center, 1 di tepi radius
      const norm = distIndex / radius;
      // 1 di center, 0 di tepi radius
      let influence = 1 - norm;
      influence = Math.pow(influence, sharpness);

      const localAmp = peak * influence;

      if (localAmp > amp) {
        amp = localAmp;
      }
    }

    // 4) Tambah noise biar organik
    if (noiseAmount > 0) {
      const noise = (Math.random() - 0.5) * 2 * noiseAmount;
      amp += noise;
    }

    amp = Math.max(0, amp);

    const topY = centerY - amp;
    const bottomY = centerY + amp;

    pts.push({ x, topY, bottomY });
  }

  if (!pts.length) {
    return { pathD: "", width, height, starMarkers: [] as StarMarker[] };
  }

  const topPoints = pts.map((p) => ({ x: p.x, y: p.topY }));
  const bottomPoints = [...pts]
    .reverse()
    .map((p) => ({ x: p.x, y: p.bottomY }));

  let d = "";
  d += buildSmoothPath(topPoints, true);
  d += buildSmoothPath(bottomPoints, false);
  d += " Z";

  // 5) Star marker buat garis vertikal & titik oranye
  const starMarkers: StarMarker[] = starIndices.map((idx, i) => ({
    x: paddingX + idx * stepX,
    y: centerY,
    h: starHeights[i],
  }));

  return { pathD: d, width, height, starMarkers };
}, [lineLength, maxAmp, segments, sharpness, noiseAmount, seed]);


  const downloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tacet-stars.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-10 flex flex-col items-center gap-8">
      <h1 className="text-3xl font-semibold text-center">
        Tacet Mark Generator – 5 Star Structure
      </h1>

      {/* CONTROLS */}
      <div className="bg-neutral-800 p-6 rounded-xl flex flex-wrap gap-6 max-w-3xl w-full justify-center items-end">
        <Control
          label="Line Length"
          min={300}
          max={1200}
          value={lineLength}
          setValue={setLineLength}
        />
        <Control
          label="Max Amplitude"
          min={30}
          max={140}
          value={maxAmp}
          setValue={setMaxAmp}
        />
        <Control
          label="Segments"
          min={30}
          max={160}
          value={segments}
          setValue={setSegments}
        />
        <Control
          label="Sharpness"
          min={1}
          max={5}
          value={sharpness}
          setValue={setSharpness}
        />
        <Control
          label="Noise"
          min={0}
          max={40}
          value={noiseAmount}
          setValue={setNoiseAmount}
        />

        <div className="flex flex-col text-sm gap-1">
          <span>Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-14"
          />
        </div>

        <label className="flex items-center gap-2 text-xs mt-2">
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => setShowGuides(e.target.checked)}
          />
          Show star guides
        </label>

        <button
          onClick={() => setSeed((s) => s + 1)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-xs"
        >
          Randomize
        </button>
      </div>

      {/* PREVIEW */}
      <div className="bg-white p-6 rounded-xl shadow-xl">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* garis tengah */}
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={color}
            strokeWidth={2}
            opacity={0.2}
          />

          {/* waveform tacet */}
          {pathD && (
            <path
              d={pathD}
              fill={color}
              stroke={color}
              strokeWidth={1}
            />
          )}

          {/* guides 5 star (axis vertikal + titik) */}
          {showGuides &&
            starMarkers.map((m, idx) => (
              <g key={idx}>
                <line
                  x1={m.x}
                  y1={m.y - m.h}
                  x2={m.x}
                  y2={m.y + m.h}
                  stroke="#ff6b35"
                  strokeWidth={1}
                  opacity={0.6}
                />
                <circle cx={m.x} cy={m.y} r={3} fill="#ff6b35" />
              </g>
            ))}
        </svg>
      </div>

      <button
        onClick={downloadSvg}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm"
      >
        Download SVG
      </button>
    </div>
  );
}

type ControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  setValue: (v: number) => void;
};

function Control({ label, value, min, max, setValue }: ControlProps) {
  return (
    <div className="flex flex-col text-sm gap-1 w-44">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <span className="text-neutral-300">{value}</span>
    </div>
  );
}
