import type { SimulationResponse } from "../models/SimulationModel";

export function analyzeSimulationResponse(sim: SimulationResponse) {
  if (!sim) {
    console.warn("[Simulation Analysis] No simulation response provided");
    return null;
  }

  const result_summary = sim.simulation_result?.result_summary;
  const slot_results = sim.simulation_result?.slot_results || [];
  const logs = sim.logs || [];

  // Collect all unique routes and stations
  const routeIds = new Set<string>();
  const stationNames = new Set<string>();
  let totalCustomers = 0;

  slot_results.forEach((slot) => {
    slot.result_route?.forEach((route) => {
      routeIds.add(route.route_id);
      totalCustomers += route.customers_count;
    });
    slot.result_station?.forEach((station) => {
      stationNames.add(station.station_name);
    });
  });

  const analysis = {
    resultStatus: sim.result,
    timeSlots: slot_results.length,
    timeSlotNames: slot_results.map((s) => s.slot_name),
    uniqueRoutes: routeIds.size,
    routeIds: Array.from(routeIds),
    uniqueStations: stationNames.size,
    stationNames: Array.from(stationNames),
    totalCustomers,
    averagePerSlot: slot_results.length > 0 ? totalCustomers / slot_results.length : 0,
    summary: result_summary && {
      avgWaitingTime: `${(result_summary.average_waiting_time / 60).toFixed(2)} mins`,
      avgQueueLength: result_summary.average_queue_length.toFixed(2),
      avgUtilization: `${(result_summary.average_utilization * 100).toFixed(1)}%`,
      avgTravelTime: `${(result_summary.average_travel_time / 60).toFixed(2)} mins`,
      avgTravelDistance: `${(result_summary.average_travel_distance / 1000).toFixed(2)} km`,
    },
    logCount: logs.length,
    sampleLogs: logs.slice(0, 3).map((l) => `[${l.component}] ${l.message}`),
  };

  return analysis;
}

export function compareWithScenario(
  sim: SimulationResponse,
  scenarioRouteIds: string[]
) {
  if (!sim) return { match: false, details: "No simulation response" };

  const simRouteIds = new Set<string>();
  sim.simulation_result?.slot_results?.forEach((slot) => {
    slot.result_route?.forEach((route) => {
      simRouteIds.add(route.route_id);
    });
  });

  const scenarioSet = new Set(scenarioRouteIds);
  const missing = Array.from(scenarioSet).filter((id) => !simRouteIds.has(id));
  const unexpected = Array.from(simRouteIds).filter((id) => !scenarioSet.has(id));

  const match = missing.length === 0 && unexpected.length === 0;

  const comparison = {
    match,
    scenarioRouteCount: scenarioRouteIds.length,
    simulationRouteCount: simRouteIds.size,
    missingFromSimulation: missing,
    unexpectedInSimulation: unexpected,
  };

  return comparison;
}
