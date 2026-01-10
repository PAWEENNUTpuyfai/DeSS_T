package models

type ProjectSimulationRequest struct {
	Configuration     Configuration 	 `json:"configuration"`
	Scenario 		  Scenario         `json:"scenario"`
	TimePeriods       string		   `json:"time_periods"`
	TimeSlot		  string           `json:"time_slot"`
}