import type { StationPair } from "./Network";

// ------------------- SCENARIO DETAIL --------------------
export interface ScenarioDetail {
  scenario_detail_id: string;
  bus_scenario_id: string;
  route_scenario_id: string;
  configuration_detail_id: string;
  bus_scenario?: BusScenario;
  route_scenario?: RouteScenario;
}

// ------------------- BUS SCENARIO --------------------
export interface BusScenario {
  bus_scenario_id: string;
  schedule_data?: ScheduleData[];
  bus_informations?: BusInformation[];
}

// ------------------- SCHEDULE DATA --------------------
export interface ScheduleData {
  schedule_data_id: string;
  schedule_list: string;
  route_path_id: string;
  bus_scenario_id: string;
  route_path?: RoutePath;
  bus_scenario?: BusScenario;
}

// ------------------- BUS INFORMATION --------------------
export interface BusInformation {
  bus_information_id: string;
  speed: number;
  max_dis: number;
  max_bus: number;
  capacity: number;
  avg_travel_time: number;
  bus_scenario_id: string;
  route_path_id: string;
  route_path?: RoutePath;
}

// ------------------- ROUTE SCENARIO --------------------
export interface RouteScenario {
  route_scenario_id: string;
  route_paths?: RoutePath[];
}

// ------------------- ROUTE PATH --------------------
export interface RoutePath {
  route_path_id: string;
  name: string;
  color: string;
  route_scenario_id: string;
  route: string; // GeoJSON as string: "type:geometry(LINESTRING,4326)"
  orders?: Order[];
}

// ------------------- ORDER --------------------
export interface Order {
  order_id: string;
  order: number; // Sequential order number
  station_pair_id: string;
  route_path_id: string;
  route_path?: RoutePath;
  station_pair?: StationPair;
}
