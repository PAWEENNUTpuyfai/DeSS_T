export interface SimulationLog {
  time: string;
  component: string;
  message: string;
}

export interface ResultSummary {
  average_waiting_time: number;
  average_queue_length: number;
  average_utilization: number;
  average_travel_time: number;
  average_travel_distance: number;
}

export interface TotalStation {
  average_waiting_time: number;
  average_queue_length: number;
}

export interface ResultStation {
  station_name: string;
  average_waiting_time: number;
  average_queue_length: number;
}

export interface ResultRoute {
  route_id: string;
  average_utilization: number;
  average_travel_time: number;
  average_travel_distance: number;
  average_waiting_time: number;
  average_queue_length: number;
  customers_count: number;
}

export interface SimulationSlotResult {
  slot_name: string;
  result_total_station: TotalStation;
  result_station: ResultStation[];
  result_route: ResultRoute[];
}

export interface SimulationResult {
  result_summary: ResultSummary;
  slot_results: SimulationSlotResult[];
}

export interface SimulationResponse {
  result: string;
  simulation_result: SimulationResult;
  logs: SimulationLog[];
}
