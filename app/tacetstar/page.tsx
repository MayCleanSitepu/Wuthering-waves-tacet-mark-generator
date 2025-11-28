"use client";

import { useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Point = { x: number; topY: number; bottomY: number };
type StarMarker = { x: number; y: number; h: number };


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


    const seededRandom = (index: number): number => {
      const combined = (seed * 73856093) ^ (index * 19349663);
      const x = Math.sin(combined) * 10000;
      return x - Math.floor(x);
    };

    const numStars = 5;

    // index 5 star 
    const starIndices = Array.from({ length: numStars }, (_, i) =>
      Math.round(((i + 1) * segments) / (numStars + 1)) 
    );

    // Tinggi star: outer 
    const heightFactors = [0.5, 0.7, 1.5, 0.7, 0.5]; 

    const starHeights = starIndices.map((_, i) => {
      const factor = heightFactors[i] ?? 1;
      const jitter = 0.9 + seededRandom(i * 1000) * 0.2; 
      return maxAmp * factor * jitter;
    });

    // Radius pengaruh tiap star 
    const baseRadius = segments / (numStars * 2); // setengah jarak antar star
    const radius = baseRadius * 1.2; // tweak buntutnya panjang/pendek

    for (let i = 0; i <= segments; i++) {
      const x = paddingX + i * stepX;

      let amp = 0;

      
      for (let s = 0; s < numStars; s++) {
        const centerIndex = starIndices[s];
        const peak = starHeights[s];

        const distIndex = Math.abs(i - centerIndex);

       
        if (distIndex > radius) continue;

        
        const norm = distIndex / radius;
        
        let influence = 1 - norm;
        influence = Math.pow(influence, sharpness);

        const localAmp = peak * influence;

        if (localAmp > amp) {
          amp = localAmp;
        }
      }

      
      if (noiseAmount > 0) {
        const noise = (seededRandom(i) - 0.5) * 2 * noiseAmount;
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
    <div className="min-h-screen bg-background text-foreground py-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-8">
        {/* HEADER */}
        <header className="space-y-2 text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Tacet Mark Generator
            </h1>
            <p className="text-sm md:text-base text-red-500">
                work in progress, thankyou for visits! 💖
            </p>

            <a
                href="https://github.com/USERNAME/REPO"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
            >
                <Button variant="outline" size="sm" className="mt-2">
                ⭐ View on GitHub
                </Button>
            </a>
        </header>


        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)] items-start">
          <Card className="border-border/60">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Control
                  label="Line Length"
                  min={300}
                  max={1200}
                  value={lineLength}
                  setValue={setLineLength}
                  unit="px"
                />
                <Control
                  label="Max Amplitude"
                  min={30}
                  max={140}
                  value={maxAmp}
                  setValue={setMaxAmp}
                  unit="px"
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

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="color-input"
                      className="text-sm font-medium"
                    >
                      Color
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {color.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md border border-border shadow-inner">
                      <div
                        className="h-full w-full rounded-md"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <input
                      id="color-input"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-guides"
                    checked={showGuides}
                    onCheckedChange={(checked) =>
                      setShowGuides(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="show-guides"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Show star guides
                  </Label>
                </div>


                <div className="flex gap-3">
                  <Button
                    onClick={() => setSeed((s) => s + 1)}
                    variant="outline"
                    size="sm"
                  >
                    Randomize
                  </Button>
                  <Button onClick={downloadSvg} size="sm">
                    Download SVG
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card className="bg-card border-border/60 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="w-full overflow-x-auto">
                <div className="min-w-full flex justify-center">
                  <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    className="rounded-lg"
                  >

                    <line
                      x1={0}
                      y1={height / 2}
                      x2={width}
                      y2={height / 2}
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.2}
                    />


                    {pathD && (
                      <path
                        d={pathD}
                        fill={color}
                        stroke={color}
                        strokeWidth={1}
                      />
                    )}


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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type ControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  setValue: (v: number) => void;
  unit?: string;
};

function Control({ label, value, min, max, setValue, unit }: ControlProps) {
  const id = `${label.replace(/\s+/g, "-").toLowerCase()}-slider`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => setValue(v)}
        className="mt-1"
      />
    </div>
  );
}
