import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiJson, authHeaders } from "../../lib/api";

type Point = { label: string; amount: number };
type Period = "1d" | "1w" | "1m";

const PERIODS: { key: Period; label: string }[] = [
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
];

function SparkChart({ points }: { points: Point[] }) {
  if (!points.length) return null;

  const W = 600;
  const H = 160;
  const PAD = { top: 12, right: 12, bottom: 32, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const max = Math.max(...points.map((p) => p.amount), 0.0001);
  const stepX = chartW / (points.length - 1 || 1);

  const coords = points.map((p, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + chartH - (p.amount / max) * chartH,
    amount: p.amount,
    label: p.label,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M ${coords[0]!.x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} ` +
    coords.map((c) => `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` L ${coords[coords.length - 1]!.x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

  const yTicks = [0, max / 2, max].map((v) => ({
    y: PAD.top + chartH - (v / max) * chartH,
    label: v.toFixed(v < 1 ? 2 : 1),
  }));

  const xInterval = Math.ceil(points.length / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="earnings-chart-svg" aria-hidden>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => (
        <g key={t.label}>
          <line
            x1={PAD.left}
            y1={t.y}
            x2={W - PAD.right}
            y2={t.y}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text
            x={PAD.left - 6}
            y={t.y + 4}
            textAnchor="end"
            className="chart-tick"
          >
            {t.label}
          </text>
        </g>
      ))}

      {coords
        .filter((_, i) => i % xInterval === 0 || i === coords.length - 1)
        .map((c) => (
          <text
            key={c.label}
            x={c.x}
            y={H - 6}
            textAnchor="middle"
            className="chart-tick"
          >
            {c.label}
          </text>
        ))}

      <path d={areaPath} fill="url(#chartGrad)" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

      {coords.map((c) => (
        c.amount > 0 && (
          <circle key={c.label} cx={c.x} cy={c.y} r="3.5" fill="var(--accent)" />
        )
      ))}
    </svg>
  );
}

export function EarningsChart() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("1w");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    apiJson<{ points: Point[] }>(`/wallet/earnings-history?period=${period}`, {
      headers: authHeaders(token),
    })
      .then((d) => {
        if (!cancelled) setPoints(d.points);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, period]);

  const total = points.reduce((s, p) => s + p.amount, 0);
  const hasData = points.some((p) => p.amount > 0);

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <div>
          <p className="dash-card-label">Earnings history</p>
          <p className="dash-balance-big">
            {total > 0 ? `${total.toFixed(total < 1 ? 4 : 2)} USDC` : "0 USDC"}
          </p>
        </div>
        <div className="chart-period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`chart-period-btn${period === p.key ? " active" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dash-card-divider" />
      <div className="dash-card-body earnings-chart-body">
        {loading ? (
          <p className="muted small chart-loading">Loading…</p>
        ) : !hasData ? (
          <p className="muted small chart-loading">No tips received in this period.</p>
        ) : (
          <SparkChart points={points} />
        )}
      </div>
    </section>
  );
}
