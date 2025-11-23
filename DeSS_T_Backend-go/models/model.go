package models

import "time"

// ------------------- USER --------------------
type User struct {
	GoogleID     string    `gorm:"primaryKey" json:"google_id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Picture      string    `json:"picture_url"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenExpires time.Time `json:"token_expires_at"`
	LastLogin    time.Time `json:"last_login"`
	CreatedAt    time.Time `json:"created_at"`
}

// ------------------- COVER IMAGE --------------------
type CoverImageProject struct {
	CoverImageProID string `gorm:"primaryKey" json:"cover_image_pro_id"`
	PathFile        string `json:"path_file"`
}

type CoverImageConf struct {
	CoverImageConfID string `gorm:"primaryKey" json:"cover_image_conf_id"`
	PathFile         string `json:"path_file"`
}

// ------------------- PUBLIC SCENARIO --------------------
type PublicScenario struct {
	PublicScenarioID string    `gorm:"primaryKey" json:"public_scenario_id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	ModifyDate       time.Time `json:"modify_date"`
	PublishDate      time.Time `json:"publish_date"`
	CreateBy         string    `json:"create_by"`
	PublishBy        string    `json:"publish_by"`
	OriginFrom       string    `json:"origin_from"`
	CoverImgID       string    `json:"cover_img"`
	ScenarioDetailID string    `json:"scenario_detail"`
}

// ------------------- USER SCENARIO --------------------
type UserScenario struct {
	UserScenarioID   string    `gorm:"primaryKey" json:"user_scenario_id"`
	Name             string    `json:"name"`
	ModifyDate       time.Time `json:"modify_date"`
	CreateBy         string    `json:"create_by"`
	CoverImgID       string    `json:"cover_img"`
	ScenarioDetailID string    `json:"scenario_detail"`
}

// ------------------- SCENARIO DETAIL --------------------
type ScenarioDetail struct {
	ScenarioDetailID string `gorm:"primaryKey" json:"scenario_detail_id"`
	BusScenarioID    string `json:"bus_scenario"`
	RouteScenarioID  string `json:"route_scenario"`
}

// ------------------- BUS SCENARIO --------------------
type BusScenario struct {
	BusScenarioID  string `gorm:"primaryKey" json:"bus_scenario_id"`
	ScheduleDataID string `json:"schedule_data"`
}

// ------------------- SCHEDULE DATA --------------------
type ScheduleData struct {
	ScheduleDataID string `gorm:"primaryKey" json:"schedule_data_id"`
	ScheduleList   string `json:"schedule_list"`
	RoutePathID    string `json:"route_path"`
}

// ------------------- BUS INFORMATION --------------------
type BusInformation struct {
	BusInformationID string  `gorm:"primaryKey" json:"bus_information_id"`
	Speed            float32 `json:"speed"`
	MaxDis           float32 `json:"max_dis"`
	MaxBus           int     `json:"max_bus"`
	Capacity         int     `json:"capacity"`
	BusScenarioID    string  `json:"bus_scenario"`
}

// ------------------- ROUTE SCENARIO --------------------
type RouteScenario struct {
	RouteScenarioID string `gorm:"primaryKey" json:"route_scenario_id"`
}

// ------------------- ROUTE PATH --------------------
type RoutePath struct {
	RoutePathID     string `gorm:"primaryKey" json:"route_path_id"`
	Name            string `json:"name"`
	Color           string `json:"color"`
	RouteScenarioID string `json:"route_scenario"`
}

// ------------------- ORDER --------------------
type Order struct {
	OrderID       string `gorm:"primaryKey" json:"order_id"`
	Order         int    `json:"order"`
	StationPairID string `json:"station_pair"`
	RoutePathID   string `json:"route_path"`
}

// ------------------- USER CONFIGURATION --------------------
type UserConfiguration struct {
	UserConfigurationID   string    `gorm:"primaryKey" json:"user_configuration_id"`
	Name                  string    `json:"name"`
	ModifyDate            time.Time `json:"modify_date"`
	CreateBy              string    `json:"create_by"`
	CoverImgID            string    `json:"cover_img"`
	ConfigurationDetailID string    `json:"configuration_detail"`
}

// ------------------- PUBLIC CONFIGURATION --------------------
type PublicConfiguration struct {
	PublicConfigurationID string    `gorm:"primaryKey" json:"public_configuration_id"`
	Name                  string    `json:"name"`
	Description           string    `json:"description"`
	ModifyDate            time.Time `json:"modify_date"`
	PublishDate           time.Time `json:"publish_date"`
	CoverImgID            string    `json:"cover_img"`
	CreateBy              string    `json:"create_by"`
	PublishBy             string    `json:"publish_by"`
	OriginFrom            string    `json:"origin_from"`
	ConfigurationDetailID string    `json:"configuration_detail"`
}

// ------------------- CONFIGURATION DETAIL --------------------
type ConfigurationDetail struct {
	ConfigurationDetailID string `gorm:"primaryKey" json:"configuration_detail_id"`
	AlightingDataID       string `json:"alighting_data"`
	InterArrivalDataID    string `json:"interarrival_data"`
	NetworkModelID        string `json:"network_model"`
}

// ------------------- ALIGHTING DATA --------------------
type AlightingData struct {
	AlightingDataID string `gorm:"primaryKey" json:"alighting_data_id"`
	TimePeriod      string `json:"time_period"`
	Distribution    string `json:"distribution_name"`
	ArgumentList    string `json:"argument_list"`
	StationID       string `json:"station_id"`
}

// ------------------- INTER ARRIVAL DATA --------------------
type InterArrivalData struct {
	InterArrivalDataID string `gorm:"primaryKey" json:"inter_arrival_data_id"`
	TimePeriod         string `json:"time_period"`
	Distribution       string `json:"distribution_name"`
	ArgumentList       string `json:"argument_list"`
	StationID          string `json:"station_id"`
}

// ------------------- NETWORK MODEL --------------------
type NetworkModel struct {
	NetworkModelID string `gorm:"primaryKey" json:"network_model_id"`
}

// ------------------- STATION DETAIL --------------------
type StationDetail struct {
	StationDetailID string  `gorm:"primaryKey" json:"station_detail_id"`
	Name            string  `json:"name"`
	Location        string  `json:"location" gorm:"type:geometry(POINT,4326)"`
	Lat             float64 `json:"lat"`
	Lon             float64 `json:"lon"`
}

// ------------------- STATION PAIR --------------------
type StationPair struct {
	StationPairID  string `gorm:"primaryKey" json:"station_pair_id"`
	FstStationID   string `json:"fst_station"`
	SndStationID   string `json:"snd_station"`
	RouteBetweenID string `json:"route_between"`
	NetworkModelID string `json:"network_model"`
}

// ------------------- ROUTE BETWEEN --------------------
type RouteBetween struct {
	RouteBetweenID string  `gorm:"primaryKey" json:"route_between_id"`
	TravelTime     float32 `json:"travel_time"`
	Route          string  `json:"route" gorm:"type:geometry(LINESTRING,4326)"`
	Distance       float32 `json:"distance"`
}
