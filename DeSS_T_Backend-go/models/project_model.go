package models

type ProjectSimulationRequest struct {
	ProjectID         string             `json:"project_id"`
	Configuration     Configuration 	 `json:"configuration"`
	Scenario 		  Scenario         `json:"scenario"`
	TimePeriods       string		   `json:"time_periods"`
}