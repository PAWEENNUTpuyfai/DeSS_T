package models

type Configuration struct {
	NetworkModel             NetworkModel    `json:"Network_model"`
	AlightingDistribution    DataFitResponse `json:"Alighting_Distribution"`
	InterarrivalDistribution DataFitResponse `json:"Interarrival_Distribution"`
}
