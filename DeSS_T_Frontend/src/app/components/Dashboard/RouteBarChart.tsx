import "../../../style/Output.css";

interface RouteBarChartProps {
  route?: [string, string, string][]; // [route_id, route_name, color]
  dataset?: [string, number][]; // [route_id, value]
  mode?: "avg-traveling-time" | "avg-traveling-distance";
}

export default function RouteBarChart({
  route = [],
  dataset = [],
  mode = "avg-traveling-time",
}: RouteBarChartProps = {}) {
  // Fallback colors if route colors not provided
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

  // Build route map
  const routeMap = new Map(
    route.map((r) => [r[0], { name: r[1], color: r[2] }]),
  );

  // Build data with route info
  const chartData = dataset
    .map(([routeId, value], idx) => {
      const routeInfo = routeMap.get(routeId);

      // Convert units based on mode
      let displayValue = Number(value);
      if (mode === "avg-traveling-time") {
        // Already in minutes from backend
        displayValue = Number(value);
      } else if (mode === "avg-traveling-distance") {
        // Convert meters to km
        displayValue = Number(value) / 1000;
      }

      return {
        id: routeId,
        name: routeInfo?.name || `สาย ${routeId}`,
        color: routeInfo?.color || fallbackColors[idx % fallbackColors.length],
        value: displayValue,
      };
    })
    .sort((a, b) => {
      // Sort by route ID numerically or lexicographically
      const aNum = parseInt(a.id, 10);
      const bNum = parseInt(b.id, 10);
      // If both are valid numbers, compare numerically
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      // Otherwise compare as strings
      return a.id.localeCompare(b.id);
    });

  // Calculate max value for Y-axis
  const maxValue = chartData.length
    ? Math.max(...chartData.map((d) => d.value))
    : 20;
  const yMax = Math.ceil(maxValue * 1.1); // Add 10% padding

  // Chart dimensions
  const axisWidth = 70; // fixed y-axis area (labels stay put)
  const baseContentWidth = 300; // minimum scrollable width
  const baseBarWidth = 50; // desired bar width before scaling
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 50;
  const chartHeight = 300;
  const contentWidth = Math.max(
    baseContentWidth,
    chartData.length * baseBarWidth + paddingRight,
  );
  const innerWidth = contentWidth - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Bar dimensions
  const barWidth = chartData.length
    ? innerWidth / chartData.length
    : baseBarWidth;
  const barPadding = barWidth * 0.2;
  const actualBarWidth = barWidth - barPadding * 2;

  // Y-axis ticks (5 levels)
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((yMax / yTicks) * i),
  );

  // Unit label
  const yUnit = mode === "avg-traveling-distance" ? "km" : "min";

  // Scale helpers
  const yScale = (value: number) => {
    if (yMax === 0) return innerHeight;
    return innerHeight - (value / yMax) * innerHeight;
  };

  return (
    <div className="w-full flex">
      {/* Fixed Y-axis */}
      <div className="shrink-0" style={{ width: axisWidth }}>
        <svg width={axisWidth} height={chartHeight} className="bg-white">
          {yTickValues.map((tick, idx) => {
            const y = paddingTop + yScale(tick);
            return (
              <g key={`yaxis-${idx}`}>
                <text
                  x={axisWidth - 12}
                  y={y + 4}
                  fontSize={11}
                  textAnchor="end"
                  fill="#6b7280"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          {/* Unit label at top */}
          <text
            x={axisWidth - 12}
            y={paddingTop - 8}
            fontSize={11}
            textAnchor="end"
            fill="#6b7280"
          >
            {yUnit}
          </text>
          <line
            x1={axisWidth - 2}
            x2={axisWidth - 2}
            y1={paddingTop}
            y2={chartHeight - paddingBottom}
            stroke="#9ca3af"
            strokeWidth={2}
          />
        </svg>
      </div>

      {/* Scrollable chart area */}
      <div className="w-full overflow-x-auto">
        <svg width={contentWidth} height={chartHeight} className="bg-white">
          {yTickValues.map((tick, idx) => {
            const y = paddingTop + yScale(tick);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={0}
                  x2={contentWidth - paddingRight}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}

          {/* X-axis line */}
          <line
            x1={0}
            x2={contentWidth - paddingRight}
            y1={chartHeight - paddingBottom}
            y2={chartHeight - paddingBottom}
            stroke="#9ca3af"
            strokeWidth={2}
          />

          {/* Bars */}
          {chartData.map((data, idx) => {
            const x = idx * barWidth + barPadding;
            const barHeight = (data.value / yMax) * innerHeight;
            const y = paddingTop + innerHeight - barHeight;

            return (
              <g key={data.id}>
                <rect
                  x={x}
                  y={y}
                  width={actualBarWidth}
                  height={barHeight}
                  fill={data.color}
                  rx={2}
                />
                <text
                  x={x + actualBarWidth / 2}
                  y={y - 20}
                  fontSize={12}
                  textAnchor="middle"
                  fill={data.color}
                  fontWeight="600"
                >
                  {data.value.toFixed(1)} {yUnit}
                </text>
                <text
                  x={x + actualBarWidth / 2}
                  y={chartHeight - paddingBottom + 20}
                  fontSize={12}
                  textAnchor="middle"
                  fill="#374151"
                  fontWeight="500"
                >
                  {data.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
