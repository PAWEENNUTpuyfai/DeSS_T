package models

// ======================================================
// GEO JSON
// ======================================================

type GeoPoint struct {
	Type        string     `json:"type"`
	Coordinates [2]float64 `json:"coordinates"`
}

type GeoLineString struct {
	Type        string       `json:"type"`
	Coordinates [][2]float64 `json:"coordinates"`
}

// ======================================================
// ROOT CONFIGURATION
// ======================================================

type ConfigurationJSON struct {
	Configuration ConfigurationDetail `json:"configuration"`
}

type ConfigurationDetail struct {
	ConfigurationDetailID string             `json:"configuration_detail_id"`
	NetworkModelID        string             `json:"network_model_id"`
	NetworkModel          NetworkModel       `json:"network_model"`
	AlightingData         []AlightingData    `json:"alighting_datas"`
	InterArrivalData      []InterArrivalData `json:"interarrival_datas"`
}

// ======================================================
// NETWORK MODEL
// ======================================================

type NetworkModel struct {
	NetworkModelID string `json:"network_model_id"`
	Name           string `json:"Network_model"`

	StationPairs   []StationPair   `json:"StationPair,omitempty"`
	StationDetails []StationDetail `json:"Station_detail,omitempty"`
	RouteScenario  RouteScenario   `json:"route_scenario,omitempty"`
}

// ======================================================
// STATION DETAIL
// ======================================================

type StationDetail struct {
	StationDetailID string   `json:"station_detail_id"`
	StationID       string   `json:"StationID,omitempty"`
	Name            string   `json:"name"`
	StationName     string   `json:"StationName,omitempty"`
	Location        GeoPoint `json:"location"`
	Lat             float64  `json:"lat"`
	Lon             float64  `json:"lon"`
	StationIDOSM    string   `json:"station_id_osm"`
}

// ======================================================
// STATION PAIR
// ======================================================

type StationPair struct {
	StationPairID  string `json:"StationPairID"`
	FstStationID   string `json:"FstStation"`
	SndStationID   string `json:"SndStation"`
	RouteBetweenID string `json:"route_between_id"`
	NetworkModelID string `json:"network_model_id"`

	RouteBetween RouteBetween `json:"RouteBetween"`
}

// ======================================================
// ROUTE BETWEEN
// ======================================================

type RouteBetween struct {
	RouteBetweenID string  `json:"RouteBetweenID"`
	TravelTime     float64 `json:"TravelTime"`
	Distance       float64 `json:"Distance"`
}

// ======================================================
// ROUTE SCENARIO
// ======================================================

type RouteScenario struct {
	RouteScenarioID string      `json:"route_scenario_id"`
	RoutePaths      []RoutePath `json:"route_paths"`
}

// ======================================================
// ROUTE PATH
// ======================================================

type RoutePath struct {
	RoutePathID string `json:"route_path_id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Route       string `json:"route"`

	Orders []Order `json:"orders"`
}

// ======================================================
// ORDER
// ======================================================

type Order struct {
	OrderID       string `json:"order_id"`
	Order         int    `json:"order"`
	StationPairID string `json:"station_pair_id"`
	RoutePathID   string `json:"route_path_id"`

	StationPair StationPair `json:"station_pair"`
}

// ======================================================
// SCENARIO DETAIL
// ======================================================

type ScenarioDetail struct {
	ScenarioDetailID string `json:"scenario_detail_id"`
	BusScenarioID    string `json:"bus_scenario_id"`
	RouteScenarioID  string `json:"route_scenario_id"`

	BusScenario   BusScenario   `json:"bus_scenario"`
	RouteScenario RouteScenario `json:"route_scenario"`
}

// ======================================================
// BUS SCENARIO
// ======================================================

type BusScenario struct {
	BusScenarioID string `json:"bus_scenario_id"`

	ScheduleData    []ScheduleData   `json:"schedule_data"`
	BusInformations []BusInformation `json:"bus_informations"`
}

// ======================================================
// SCHEDULE DATA
// ======================================================

type ScheduleData struct {
	ScheduleDataID string `json:"schedule_data_id"`
	ScheduleList   string `json:"schedule_list"`
	RoutePathID    string `json:"route_path_id"`
	BusScenarioID  string `json:"bus_scenario_id"`

	RoutePath RoutePath `json:"route_path_detail"`
}

// ======================================================
// BUS INFORMATION
// ======================================================

type BusInformation struct {
	BusInformationID string  `json:"bus_information_id"`
	Speed            float32 `json:"speed"`
	MaxDis           float32 `json:"max_dis"`
	MaxBus           int     `json:"max_bus"`
	Capacity         int     `json:"capacity"`
	AvgTravelTime    float32 `json:"avg_travel_time"`
	BusScenarioID    string  `json:"bus_scenario_id"`
	RoutePathID      string  `json:"route_path_id"`

	RoutePath RoutePath `json:"route_path_detail"`
}

// ======================================================
// ALIGHTING DATA
// ======================================================

type AlightingData struct {
	AlightingDataID       string `json:"alighting_data_id"`
	ConfigurationDetailID string `json:"configuration_detail_id"`
	TimePeriod            string `json:"time_period"`
	Distribution          string `json:"distribution"`
	ArgumentList          string `json:"argument_list"`
	StationID             string `json:"station_id"`

	StationDetail StationDetail `json:"station_detail"`
}

// ======================================================
// INTER ARRIVAL DATA
// ======================================================

type InterArrivalData struct {
	InterArrivalDataID    string `json:"interarrival_data_id"`
	ConfigurationDetailID string `json:"configuration_detail_id"`
	TimePeriod            string `json:"time_period"`
	Distribution          string `json:"distribution"`
	ArgumentList          string `json:"argument_list"`
	StationID             string `json:"station_id"`

	StationDetail StationDetail `json:"station_detail"`
}
