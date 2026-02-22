import type { SimpleRoute } from "./RouteCard";

interface BusInfoPanelProps {
  route: SimpleRoute;
  isLocked: boolean;
  onUpdateBusInfo: (
    routeId: string,
    key: "maxDistance" | "speed" | "capacity" | "maxBuses" | "routeTravelingTime",
    value: number
  ) => void;
}

export default function BusInfoPanel({
  route,
  isLocked,
  onUpdateBusInfo,
}: BusInfoPanelProps) {
  const busCardStyle = {
    opacity: isLocked ? 0.5 : 1,
    pointerEvents: isLocked ? ("none" as const) : ("auto" as const),
  };

  return (
    <div
      className="bg-white rounded-xl shadow-md border border-gray-200 p-4 flex-shrink-0"
      style={busCardStyle}
    >
      <div
        className="text-white rounded-t-lg -mx-4 -mt-4 px-4 py-3 mb-4"
        style={{ backgroundColor: route.color }}
      >
        <h4 className="text-lg">Bus Information - {route.name}</h4>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        {[
          {
            label: "Max Distance :",
            key: "maxDistance" as const,
            unit: "km",
          },
          {
            label: "Speed :",
            key: "speed" as const,
            unit: "km/hr",
          },
          {
            label: "Capacity :",
            key: "capacity" as const,
            unit: "persons",
          },
          {
            label: "Max Bus :",
            key: "maxBuses" as const,
            unit: "buses",
          },
          {
            label: "Route Traveling Time :",
            key: "routeTravelingTime" as const,
            unit: "mins",
          },
        ].map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 min-w-fit">
              {field.label}
            </span>
            <input
              type="number"
              value={route[field.key] || 0}
              onChange={(e) =>
                onUpdateBusInfo(route.id, field.key, Number(e.target.value))
              }
              disabled={isLocked}
              className="border border-gray-300 rounded px-3 py-1 w-20 text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <span className="text-sm text-gray-600">{field.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
