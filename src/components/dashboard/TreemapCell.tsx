"use client";

import type { TreemapNode } from "@/types/stock";
import {
  formatChangePercent,
  getTreemapFillColor,
} from "@/lib/market-colors";

interface TreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  symbol?: string;
  market?: TreemapNode["market"];
  changePercent?: number;
  depth?: number;
}

function getLabelFontSize(width: number, height: number, name: string): number {
  const minDim = Math.min(width, height);
  const nameLen = name.length;

  if (minDim < 28) return 0;
  if (minDim < 40) return nameLen > 4 ? 7 : 8;
  if (minDim < 56) return nameLen > 6 ? 8 : 9;
  if (minDim < 72) return nameLen > 8 ? 9 : 10;
  return nameLen > 10 ? 10 : 12;
}

export function TreemapCell({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name,
  symbol,
  market,
  changePercent = 0,
  depth,
}: TreemapCellProps) {
  if (depth === 0 || width < 4 || height < 4 || !name || !market) {
    return null;
  }

  const fontSize = getLabelFontSize(width, height, name);
  const showLabel = fontSize > 0;
  const showPercent = height >= 40 && width >= 44;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: getTreemapFillColor(market, changePercent),
          stroke: "var(--background)",
          strokeWidth: 2,
        }}
        rx={4}
      />
      {showLabel && (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center text-white">
            <div className="flex max-w-full flex-col items-center justify-center gap-0.5">
              <p
                className="max-w-full font-semibold leading-tight drop-shadow-sm"
                style={{
                  fontSize,
                  wordBreak: "keep-all",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: height < 56 ? 2 : 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {name}
              </p>
              {showPercent && (
                <p
                  className="font-mono font-medium leading-none drop-shadow-sm"
                  style={{ fontSize: Math.max(fontSize - 1, 7) }}
                >
                  {formatChangePercent(changePercent)}
                </p>
              )}
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
