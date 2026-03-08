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