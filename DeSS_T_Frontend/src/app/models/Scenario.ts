export interface Scenario {
  RouteScenario: RouteScenario[];
  BusScenario: BusScenario[];
}
/* ─────────────── Bus Scenario ─────────────── */
export interface BusScenario {
  BusScenarioID: string;
  ScheduleData: ScheduleData[];
  BusInformation: BusInformation[];
}

export interface ScheduleData {
  ScheduleDataID: string;
  RoutePathID: string;
  ScheduleList: string;
}

export interface BusInformation {
    BusInformationID: string;
    RoutePathID : string;
    BusSpeed: number;
    MaxDistance: number;
    BusCapacity: number;
    MaxBuses: number;
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
