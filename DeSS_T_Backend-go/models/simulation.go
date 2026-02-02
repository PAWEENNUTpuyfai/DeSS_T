package models

type SimulationRequest struct {
	TimePeriod string `json:"time_period"`
	TimeSlot string `json:"time_slot"`
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
	AvgTravelTime float64 `json:"avg_travel_time"`
}

type ConfigurationData struct {
	StationList []StationList `json:"station_list"`
	RoutePair []RoutePair `json:"route_pair"`
	AlightingSimData []SimData `json:"alighting_data"`
	InterarrivalSimData []SimData `json:"interarrival_data"`
}

type StationList struct {
	StationID string `json:"station_id"`
	StationName string `json:"station_name"`
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
	DisRecords []DisRecord `json:"records"`
}

type DisRecord struct {
	Station string  `json:"station"`
	Distribution string `json:"Distribution"`
	ArgumentList string `json:"ArgumentList"`
}


// ---------------- SimulationResult ----------------

type SimulationResult struct {
    ResultSummary ResultSummary          `json:"result_summary"`
    SlotResults   []SimulationSlotResult `json:"slot_results"`
}

// ---------------- SimulationSlotResult ----------------

type SimulationSlotResult struct {
    SlotName       string          `json:"slot_name"`
    ResultStation  []ResultStation `json:"result_station"`
    ResultRoute    []ResultRoute   `json:"result_route"`
}

// ---------------- ResultSummary ----------------

type ResultSummary struct {
    AverageWaitingTime     float64 `json:"average_waiting_time"`
    AverageQueueLength    float64 `json:"average_queue_length"`
    AverageUtilization    float64 `json:"average_utilization"`
    AverageTravelTime     float64 `json:"average_travel_time"`
    AverageTravelDistance float64 `json:"average_travel_distance"`
}

// ---------------- ResultStation ----------------

type ResultStation struct {
    StationName        string  `json:"station_name"`
    AverageWaitingTime float64 `json:"average_waiting_time"`
    AverageQueueLength float64 `json:"average_queue_length"`
}

// ---------------- ResultRoute ----------------

type ResultRoute struct {
    RouteID               string  `json:"route_id"`
    AverageUtilization    float64 `json:"average_utilization"`
    AverageTravelTime     float64 `json:"average_travel_time"`
    AverageTravelDistance float64 `json:"average_travel_distance"`
    AverageWaitingTime    float64 `json:"average_waiting_time"`
    AverageQueueLength    float64 `json:"average_queue_length"`
    CustomersCount        int     `json:"customers_count"`
}