package models

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// ------------------- GEOJSON HELPERS --------------------
type GeoPoint struct {
	Type        string     `json:"type"`
	Coordinates [2]float64 `json:"coordinates"`
}

type GeoLineString struct {
	Type        string       `json:"type"`
	Coordinates [][2]float64 `json:"coordinates"`
}

// Value implements driver.Valuer for GORM (converts to WKT for PostGIS)
func (g GeoPoint) Value() (driver.Value, error) {
	return fmt.Sprintf("SRID=4326;POINT(%f %f)", g.Coordinates[0], g.Coordinates[1]), nil
}

// Scan implements sql.Scanner for GORM (converts from PostGIS to GeoPoint)
func (g *GeoPoint) Scan(value interface{}) error {
	// For now, just store the raw geometry - full parsing can be added later
	return nil
}

// Value implements driver.Valuer for GORM (converts to WKT for PostGIS)
func (g GeoLineString) Value() (driver.Value, error) {
	if len(g.Coordinates) == 0 {
		return "SRID=4326;LINESTRING EMPTY", nil
	}
	wkt := "SRID=4326;LINESTRING("
	for i, coord := range g.Coordinates {
		if i > 0 {
			wkt += ","
		}
		wkt += fmt.Sprintf("%f %f", coord[0], coord[1])
	}
	wkt += ")"
	return wkt, nil
}

// Scan implements sql.Scanner for GORM
func (g *GeoLineString) Scan(value interface{}) error {
	// For now, just store the raw geometry - full parsing can be added later
	return nil
}

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

	PublicScenarios      []PublicScenario      `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	UserScenarios        []UserScenario        `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	UserConfigurations   []UserConfiguration   `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	PublicConfigurations []PublicConfiguration `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
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

	CoverImage     CoverImageProject `gorm:"foreignKey:CoverImgID;references:CoverImageProID;constraint:OnDelete:CASCADE;"`
	ScenarioDetail ScenarioDetail    `gorm:"foreignKey:ScenarioDetailID"`
}

// ------------------- USER SCENARIO --------------------
type UserScenario struct {
	UserScenarioID   string    `gorm:"primaryKey" json:"user_scenario_id"`
	Name             string    `json:"name"`
	ModifyDate       time.Time `json:"modify_date"`
	CreateBy         string    `json:"create_by"`
	CoverImgID       string    `json:"cover_img"`
	ScenarioDetailID string    `json:"scenario_detail"`

	CoverImage     CoverImageProject `gorm:"foreignKey:CoverImgID;references:CoverImageProID;constraint:OnDelete:CASCADE;"`
	ScenarioDetail ScenarioDetail    `gorm:"foreignKey:ScenarioDetailID"`
}

