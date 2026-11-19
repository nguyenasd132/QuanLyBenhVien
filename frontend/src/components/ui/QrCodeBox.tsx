import React, { useMemo } from 'react';

/**
 * Renders a crisp deterministic SVG QR-style matrix from a string payload
 * for simulated check-in tickets and VietQR payment transfers.
 */
export const QrCodeBox: React.FC<{
  value: string;
  size?: number;
  className?: string;
}> = ({ value, size = 148, className }) => {
  const modules = useMemo(() => {
    const dim = 21;
    const grid: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[r0 + r][c0 + c] = isBorder || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, dim - 7);
    drawFinder(dim - 7, 0);

    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const inFinder =
          (r < 8 && c < 8) || (r < 8 && c >= dim - 8) || (r >= dim - 8 && c < 8);
        if (inFinder) continue;
        if (r === 6 || c === 6) {
          grid[r][c] = (r + c) % 2 === 0;
          continue;
        }
        hash ^= (r * 31 + c * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        grid[r][c] = (hash >>> 0) % 5 < 2;
      }
    }
    return grid;
  }, [value]);

  const dim = modules.length;
  return (
    <div
      className={`inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-[#C7D6EA] shadow-soft ${className || ''}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${dim} ${dim}`}
        shapeRendering="crispEdges"
        aria-label={`QR ${value}`}
      >
        <rect width={dim} height={dim} fill="#FFFFFF" />
        {modules.map((row, r) =>
          row.map((filled, c) =>
            filled ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0F172A" /> : null
          )
        )}
      </svg>
    </div>
  );
};
