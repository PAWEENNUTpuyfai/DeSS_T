package models

type Scenario struct {
	RouteScenario []RouteScenario `json:"RouteScenario"`
	BusScenario   []BusScenario   `json:"BusScenario"`
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
	OrderID     string `json:"OrderID"`
	OrderNumber int    `json:"OrderNumber"`
	StationPair string `json:"StationPair"`
}

/* ─────────────── Bus Scenario ─────────────── */

type Bus_Scenario struct {
	BusScenarioID  string            `json:"BusScenarioID"`
	BusSchedule    []Bus_Schedule    `json:"BusSchedule"`
	BusInformation []Bus_Information `json:"BusInformation"`
}

type Bus_Schedule struct {
	BusScheduleID string `json:"BusScheduleID"`
	RoutePathID   string `json:"RoutePathID"`
}

type Bus_Information struct {
	BusInformationID string  `json:"BusInformationID"`
	RoutePathID      string  `json:"RoutePathID"`
	BusSpeed         float64 `json:"BusSpeed"`
	MaxDistance      float64 `json:"MaxDistance"`
	BusCapacity      int     `json:"BusCapacity"`
	MaxBuses         int     `json:"MaxBuses"`
}