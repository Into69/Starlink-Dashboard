/**
 * SVG polar obstruction map.
 *
 * The Starlink API returns a rectangular num_rows × num_cols SNR grid where:
 *   - Center of the grid = zenith (directly overhead)
 *   - Top edge = North, right edge = East  (standard image orientation)
 *   - Distance from center = cos(elevation), so horizon is at the edge
 *   - Each cell value: 0.0 (blocked) → 1.0 (clear), -1.0 (no data)
 *
 * We map the grid to SVG Cartesian space and clip it to a circle, giving
 * a clean polar obstruction map with no coordinate transforms needed.
 */

import { useMemo, useId } from 'react'

// --- color mapping -------------------------------------------------------

function snrColor(v) {
  if (v < 0) return null         // no data — skip
  if (v >= 0.7) return '#4d9fff' // clear
  if (v >= 0.3) return '#f59e0b' // partial obstruction
  return '#ef4444'               // blocked
}

// --- azimuth helper (North=top, clockwise) --------------------------------

function azXY(cx, cy, r, azDeg) {
  const rad = (azDeg - 90) * (Math.PI / 180)
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

// --- elevation ring radii -------------------------------------------------
// Each ring is drawn at the radius corresponding to that elevation angle.
// r = cos(elevation) * maxR  →  elevation 90° (zenith) = 0, 0° (horizon) = maxR
const ELEV_RINGS = [
  { elev: 60, label: '60°' },
  { elev: 30, label: '30°' },
]
const CARDINALS = ['N', 'E', 'S', 'W']

// -------------------------------------------------------------------------

export default function ObstructionMap({
  mapData   = null,
  azimuth   = null,   // dish / satellite azimuth (degrees, 0=North)
  elevation = null,   // dish / satellite elevation (degrees, 0=horizon)
  size      = 200,
  showLegend = true,
}) {
  const uid   = useId().replace(/:/g, '')
  const cx    = size / 2
  const cy    = size / 2
  const maxR  = size / 2 - 14   // leave room for N/S/E/W labels

  // Pre-compute rectangle cells from the flat SNR array
  const cells = useMemo(() => {
    if (!mapData?.snr?.length) return []
    const { num_rows: rows, num_cols: cols, snr } = mapData
    if (!rows || !cols) return []

    const cellW = (2 * maxR) / cols
    const cellH = (2 * maxR) / rows
    const out   = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v     = snr[r * cols + c]
        const color = snrColor(v)
        if (!color) continue

        // Map grid cell to SVG centre position
        const x = cx - maxR + (c + 0.5) * cellW
        const y = cy - maxR + (r + 0.5) * cellH
        out.push({ x, y, w: cellW, h: cellH, color })
      }
    }
    return out
  }, [mapData, cx, cy, maxR])

  // Satellite / dish pointing position in SVG coordinates
  const satPos = useMemo(() => {
    if (azimuth == null || elevation == null) return null
    // r = cos(elevation) * maxR  (zenith=0, horizon=maxR)
    const r = Math.cos(elevation * Math.PI / 180) * maxR
    const [x, y] = azXY(cx, cy, r, azimuth)
    return { x, y }
  }, [azimuth, elevation, cx, cy, maxR])

  const clipId = `hemi-clip-${uid}`

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={maxR} />
          </clipPath>
        </defs>

        {/* ── Background ── */}
        <circle cx={cx} cy={cy} r={maxR} fill="#0a0c10" stroke="#1e2330" strokeWidth={1} />

        {/* ── SNR cells (clipped to hemisphere circle) ── */}
        <g clipPath={`url(#${clipId})`}>
          {cells.map((c, i) => (
            <rect
              key={i}
              x={c.x - c.w / 2}
              y={c.y - c.h / 2}
              width={c.w}
              height={c.h}
              fill={c.color}
              fillOpacity={0.82}
            />
          ))}
        </g>

        {/* ── Elevation rings ── */}
        {ELEV_RINGS.map(({ elev }) => {
          const r = Math.cos(elev * Math.PI / 180) * maxR
          return (
            <circle
              key={elev}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="#1e2330"
              strokeWidth={0.6}
              strokeDasharray="2 3"
            />
          )
        })}

        {/* ── Cross-hairs ── */}
        <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#1e2330" strokeWidth={0.5} />
        <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#1e2330" strokeWidth={0.5} />

        {/* ── Cardinal labels ── */}
        {CARDINALS.map((lbl, i) => {
          const [x, y] = azXY(cx, cy, maxR + 10, i * 90)
          return (
            <text
              key={lbl}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill="#4a5568"
              fontFamily="Space Grotesk, sans-serif"
            >
              {lbl}
            </text>
          )
        })}

        {/* ── Center (dish) dot ── */}
        <circle cx={cx} cy={cy} r={2.5} fill="#e2e8f0" />

        {/* ── Satellite / pointing position ── */}
        {satPos && (
          <g>
            {/* Pulsing ring — SVG native animation, no CSS needed */}
            <circle cx={satPos.x} cy={satPos.y} r={4} fill="none" stroke="#4d9fff" strokeWidth={1.2}>
              <animate attributeName="r"       values="4;10;4"     dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8"  dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Solid dot */}
            <circle cx={satPos.x} cy={satPos.y} r={3} fill="#4d9fff" />
          </g>
        )}

        {/* ── No-data overlay ── */}
        {!mapData && (
          <text
            x={cx} y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="#2a3344"
            fontFamily="Space Grotesk, sans-serif"
          >
            no signal data
          </text>
        )}
      </svg>

      {/* ── Legend ── */}
      {showLegend && (
        <div className="flex gap-3">
          {[
            { color: '#4d9fff', label: 'Clear'   },
            { color: '#f59e0b', label: 'Partial'  },
            { color: '#ef4444', label: 'Blocked'  },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span
                className="inline-block rounded-sm"
                style={{ width: 8, height: 8, background: color }}
              />
              <span style={{ fontSize: 9, color: '#4a5568' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
