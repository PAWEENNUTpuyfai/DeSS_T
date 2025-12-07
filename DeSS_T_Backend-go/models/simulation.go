package models

type SimulationRequest struct {
	TimeRange string `json:"Time_Range"`
	NetworkMapping []NetworkMapping `json:"NetworkMapping"`
	AlightingDist []AlightingDist `json:"AlightingDist"`
	InterarrivalDist []InterarrivalDist `json:"InterarrivalDist"`
}

type NetworkMapping struct {
	RouteBetweenID string `json:"RouteBetweenID"`
	RouteDistance  float64 `json:"RouteDistance"`
	RouteTravelTime float64 `json:"RouteTravelTime"`
}



type AlightingDist struct {
	Station       string  `json:"Station"`
	Distribution  string  `json:"Distribution"`
	ArgumentList  string  `json:"ArgumentList"`
}


type InterarrivalDist struct {
	Station       string  `json:"Station"`
	Distribution  string  `json:"Distribution"`
	ArgumentList  string  `json:"ArgumentList"`
}

type ScenatioSim struct {
	RouteScenario []RouteScenario `json:"RouteScenario"`
	BusScenario   []BusScenario   `json:"BusScenario"`
	TimeSlot      string		 `json:"TimeSlot"`
}