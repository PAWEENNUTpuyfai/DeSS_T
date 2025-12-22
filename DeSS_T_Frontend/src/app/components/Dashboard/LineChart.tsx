import "../../../style/Output.css";

interface LineChartProps {
  timeslot?: number; // minutes between x-axis ticks
  route?: [string, string, string][]; // [route_id, route_name, color]
  dataset?: [string, string, number][]; // [time(HH:mm), route_id, value]
  mode?: "avg-waiting-time" | "avg-queue-length" | "avg-utilization";
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

  const chartHeight = 160;
  const paddingLeft = 50;
  const paddingRight = 16;
  const paddingTop = 40;
  const paddingBottom = 28;
  const dataOffsetLeft = 30; // extra space for first data point
  const minWidthPerTick = 60; // prevent label overlap
  const chartWidth = Math.max(
    400,
    paddingLeft +
      paddingRight +
      dataOffsetLeft +
      Math.max(0, xTicks.length - 1) * minWidthPerTick
  );
  const innerWidth = chartWidth - paddingLeft - paddingRight - dataOffsetLeft;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const lineSpacing = 30;
  const yTicks = Math.max(1, Math.floor(innerHeight / lineSpacing));
  const yUnit =
    mode === "avg-queue-length"
      ? "persons"
      : mode === "avg-utilization"
      ? "%"
      : "mins";

  // Helpers to map data to SVG coords
  const xPos = (t: number) => {
    if (maxTime === minTime) return paddingLeft + dataOffsetLeft;
    return paddingLeft + dataOffsetLeft + ((t - minTime) / (maxTime - minTime)) * innerWidth;
  };

  const yPos = (v: number) => {
    if (yMax === yMin) return paddingTop + innerHeight / 2;
    return paddingTop + (1 - (v - yMin) / (yMax - yMin)) * innerHeight;
  };

  const buildPath = (points: { t: number; v: number }[]) => {
    if (!points.length) return "";
    return points
      .map((p, idx) => {
        const cmd = idx === 0 ? "M" : "L";
        return `${cmd}${xPos(p.t).toFixed(1)},${yPos(p.v).toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <div className="w-full">
      {/* Legend */}
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

      <div className="relative w-full">
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
                  fontSize={10}
                  textAnchor="end"
                  fill="#6b7280"
                >
                  {value.toFixed(1)}
                </text>
                {isTop && (
                  <text
                    x={paddingLeft / 2}
                    y={paddingTop - 25}
                    fontSize={10}
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

        {/* Scrollable chart area */}
        <div
          className="overflow-x-auto pb-2 bg-white"
          style={{ marginLeft: `${paddingLeft}px` }}
        >
          <svg
            width={chartWidth}
            height={chartHeight}
            className="bg-white"
            style={{ minWidth: `calc(100% - ${paddingLeft}px)` }}
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

            {/* X labels */}
            {xTicks.map((t, idx) => {
              const x = xPos(t) - paddingLeft;
              return (
                <text
                  key={idx}
                  x={x}
                  y={chartHeight - 8}
                  fontSize={10}
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
                  (match, x) => `M${parseFloat(x) - paddingLeft}`
                )
                .replace(
                  /L([\d.]+)/g,
                  (match, x) => `L${parseFloat(x) - paddingLeft}`
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
              return points.map((p, i) => {
                const svgX = xPos(p.t) - paddingLeft;
                const svgY = yPos(p.v);
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
