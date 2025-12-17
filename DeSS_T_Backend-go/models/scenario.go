package models


type Scenario struct {
    Route_Scenario []Route_Scenario `json:"RouteScenario"`
    Bus_Scenario   []Bus_Scenario   `json:"BusScenario"`
}

// ------------------- MODEL ROUTE --------------------
type Route_Scenario struct {
    RouteScenarioID     string    `json:"RouteScenarioID"`
    RoutePath           []Route_Path `json:"RoutePath"`
}

type Route_Path struct {
    RoutePathID     string  `json:"RoutePathID"`
    RoutePathName   string  `json:"RoutePathName"`
    RoutePathColor  string  `json:"RoutePathColor"`
    Order           []Order_Path `json:"Order"`
}

type Order_Path struct {
    OrderID     string  `json:"OrderID"`
    OrderNumber int     `json:"OrderNumber"`
    StationPairID string  `json:"StationPairID"`
}



/* ─────────────── Bus Scenario ─────────────── */

type Bus_Scenario struct {
    BusScenarioID  string          `json:"BusScenarioID"`
    BusSchedule    []Bus_Schedule   `json:"BusSchedule"`
    BusInformation []Bus_Information `json:"BusInformation"`
}

type Bus_Schedule struct {
    BusScheduleID string `json:"BusScheduleID"`
    RoutePathID   string `json:"RoutePathID"`
    ScheduleData   string `json:"ScheduleData"`
}

type Bus_Information struct {
    BusInformationID string  `json:"BusInformationID"`
    BusSpeed         float64 `json:"BusSpeed"`
    MaxDistance      float64 `json:"MaxDistance"`
    MaxBus           int     `json:"MaxBus"`
    BusCapacity      int     `json:"BusCapacity"`
}
