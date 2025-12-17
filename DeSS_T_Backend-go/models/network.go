package models

type Network_Model struct {
    NetworkModel  string          `json:"Network_model"`
    StationDetail []Station_Detail `json:"Station_detail"`
    StationPair   []Station_Pair   `json:"StationPair"`
}

/* ─────────────── Station Detail ─────────────── */

type Station_Detail struct {
    StationID   string   `json:"StationID"`
    StationName string   `json:"StationName"`
    Location    GeoPoint `json:"location"`
    Lat         string   `json:"Lat"`
    Lon         string   `json:"Lon"`
}

type GeoPoint struct {
    Type        string     `json:"type"`
    Coordinates [2]float64 `json:"coordinates"`
} 

/* ─────────────── Station Pair ─────────────── */

type Station_Pair struct {
    StationPairID string        `json:"StationPairID"`
    FstStation   string        `json:"FstStation"`
    SndStation   string        `json:"SndStation"`
    RouteBetween Route_Between  `json:"RouteBetween"`
}

type Route_Between struct {
    RouteBetweenID string         `json:"RouteBetweenID"`
    TravelTime     float64        `json:"TravelTime"`
    Route          GeoLineString  `json:"Route"`
    Distance       float64        `json:"Distance"`
}

type GeoLineString struct {
    Type        string        `json:"type"`
    Coordinates [][2]float64  `json:"coordinates"`
}

