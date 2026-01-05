package models

type Scenario struct {
    Route_Scenario []Route_Scenario `json:"RouteScenario"`
    Bus_Scenario   []Bus_Scenario   `json:"BusScenario"`
}

// ------------------- MODEL ROUTE --------------------
type Route_Scenario struct {
	RouteScenarioID string       `json:"RouteScenarioID"`
	RoutePath       []Route_Path `json:"RoutePath"`
}

type Route_Path struct {
	RoutePathID    string             `json:"RoutePathID"`
	RoutePathName  string             `json:"RoutePathName"`
	RoutePathColor string             `json:"RoutePathColor"`
	Hidden         bool               `json:"Hidden"`
	Locked         bool               `json:"Locked"`
	RouteSegments  []RouteSegmentData `json:"RouteSegments"`
	Order          []Order_Path       `json:"Order"`
}

type RouteSegmentData struct {
	From   string       `json:"From"`
	To     string       `json:"To"`
	Coords [][2]float64 `json:"Coords"`
}

type Order_Path struct {
    OrderID     string  `json:"OrderID"`
    OrderNumber int     `json:"OrderNumber"`
    StationPairID string  `json:"StationPairID"`
}

/* ─────────────── Bus Scenario ─────────────── */

type Bus_Scenario struct {
	BusScenarioID  string            `json:"BusScenarioID"`
	ScheduleData   []Schedule_Data   `json:"ScheduleData"`
	BusInformation []Bus_Information `json:"BusInformation"`
}

type Schedule_Data struct {
    ScheduleDataID string `json:"ScheduleDataID"`
    RoutePathID   string `json:"RoutePathID"`
    ScheduleList string `json:"ScheduleList"`
}

type Bus_Information struct {
	BusInformationID string  `json:"BusInformationID"`
	RoutePathID      string  `json:"RoutePathID"`
	BusSpeed         float64 `json:"BusSpeed"`
	MaxDistance      float64 `json:"MaxDistance"`
	BusCapacity      int     `json:"BusCapacity"`
	MaxBuses         int     `json:"MaxBuses"`
}
