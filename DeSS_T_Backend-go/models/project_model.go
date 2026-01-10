package models


type ProjectSimulationRequest struct {
	ConfigurationDetail  ConfigurationDetail `json:"configuration"`
	ScenarioDetail       ScenarioDetail      `json:"scenario"`
	TimePeriods       string		   `json:"time_periods"`
	TimeSlot		  string           `json:"time_slot"`
}