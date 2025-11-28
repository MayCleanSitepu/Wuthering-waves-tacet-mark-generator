"use client";

import { useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

type Point = { x: number; topY: number; bottomY: number };

// helper: bikin path dengan kurva quadratic (Q) yang halus
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

export default function TacetWavePage() {
  const [lineLength, setLineLength] = useState(600);
  const [maxAmp, setMaxAmp] = useState(60);
  const [segments, setSegments] = useState(40);
  const [sharpness, setSharpness] = useState(2);
  const [noiseAmount, setNoiseAmount] = useState(10);
  const [color, setColor] = useState("#333333");
  const [seed, setSeed] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const { pathD, width, height } = useMemo(() => {
    const paddingX = 50;
    const paddingY = 40;

    const width = lineLength + paddingX * 2;
    const height = maxAmp * 2 + paddingY * 2;
    const centerY = height / 2;

    const pts: Point[] = [];
    const stepX = lineLength / segments;

    for (let i = 0; i <= segments; i++) {
      const x = paddingX + i * stepX;
      const t = i / segments;

      const centerFactor = 1 - Math.abs(t - 0.5) / 0.5; // 0 di pinggir, 1 di tengah
      const shaped = Math.pow(centerFactor, sharpness);

      let amp = shaped * maxAmp;
      if (noiseAmount > 0) {
        const noise = (Math.random() - 0.5) * 2 * noiseAmount;
        amp += noise;
      }
      amp = Math.max(0, amp);

      const topY = centerY - amp;
      const bottomY = centerY + amp;

      pts.push({ x, topY, bottomY });
    }

    if (!pts.length) return { pathD: "", width, height };

    // buat list titik atas & bawah
    const topPoints = pts.map((p) => ({ x: p.x, y: p.topY }));
    const bottomPoints = [...pts]
      .reverse()
      .map((p) => ({ x: p.x, y: p.bottomY }));

    let d = "";

    // kurva bagian atas
    d += buildSmoothPath(topPoints, true);
    // kurva bagian bawah (balik ke kiri)
    d += buildSmoothPath(bottomPoints, false);

    d += " Z";

    return { pathD: d, width, height };
  }, [lineLength, maxAmp, segments, sharpness, noiseAmount, seed]);

  const downloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
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
        Tacet Waveform Generator (Curved)
      </h1>

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

      <div className="bg-white p-6 rounded-xl shadow-xl">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={color}
            strokeWidth={2}
            opacity={0.25}
          />
          {pathD && (
            <path d={pathD} fill={color} stroke={color} strokeWidth={1} />
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
