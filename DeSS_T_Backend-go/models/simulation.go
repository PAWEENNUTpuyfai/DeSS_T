package models

type SimulationRequest struct {
	ConfigurationData ConfigurationData `json:"configuration_data"`
	ScenarioData []ScenarioData `json:"scenario_data"`
}

type ScenarioData struct {
	RouteID string `json:"route_id"`	
	RouteName string `json:"route_name"`
	RouteOrder string `json:"route_order"`
	RouteSchedule []RouteSchedule `json:"route_schedule"`
	RouteBusInformation RouteBusInformation `json:"bus_information"`
}

type RouteSchedule struct {
	DepartureTime string `json:"departure_time"`
}

type RouteBusInformation struct {
	BusSpeed    float64 `json:"bus_speed"`
	MaxDistance float64 `json:"max_distance"`
	MaxBus      int     `json:"max_bus"`
	BusCapacity int     `json:"bus_capacity"`
}

type ConfigurationData struct {
	RoutePair []RoutePair `json:"route_pair"`
	AlightingSimData []SimData `json:"alighting_data"`
	InterarrivalSimData []SimData `json:"interarrival_data"`
}

type RoutePair struct {
	RoutePairID string `json:"route_pair_id"`
	FstStation string `json:"fst_station"`
	SndStation string `json:"snd_station"`
	TravelTime float64 `json:"travel_time"`
	Distance   float64 `json:"distance"`
}

type SimData struct {
	TimeRange string `json:"time_range"`
	DisRecords []DisRecord `json:"alighting_records"`
}

type DisRecord struct {
	Station string  `json:"station"`
	Distribution string `json:"Distribution"`
	ArgumentList string `json:"ArgumentList"`
}

type SimulationResponse struct {
	Result string `json:"result"`
	Logs   []string `json:"logs"`
}