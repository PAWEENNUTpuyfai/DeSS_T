import "../../../style/Output.css";
import { useMemo } from "react";

interface TopRoutesChartProps {
  route?: [string, string, string][]; // [route_id, route_name, color]
  customerData?: [string, number][]; // [route_id, customer_count]
  limit?: number; // default 3 for top N routes
}

export default function TopRoutesChart({
  route = [],
  customerData = [],
  limit = 3,
}: TopRoutesChartProps = {}) {
  // All available routes with colors
  const allRoutes = useMemo(
    () =>
      route.length
        ? route
        : ([
            ["1", "สาย 1", "#76218a"],
            ["2", "สาย 2", "#3a8345"],
            ["3", "สาย 3", "#49fd36"],
            ["4", "สาย 4", "#f80512"],
            ["5", "สาย 5", "#f7bc16"],
            ["6", "สาย 6", "#fc2898"],
            ["7", "สาย 7", "#0e16b2"],
            ["8", "สาย 8", "#83c8f9"],
            ["9", "สาย 9", "#7a644e"],
          ] as [string, string, string][]),
    [route]
  );

  // Build data: combine customer data with route info
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const routeMap = new Map(allRoutes.map((r) => [r[0], r]));

  // Sort by customer count and take top N
  const topRoutes = useMemo(() => {
    const withInfo = customerData
      .map(([routeId, count]) => {
        const routeInfo = routeMap.get(routeId);
        return {
          id: routeId,
          name: routeInfo?.[1] || `Route ${routeId}`,
          color: routeInfo?.[2] || "#9ca3af",
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return withInfo;
  }, [customerData, limit, routeMap]);

  // Calculate max count for scaling
  const maxCount = useMemo(
    () => Math.max(...topRoutes.map((r) => r.count), 1),
    [topRoutes]
  );

  const paddingLeft = 50;
  const paddingRight = 60;
  const paddingBottom = 40;
  const chartWidth = 520; // widen to balance left/right padding and center the plot
  const chartHeight = 250;
  const maxBarWidth = chartWidth - paddingLeft - paddingRight;
  const barSpacing =
    (chartHeight - paddingBottom) / Math.max(topRoutes.length, 1);

  // X-axis gridlines and ticks
  const gridLines = 5;
  const xTicks = Array.from({ length: gridLines + 1 }).map(
    (_, i) => (maxCount / gridLines) * i
  );

  return (
    <div className="">
      {topRoutes.length === 0 ? (
        <div className="top-routes-empty">No data available</div>
      ) : (
        <div className="top-routes-chart-wrapper">
          <svg
            width={chartWidth}
            height={chartHeight}
            className="top-routes-svg"
          >
            {/* Y-axis (vertical line on left) */}
            <line
              x1={paddingLeft}
              y1={0}
              x2={paddingLeft}
              y2={chartHeight - paddingBottom}
              stroke="#9ca3af"
              strokeWidth={2}
            />

            {/* X-axis (horizontal line at bottom) */}
            <line
              x1={paddingLeft}
              y1={chartHeight - paddingBottom}
              x2={chartWidth}
              y2={chartHeight - paddingBottom}
              stroke="#9ca3af"
              strokeWidth={2}
            />

            {/* X-axis arrow */}
            <polygon
              points={`${chartWidth - 5},${
                chartHeight - paddingBottom - 5
              } ${chartWidth},${chartHeight - paddingBottom} ${
                chartWidth - 5
              },${chartHeight - paddingBottom + 5}`}
              fill="#9ca3af"
            />

            {/* Y-axis arrow */}
            <polygon
              points={`${paddingLeft - 5},8 ${paddingLeft},0 ${
                paddingLeft + 5
              },8`}
              fill="#9ca3af"
            />

            {/* X-axis gridlines and labels */}
            {xTicks.map((tick, idx) => {
              const xPos = paddingLeft + (tick / maxCount) * maxBarWidth;
              return (
                <g key={`grid-${idx}`}>
                  {/* Dashed gridline */}
                  <line
                    x1={xPos}
                    y1={0}
                    x2={xPos}
                    y2={chartHeight - paddingBottom}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  {/* X-axis tick label */}
                  <text
                    x={xPos}
                    y={chartHeight - paddingBottom + 15}
                    fontSize={11}
                    textAnchor="middle"
                    fill="#6b7280"
                  >
                    {Math.round(tick)}
                  </text>
                </g>
              );
            })}

            {/* X-axis label */}
            <text
              x={chartWidth / 2}
              y={chartHeight - 5}
              fontSize={12}
              textAnchor="middle"
              fill="#6b7280"
              fontWeight="500"
            >
              Number of Customers
            </text>

            {/* Bars */}
            {topRoutes.map((route, idx) => {
              const barWidth = (route.count / maxCount) * maxBarWidth;
              const yPos = (idx + 0.5) * barSpacing;
              const barHeight = barSpacing * 0.45;
              const barGap = 8;

              return (
                <g key={`bar-${idx}-${route.id}`}>
                  {/* Bar */}
                  <rect
                    x={paddingLeft + barGap}
                    y={yPos - barHeight / 2}
                    width={barWidth}
                    height={barHeight}
                    fill={route.color}
                  />
                  {/* Bar value label */}
                  <text
                    x={paddingLeft + barGap + 8}
                    y={yPos + 4}
                    fontSize={12}
                    fill="#ffffff"
                    fontWeight="500"
                  >
                    {route.count}
                  </text>
                </g>
              );
            })}

            {/* Y-axis labels (route names) */}
            {topRoutes.map((route, idx) => {
              const yPos = (idx + 0.5) * barSpacing;
              return (
                <text
                  key={`label-${idx}-${route.id}`}
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  fontSize={12}
                  textAnchor="end"
                  fill="#323232"
                  fontWeight="500"
                >
                  {route.name}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
