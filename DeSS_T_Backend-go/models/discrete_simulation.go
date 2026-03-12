package models

type DiscreteSimulation struct {
	ConfigurationDetailID string                `json:"configuration_detail_id"`
	ArrivalList 		[]ArrivalList       `json:"arrival_list"`
}

type ArrivalList struct {
	StationID        string                `json:"stationid"`
	ArrivalTimeData  []ArrivalTimeEntry    `json:"ArrivalTimeData"`
}

type ArrivalTimeEntry struct {
	Date         string    `json:"date"`
	ArrivalTimes []string `json:"ArrivalTimes"`
}

type DiscreteSimulationRequest struct {
	TimePeriods string `json:"time_period"`
	TimeSlot string `json:"time_slot"`
	DiscreteConfigurationData DiscreteConfigurationData `json:"discrete_configuration_data"`
	ScenarioData []ScenarioData `json:"scenario_data"`
}

type DiscreteConfigurationData struct {
	StationList []StationList `json:"station_list"`
	RoutePair []RoutePair `json:"route_pair"`
	AlightingSimData []SimData `json:"alighting_data"`
	ArrivalList []ArrivalList `json:"arrival_list"`
}

type DiscreteSimulationResult struct {
    AverageWaitingTime     float64 `json:"average_waiting_time"`
    AverageQueueLength    float64 `json:"average_queue_length"`
    AverageUtilization    float64 `json:"average_utilization"`
    AverageTravelTime     float64 `json:"average_travel_time"`
    AverageTravelDistance float64 `json:"average_travel_distance"`
}