// ------------------- SCENARIO DETAIL --------------------
type ScenarioDetail struct {
	ScenarioDetailID string `gorm:"primaryKey" json:"scenario_detail_id"`
	BusScenarioID    string `json:"bus_scenario"`
	RouteScenarioID  string `json:"route_scenario"`

	BusScenario   BusScenario   `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;"`
	RouteScenario RouteScenario `gorm:"foreignKey:RouteScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- BUS SCENARIO --------------------
type BusScenario struct {
	BusScenarioID  string `gorm:"primaryKey" json:"bus_scenario_id"`
	ScheduleDataID string `json:"schedule_data"`

	ScheduleData    *ScheduleData    `gorm:"foreignKey:ScheduleDataID;constraint:OnDelete:CASCADE;"`
	BusInformations []BusInformation `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- SCHEDULE DATA --------------------
type ScheduleData struct {
	ScheduleDataID string `gorm:"primaryKey" json:"schedule_data_id"`
	ScheduleList   string `json:"schedule_list"`
	RoutePathID    string `json:"route_path"`
	BusScenarioID  string `json:"bus_scenario"`

	RoutePath   *RoutePath   `gorm:"constraint:OnDelete:CASCADE"`
	BusScenario *BusScenario `gorm:"constraint:OnDelete:CASCADE"`
}

// ------------------- BUS INFORMATION --------------------
type BusInformation struct {
	BusInformationID string  `gorm:"primaryKey" json:"bus_information_id"`
	Speed            float32 `json:"speed"`
	MaxDis           float32 `json:"max_dis"`
	MaxBus           int     `json:"max_bus"`
	Capacity         int     `json:"capacity"`
	BusScenarioID    string  `json:"bus_scenario"`
	RoutePathID      string  `json:"route_path"`

	RoutePath *RoutePath `gorm:"constraint:OnDelete:CASCADE"`
}

// ------------------- ROUTE SCENARIO --------------------
type RouteScenario struct {
	RouteScenarioID string `gorm:"primaryKey" json:"route_scenario_id"`

	RoutePaths []RoutePath `gorm:"foreignKey:RouteScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- ROUTE PATH --------------------
type RoutePath struct {
	RoutePathID     string `gorm:"primaryKey" json:"route_path_id"`
	Name            string `json:"name"`
	Color           string `json:"color"`
	RouteScenarioID string `json:"route_scenario"`
	Route           string `json:"route" gorm:"type:geometry(LINESTRING,4326)"`

	Orders []Order `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE"`
}

// ------------------- ORDER --------------------
type Order struct {
	OrderID       string `gorm:"primaryKey" json:"order_id"`
	Order         int    `json:"order"`
	StationPairID string `json:"station_pair"`
	RoutePathID   string `json:"route_path"`

	RoutePath   *RoutePath   `gorm:"constraint:OnDelete:CASCADE"`
	StationPair *StationPair `gorm:"constraint:OnDelete:CASCADE"`
}

// ------------------- USER CONFIGURATION --------------------
type UserConfiguration struct {
	UserConfigurationID   string    `gorm:"primaryKey" json:"user_configuration_id"`
	Name                  string    `json:"name"`
	ModifyDate            time.Time `json:"modify_date"`
	CreateBy              string    `json:"create_by"`
	CoverImgID            string    `json:"cover_img"`
	ConfigurationDetailID string    `json:"configuration_detail"`

	CoverImage CoverImageConf `gorm:"foreignKey:CoverImgID;references:CoverImageConfID;constraint:OnDelete:CASCADE;"`
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

	CoverImage CoverImageConf `gorm:"foreignKey:CoverImgID;references:CoverImageConfID;constraint:OnDelete:CASCADE;"`
}

// ------------------- CONFIGURATION DETAIL --------------------
type ConfigurationDetail struct {
	ConfigurationDetailID string `gorm:"primaryKey" json:"configuration_detail_id"`
	AlightingDataID       string `json:"alighting_data"`
	InterArrivalDataID    string `json:"interarrival_data"`
	NetworkModelID        string `json:"network_model"`

	NetworkModel      NetworkModel       `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;"`
	AlightingDatas    []AlightingData    `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
	InterArrivalDatas []InterArrivalData `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- ALIGHTING DATA --------------------
type AlightingData struct {
	AlightingDataID       string `gorm:"primaryKey" json:"alighting_data_id"`
	ConfigurationDetailID string `json:"configuration_detail_id"`
	TimePeriod            string `json:"time_period"`
	Distribution          string `json:"distribution_name"`
	ArgumentList          string `json:"argument_list"`
	StationID             string `json:"station_id"`

	StationDetail StationDetail `gorm:"foreignKey:StationID;references:StationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- INTER ARRIVAL DATA --------------------
type InterArrivalData struct {
	InterArrivalDataID    string `gorm:"primaryKey" json:"inter_arrival_data_id"`
	ConfigurationDetailID string `json:"configuration_detail_id"`
	TimePeriod            string `json:"time_period"`
	Distribution          string `json:"distribution_name"`
	ArgumentList          string `json:"argument_list"`
	StationID             string `json:"station_id"`

	StationDetail StationDetail `gorm:"foreignKey:StationID;references:StationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- NETWORK MODEL --------------------
type NetworkModel struct {
	NetworkModelID string `gorm:"primaryKey" json:"network_model_id"`
	Name           string `json:"Network_model" gorm:"-"` // API response only (not stored in DB)

	StationPairs   []StationPair   `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;" json:"StationPair,omitempty"`
	StationDetails []StationDetail `gorm:"many2many:network_stations;" json:"Station_detail,omitempty"`
}

// ------------------- STATION DETAIL --------------------
type StationDetail struct {
	StationDetailID string   `gorm:"primaryKey" json:"station_detail_id"`
	StationID       string   `json:"StationID" gorm:"-"` // API field (maps to StationDetailID)
	Name            string   `json:"name"`
	StationName     string   `json:"StationName" gorm:"-"` // API field (maps to Name)
	Location        GeoPoint `json:"Location" gorm:"type:geometry(POINT,4326);column:location"`
	Lat             float64  `json:"lat"`
	Lon             float64  `json:"lon"`
	StationIDOSM    string   `json:"station_id_osm"`
}

// ------------------- STATION PAIR --------------------
type StationPair struct {
	StationPairID  string `gorm:"primaryKey" json:"StationPairID"`
	FstStationID   string `json:"FstStation" gorm:"column:fst_station_id"`
	SndStationID   string `json:"SndStation" gorm:"column:snd_station_id"`
	RouteBetweenID string `json:"route_between_id" gorm:"column:route_between_id"`
	NetworkModelID string `json:"network_model_id" gorm:"column:network_model_id"`

	FstStation   StationDetail `gorm:"foreignKey:FstStationID;constraint:OnDelete:CASCADE;" json:"-"`
	SndStation   StationDetail `gorm:"foreignKey:SndStationID;constraint:OnDelete:CASCADE;" json:"-"`
	RouteBetween RouteBetween  `gorm:"foreignKey:RouteBetweenID;constraint:OnDelete:CASCADE;" json:"RouteBetween"`
}

// ------------------- ROUTE BETWEEN --------------------
type RouteBetween struct {
	RouteBetweenID string        `gorm:"primaryKey" json:"RouteBetweenID" gorm:"column:route_between_id"`
	TravelTime     float64       `json:"TravelTime" gorm:"column:travel_time"`
	Route          GeoLineString `json:"Route" gorm:"type:geometry(LINESTRING,4326);column:route"`
	Distance       float64       `json:"Distance" gorm:"column:distance"`
}
