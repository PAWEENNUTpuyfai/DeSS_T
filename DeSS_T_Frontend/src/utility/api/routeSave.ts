// import { API_BASE_URL } from "../config";
// import type { EditableRoute } from "../../app/components/ScenarioMap";

// /**
//  * Save routes and bus information separately to backend.
//  * Routes store geometry/stations, BusInfo stores bus parameters.
//  */
// export async function saveRoutes(routes: EditableRoute[], timeoutMs = 15000): Promise<void> {
//   if (!routes || routes.length === 0) return;

//   const controller = new AbortController();
//   const t = setTimeout(() => controller.abort(), timeoutMs);

//   try {
//     // Prepare route data (geometry + visibility)
//     const routeData = routes.map(route => ({
//       id: route.id,
//       name: route.name,
//       color: route.color,
//       hidden: route.hidden,
//       locked: route.locked,
//       stations: route.stations,
//       segments: route.segments,
//     }));

//     // Prepare bus info data (parameters only)
//     const busInfo = routes.map(route => ({
//       routeId: route.id,
//       maxDistance: route.maxDistance,
//       speed: route.speed,
//       capacity: route.capacity,
//       maxBuses: route.maxBuses,
//     }));

//     const res = await fetch(`${API_BASE_URL}/network/save-routes`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ routes: routeData, busInfo }),
//       signal: controller.signal,
//     });

//     if (!res.ok) {
//       const txt = await res.text().catch(() => "");
//       throw new Error(`Save routes API error: ${res.status} ${res.statusText} ${txt}`);
//     }
//   } finally {
//     clearTimeout(t);
//   }
// }
