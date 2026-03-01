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
// ------------------ InterarrivalValuesResponse ------------------
// ส่งค่า interarrival ที่คำนวณได้กลับไปให้ frontend

type InterarrivalItem struct {
    Station        string    `json:"Station"`
    StationName    string    `json:"StationName"`        // ชื่อสถานีดั้งเดิม (สำหรับแสดงผล)
    TimeRange      string    `json:"Time_Range"`
    OriginalValues []float64 `json:"OriginalValues"`    // ค่าดั้งเดิมจาก Excel
    InterarrivalValues []float64 `json:"InterarrivalValues"` // ค่าที่คำนวณได้ (ความแตกต่าง)
}

type InterarrivalValuesResponse struct {
    Data []InterarrivalItem `json:"Data"`
}