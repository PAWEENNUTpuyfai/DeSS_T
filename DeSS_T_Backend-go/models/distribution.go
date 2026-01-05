package models

// ------------------ RecordDistRequest ------------------

type RecordDistRequest struct {
    RecordID     int     `json:"Record_ID"`     // alias from Python: Record_ID
    NumericValue float64 `json:"Numeric_Value"` // alias from Python: Numeric_Value
}

// ------------------ ItemDistRequest ------------------

type ItemDistRequest struct {
    Station   string               `json:"Station"`
    TimeRange string               `json:"Time_Range"` // alias from Python
    Records   []RecordDistRequest  `json:"Records"`
}

// ------------------ DataModelDistRequest ------------------

type DataModelDistRequest struct {
    Data []ItemDistRequest `json:"Data"`
}

// ------------------ FitItem ------------------

type FitItem struct {
    Station      string `json:"Station"`
    TimeRange    string `json:"Time_Range"`   // matches Python
    Distribution string `json:"Distribution"`
    ArgumentList string `json:"ArgumentList"`
}

// ------------------ DataFitResponse ------------------

type DataFitResponse struct {
    DataFitResponse []FitItem `json:"DataFitResponse"`
}
