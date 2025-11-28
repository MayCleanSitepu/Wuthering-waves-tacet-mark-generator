"use client";

import { useMemo, useRef, useState } from "react";

export default function TacetWavePage() {
  const [lineLength, setLineLength] = useState(600);
  const [maxAmp, setMaxAmp] = useState(60); // tinggi maksimum wave
  const [segments, setSegments] = useState(60); // jumlah titik horizontal
  const [sharpness, setSharpness] = useState(2); // makin besar makin runcing di tengah
  const [noiseAmount, setNoiseAmount] = useState(10); // random amplitude
  const [color, setColor] = useState("#000000");

  const [seed, setSeed] = useState(0); // buat re-roll pattern
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { pathD, width, height } = useMemo(() => {
    const paddingX = 50;
    const paddingY = 40;

    const width = lineLength + paddingX * 2;
    const height = maxAmp * 2 + paddingY * 2;
    const centerY = height / 2;

    const pts: { x: number; topY: number; bottomY: number }[] = [];

    const stepX = lineLength / segments;

    // Seeded random number generator for deterministic noise
    const seededRandom = (index: number): number => {
      const combined = seed * 73856093 ^ index * 19349663;
      const x = Math.sin(combined) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i <= segments; i++) {
      const x = paddingX + i * stepX;

      // 0..1 posisi relatif terhadap panjang
      const t = i / segments;

      // envelope simetris: 1 di tengah, 0 di pinggir
      const centerFactor = 1 - Math.abs(t - 0.5) / 0.5; // 0 di edge, 1 di center
      const shaped = Math.pow(centerFactor, sharpness); // kontrol tajem/lembut

      let amp = shaped * maxAmp;

      // noise per titik
      if (noiseAmount > 0) {
        const noise = (seededRandom(i) - 0.5) * 2 * noiseAmount;
        amp += noise;
      }

      amp = Math.max(0, amp);

      const topY = centerY - amp;
      const bottomY = centerY + amp;

      pts.push({ x, topY, bottomY });
    }

    if (pts.length === 0) {
      return { pathD: "", width, height };
    }

    // Bangun path tertutup: center -> top wave -> bottom wave -> close
    let d = `M ${pts[0].x} ${centerY}`;
    // garis ke titik pertama di atas
    d += ` L ${pts[0].x} ${pts[0].topY}`;
    // jalur atas ke kanan
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].topY}`;
    }
    // jalur bawah balik ke kiri
    for (let i = pts.length - 1; i >= 0; i--) {
      d += ` L ${pts[i].x} ${pts[i].bottomY}`;
    }
    d += " Z";

    return { pathD: d, width, height };
    // seed ikut di dependency biar random berubah kalau seed berubah
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
    a.download = "tacet-wave.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-10 flex flex-col items-center gap-8">
      <h1 className="text-3xl font-semibold text-center">
        Tacet Waveform Generator
      </h1>

      {/* CONTROLS */}
      <div className="bg-neutral-800 p-6 rounded-xl flex flex-wrap gap-6 max-w-3xl w-full justify-center items-end">
        <Control
          label="Line Length"
          min={300}
          max={1000}
          value={lineLength}
          setValue={setLineLength}
        />
        <Control
          label="Max Amplitude"
          min={20}
          max={120}
          value={maxAmp}
          setValue={setMaxAmp}
        />
        <Control
          label="Segments"
          min={20}
          max={120}
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
          {/* Garis tengah */}
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={color}
            strokeWidth={2}
            opacity={0.4}
          />

          {/* Waveform tacet */}
          {pathD && (
            <path
              d={pathD}
              fill={color}
              stroke={color}
              strokeWidth={1}
            />
          )}
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
