import "../../../style/Output.css";

interface LineChartProps {
  timeslot?: number; // minutes between x-axis ticks
  route?: [string, string, string][]; // [route_id, route_name, color]
  dataset?: [string, string, number][]; // [time(HH:mm), route_id, value]
  mode?: "avg-waiting-time" | "avg-queue-length" | "avg-utilization";
  compactMode?: boolean; // true for PDF fit A4
}

// Convert HH:mm string to minutes since 00:00
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Format minutes back to HH:mm
const minutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export default function LineChart({
  timeslot = 15,
  route = [],
  dataset = [],
  mode = "avg-waiting-time",
  compactMode = false,
}: LineChartProps = {}) {
  const slot = timeslot > 0 ? timeslot : 15;
  // Build route meta (id, name, color)
  const fallbackColors = [
    "#76218a",
    "#3a8345",
    "#49fd36",
    "#f80512",
    "#f7bc16",
    "#fc2898",
    "#0e16b2",
    "#83c8f9",
    "#7a644e",
  ];

  const routes = route.length
    ? route
    : Array.from(new Set(dataset.map((d) => d[1]))).map(
        (id, idx) =>
          [id, `สาย ${id}`, fallbackColors[idx % fallbackColors.length]] as [
            string,
            string,
            string
          ]
      );

  // Compute time domain
  const times = dataset.map((d) => timeToMinutes(d[0]));
  const minTime = times.length ? Math.min(...times) : 0;
  const maxTime = times.length ? Math.max(...times) : minTime + slot;

  // X ticks based on provided timeslot
  const xTicks: number[] = [];
  for (let t = minTime; t <= maxTime; t += slot) {
    xTicks.push(t);
  }
  if (xTicks[xTicks.length - 1] < maxTime) xTicks.push(maxTime);

  // Map dataset by route
  const dataByRoute = routes.map(([id]) => ({
    id,
    points: dataset
      .filter((d) => d[1] === id)
      .map(([time, , value]) => ({
        t: timeToMinutes(time),
        v: value,
      }))
      .sort((a, b) => a.t - b.t),
  }));

  const allValues = dataset.map((d) => d[2]);
  const yMin = allValues.length ? Math.min(...allValues) : 0;
  const yMaxRaw = allValues.length ? Math.max(...allValues) : 1;
  const yMax = yMaxRaw === yMin ? yMin + 1 : yMaxRaw;

  // Responsive sizing: compact mode for PDF (fit A4 ~750px width)
  const chartHeight = compactMode ? 160 : 200;
  const paddingLeft = compactMode ? 40 : 50;
  const paddingRight = compactMode ? 12 : 16;
  const paddingTop = compactMode ? 30 : 40;
  const paddingBottom = compactMode ? 24 : 28;
  const dataOffsetLeft = compactMode ? 20 : 30; // extra space for first data point
  
  // In compact mode: reduce minWidthPerTick and maxWidth to fit A4
  const minWidthPerTick = compactMode ? 35 : 60; // tighter spacing
  const maxChartWidth = compactMode ? 720 : 1200; // A4 page width constraint
  
  const chartWidth = Math.min(
    maxChartWidth,
    Math.max(
      compactMode ? 320 : 400,
      paddingLeft +
        paddingRight +
        dataOffsetLeft +
        Math.max(0, xTicks.length - 1) * minWidthPerTick
    )
  );
  const innerWidth = chartWidth - paddingLeft - paddingRight - dataOffsetLeft;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const lineSpacing = compactMode ? 25 : 30;
  const yTicks = Math.max(1, Math.floor(innerHeight / lineSpacing));
  const yUnit =
    mode === "avg-queue-length"
      ? "persons"
      : mode === "avg-utilization"
      ? "%"
      : "mins";

  // Helpers to map data to SVG coords
  const xPos = (t: number) => {
    if (maxTime === minTime || !Number.isFinite(t)) return paddingLeft + dataOffsetLeft;
    const x = paddingLeft + dataOffsetLeft + ((t - minTime) / (maxTime - minTime)) * innerWidth;
    return Number.isFinite(x) ? x : paddingLeft + dataOffsetLeft;
  };

  const yPos = (v: number) => {
    if (yMax === yMin || !Number.isFinite(v)) return paddingTop + innerHeight / 2;
    const y = paddingTop + (1 - (v - yMin) / (yMax - yMin)) * innerHeight;
    return Number.isFinite(y) ? y : paddingTop + innerHeight / 2;
  };

  const buildPath = (points: { t: number; v: number }[]) => {
    if (!points.length) return "";
    const validPoints = points.filter(p => Number.isFinite(p.t) && Number.isFinite(p.v));
    if (!validPoints.length) return "";
    return validPoints
      .map((p, idx) => {
        const cmd = idx === 0 ? "M" : "L";
        const x = xPos(p.t);
        const y = yPos(p.v);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
        return `${cmd}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(s => s.length > 0)
      .join(" ");
  };

  return (
    <div className={compactMode ? "w-full overflow-hidden" : "w-full"}>
      {/* Legend - hidden in compact mode */}
      {!compactMode && (
        <div className="flex gap-3 items-center mb-2 text-sm">
          {routes.map(([id, name, color]) => (
            <div key={id} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              ></span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      <div className={compactMode ? "relative w-full overflow-hidden" : "relative w-full"}>
        {/* Fixed Y-axis */}
        <svg
          width={paddingLeft}
          height={chartHeight + 20}
          className="absolute left-0 top-0 bg-white"
          style={{ zIndex: 10 }}
        >
          {/* Y grid lines and labels */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const value = yMin + ((yMax - yMin) / yTicks) * i;
            const y = yPos(value);
            const isTop = i === yTicks;
            return (
              <g key={i}>
                <text
                  x={paddingLeft - 6}
                  y={y + 4}
                  fontSize={compactMode ? 9 : 10}
                  textAnchor="end"
                  fill="#6b7280"
                >
                  {value.toFixed(1)}
                </text>
                {isTop && (
                  <text
                    x={paddingLeft / 2}
                    y={paddingTop - 25}
                    fontSize={compactMode ? 9 : 10}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontWeight="bold"
                  >
                    ({yUnit})
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Scrollable chart area - no scroll in compact mode */}
        <div
          className={compactMode ? "pb-2 bg-white overflow-hidden" : "overflow-x-auto pb-2 bg-white"}
          style={{ 
            marginLeft: `${paddingLeft}px`,
            scrollbarColor: '#d1d5db white',
            scrollbarWidth: 'thin'
          }}
        >
          <svg
            width={chartWidth}
            height={chartHeight}
            className="bg-white"
            style={{ minWidth: compactMode ? `${chartWidth}px` : `calc(100% - ${paddingLeft}px)` }}
          >
            {/* Y grid lines only */}
            {Array.from({ length: yTicks + 1 }).map((_, i) => {
              const value = yMin + ((yMax - yMin) / yTicks) * i;
              const y = yPos(value);
              return (
                <line
                  key={`grid-${i}`}
                  x1={0}
                  x2={chartWidth - paddingLeft - paddingRight}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* X labels - reduce density in compact mode */}
            {xTicks.map((t, idx) => {
              // In compact mode, skip every other tick if too many
              if (compactMode && xTicks.length > 6 && idx % 2 === 1) return null;
              
              const x = xPos(t) - paddingLeft;
              return (
                <text
                  key={idx}
                  x={x}
                  y={chartHeight - 8}
                  fontSize={compactMode ? 8 : 10}
                  textAnchor="middle"
                  fill="#6b7280"
                >
                  {minutesToTime(t)}
                </text>
              );
            })}

            {/* Lines */}
            {dataByRoute.map(({ id, points }, idx) => {
              const [, , color] = routes[idx];
              const pathD = buildPath(points);
              const adjustedPath = pathD
                .replace(
                  /M([\d.]+)/g,
                  (_match, x) => `M${parseFloat(x) - paddingLeft}`
                )
                .replace(
                  /L([\d.]+)/g,
                  (_match, x) => `L${parseFloat(x) - paddingLeft}`
                );
              return (
                <path
                  key={id}
                  d={adjustedPath}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                />
              );
            })}

            {/* Data points with labels */}
            {dataByRoute.map(({ id, points }, idx) => {
              const [, , color] = routes[idx];
              return points
                .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v))
                .map((p, i) => {
                  const svgX = xPos(p.t) - paddingLeft;
                  const svgY = yPos(p.v);
                  if (!Number.isFinite(svgX) || !Number.isFinite(svgY)) return null;
                  return (
                    <g key={`${id}-${i}`}>
                      <circle cx={svgX} cy={svgY} r={3} fill={color} />
                    {/* <text
                      x={svgX}
                      y={svgY - 8}
                      fontSize={9}
                      textAnchor="middle"
                      fill={color}
                      fontWeight="600"
                    >
                      {p.v.toFixed(1)}
                    </text> */}
                  </g>
                );
              });
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
