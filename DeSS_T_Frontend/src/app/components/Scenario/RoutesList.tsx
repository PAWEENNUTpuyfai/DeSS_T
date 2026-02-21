
import RouteCard, { type SimpleRoute } from "./RouteCard";
import type { ColorResult } from "react-color";

interface RoutesListProps {
  routes: SimpleRoute[];
  selectedRouteId: string | null;
  isFetchingSegment: boolean;
  openColorPickerId: string | null;
  expandedStationRoutes: Set<string>;
  onAddRoute: () => void;
  onToggleLock: (routeId: string) => void;
  onToggleHide: (routeId: string) => void;
  onEdit: (routeId: string) => void;
  onConfirmEdit: (routeId: string) => void;
  onCancelEdit: (routeId: string) => void;
  onRemove: (routeId: string) => void;
  onUpdateColor: (routeId: string, color: ColorResult) => void;
  onUpdateName: (routeId: string, name: string) => void;
  onToggleColorPicker: (routeId: string | null) => void;
  onToggleExpand: (routeId: string) => void;
  getStationName: (stationId: string) => string;
}

export default function RoutesList({
  routes,
  selectedRouteId,
  isFetchingSegment,
  openColorPickerId,
  expandedStationRoutes,
  onAddRoute,
  onToggleLock,
  onToggleHide,
  onEdit,
  onConfirmEdit,
  onCancelEdit,
  onRemove,
  onUpdateColor,
  onUpdateName,
  onToggleColorPicker,
  onToggleExpand,
  getStationName,
}: RoutesListProps) {
  return (
    <div className="mt-4 p-4 w-full h-[85vh] flex flex-col">
      {/* Scrollable Routes List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {routes.map((r) => {
          const isLocked = r.locked;
          const isHidden = r.hidden;
          const isBeingEdited = selectedRouteId === r.id;
          const isOtherRouteBeingEdited =
            selectedRouteId !== null && selectedRouteId !== r.id;

          return (
            <RouteCard
              key={r.id}
              route={r}
              isLocked={isLocked}
              isHidden={isHidden}
              isBeingEdited={isBeingEdited}
              isOtherRouteBeingEdited={isOtherRouteBeingEdited}
              isFetchingSegment={isFetchingSegment}
              openColorPicker={openColorPickerId === r.id}
              isExpanded={expandedStationRoutes.has(r.id)}
              onToggleLock={() => onToggleLock(r.id)}
              onToggleHide={() => onToggleHide(r.id)}
              onEdit={() => onEdit(r.id)}
              onConfirmEdit={() => onConfirmEdit(r.id)}
              onCancelEdit={() => onCancelEdit(r.id)}
              onRemove={() => onRemove(r.id)}
              onUpdateColor={(color) => onUpdateColor(r.id, color)}
              onUpdateName={(name) => onUpdateName(r.id, name)}
              onToggleColorPicker={() =>
                onToggleColorPicker(
                  openColorPickerId === r.id ? null : r.id,
                )
              }
              onCloseColorPicker={() => onToggleColorPicker(null)}
              onToggleExpand={() => onToggleExpand(r.id)}
              getStationName={getStationName}
            />
          );
        })}
      </div>

      {/* New Route Button */}
      <div className="flex justify-center mt-4">
        <span
          role="button"
          tabIndex={0}
          onClick={onAddRoute}
          onKeyDown={(e) => e.key === "Enter" && onAddRoute()}
          className="inline-block px-4 py-2 bg-[#81069E] text-white rounded-full shadow hover:bg-[#5d0971] cursor-pointer"
        >
          New route +
        </span>
      </div>
    </div>
  );
}
