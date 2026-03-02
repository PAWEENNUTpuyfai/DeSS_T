import { useState, useEffect } from "react";
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
  // Local state for input values to allow empty fields
  const [inputValues, setInputValues] = useState<Record<string, number | ''>>({});
  // Store previous value before editing (on focus)
  const [previousValues, setPreviousValues] = useState<Record<string, number>>({});

  // Initialize/sync input values when route changes
  useEffect(() => {
    setInputValues({
      maxDistance: route.maxDistance,
      speed: route.speed,
      capacity: route.capacity,
      maxBuses: route.maxBuses,
      routeTravelingTime: route.routeTravelingTime,
    });
  }, [route.id, route.maxDistance, route.speed, route.capacity, route.maxBuses, route.routeTravelingTime]);
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
            allowDecimals: true,
          },
          {
            label: "Speed :",
            key: "speed" as const,
            unit: "km/hr",
            allowDecimals: true,
          },
          {
            label: "Capacity :",
            key: "capacity" as const,
            unit: "persons",
            allowDecimals: false,
          },
          {
            label: "Max Bus :",
            key: "maxBuses" as const,
            unit: "buses",
            allowDecimals: false,
          },
          {
            label: "Route Traveling Time :",
            key: "routeTravelingTime" as const,
            unit: "mins",
            allowDecimals: true,
          },
        ].map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 min-w-fit">
              {field.label}
            </span>
            <input
              type="number"
              step={field.allowDecimals ? "any" : "1"}
              min={0}
              value={inputValues[field.key] ?? 0}
              onFocus={() => {
                // Store current value before editing
                const currentVal = typeof inputValues[field.key] === 'number' ? inputValues[field.key] : 0;
                setPreviousValues(prev => ({ ...prev, [field.key]: currentVal as number }));
              }}
              onChange={(e) => {
                const val = e.target.value;
                setInputValues(prev => ({ ...prev, [field.key]: val === '' ? '' : Number(val) }));
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  // Restore previous value if empty
                  const prevVal = previousValues[field.key] ?? 0;
                  setInputValues(prev => ({ ...prev, [field.key]: prevVal }));
                  onUpdateBusInfo(route.id, field.key, prevVal);
                } else {
                  let val = Number(e.target.value);
                  
                  // If negative or NaN, restore previous value
                  if (isNaN(val) || val < 0) {
                    const prevVal = previousValues[field.key] ?? 0;
                    setInputValues(prev => ({ ...prev, [field.key]: prevVal }));
                    onUpdateBusInfo(route.id, field.key, prevVal);
                  } else {
                    // Round to integer if decimals not allowed
                    if (!field.allowDecimals) {
                      val = Math.round(val);
                    }
                    setInputValues(prev => ({ ...prev, [field.key]: val }));
                    onUpdateBusInfo(route.id, field.key, val);
                  }
                }
              }}
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
