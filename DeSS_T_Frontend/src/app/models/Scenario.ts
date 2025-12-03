export interface Scenario {
  RouteScenario: RouteScenario[];
  BusScenario: BusScenario[];
}
/* ─────────────── Bus Scenario ─────────────── */
export interface BusScenario {
  BusScenarioID: string;
  BusSchedule: BusSchedule[];
  BusInformation: BusInformation[];
}

export interface BusSchedule {
  BusScheduleID: string;
  RoutePathID: string;
}

export interface BusInformation {
    BusInformationID: string;
    BusSpeed: number;
    MaxDistance: number;
    MaxBus: number;
    BusCapacity: number;
}


/* ─────────────── Route Path ─────────────── */
export interface RouteScenario {
  RouteScenarioID: string;
  RoutePath: RoutePath[];
}

export interface RoutePath {
  RoutePathID: string;
  RoutePathName: string;
  RoutePathColor: string;
  Order: OrderPath[];
}

export interface OrderPath {
  OrderID: string;
  OrderNumber: number;
  StationPair: string;
}
