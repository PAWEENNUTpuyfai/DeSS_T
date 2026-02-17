package model_database

import (
	// "database/sql/driver"
	// "fmt"
	"time"


)

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

    CreatedPublicScenarios  []PublicScenario `gorm:"foreignKey:CreateBy"`
    PublishedPublicScenarios []PublicScenario `gorm:"foreignKey:PublishBy"`
	CreatedUserScenarios        []UserScenario        `gorm:"foreignKey:CreateBy"`
	CreatedUserConfigurations   []UserConfiguration   `gorm:"foreignKey:CreateBy"`
	CreatedPublicConfigurations []PublicConfiguration `gorm:"foreignKey:CreateBy"`
	PublishedPublicConfigurations []PublicConfiguration `gorm:"foreignKey:PublishBy"`
}

// ------------------- COVER IMAGE --------------------
type CoverImageProject struct {
	CoverImageProID string `gorm:"primaryKey" json:"cover_image_pro_id"`
	PathFile        string `json:"path_file"`

	ImgUserScenarios   []UserScenario   `gorm:"foreignKey:CoverImgID"`
	ImgPublicScenarios []PublicScenario `gorm:"foreignKey:CoverImgID"`
}

type CoverImageConf struct {
	CoverImageConfID string `gorm:"primaryKey" json:"cover_image_conf_id"`
	PathFile         string `json:"path_file"`

	ImgUserConfigurations   []UserConfiguration   `gorm:"foreignKey:CoverImgID"`
	ImgPublicConfigurations []PublicConfiguration `gorm:"foreignKey:CoverImgID"`
}

// ------------------- PUBLIC SCENARIO --------------------
type PublicScenario struct {
	PublicScenarioID string    `gorm:"primaryKey" json:"public_scenario_id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	ModifyDate       time.Time `json:"modify_date"`
	PublishDate      time.Time `json:"publish_date"`
	CreateBy         string    `json:"create_by" gorm:"column:create_by"`
	PublishBy        string    `json:"publish_by" gorm:"column:publish_by"`
	CoverImgID       *string   `json:"cover_img" gorm:"column:cover_img_id"`
	ScenarioDetailID string    `json:"scenario_detail" gorm:"column:scenario_detail_id"`

	CoverImage     *CoverImageProject `gorm:"foreignKey:CoverImgID;references:CoverImageProID;constraint:OnDelete:CASCADE;"`
	CreateByUser   User               `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	PublishByUser  User               `gorm:"foreignKey:PublishBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	ScenarioDetail ScenarioDetail     `gorm:"foreignKey:ScenarioDetailID;references:ScenarioDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- USER SCENARIO --------------------
type UserScenario struct {
	UserScenarioID   string    `gorm:"primaryKey" json:"user_scenario_id"`
	Name             string    `json:"name"`
	ModifyDate       time.Time `json:"modify_date"`
	CreateBy         string    `json:"create_by" gorm:"column:create_by"`
	CoverImgID       *string   `json:"cover_img" gorm:"column:cover_img_id"`
	ScenarioDetailID string    `json:"scenario_detail" gorm:"column:scenario_detail_id"`

	CoverImage     *CoverImageProject `gorm:"foreignKey:CoverImgID;references:CoverImageProID;constraint:OnDelete:CASCADE;"`
	CreateByUser   User               `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	ScenarioDetail ScenarioDetail     `gorm:"foreignKey:ScenarioDetailID;references:ScenarioDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- SCENARIO DETAIL --------------------
type ScenarioDetail struct {
	ScenarioDetailID      string `gorm:"primaryKey" json:"scenario_detail_id"`
	BusScenarioID         string `json:"bus_scenario" gorm:"column:bus_scenario_id"`
	RouteScenarioID       string `json:"route_scenario" gorm:"column:route_scenario_id"`
	ConfigurationDetailID string `json:"configuration_detail" gorm:"column:configuration_detail_id"`

	BusScenario         BusScenario         `gorm:"foreignKey:BusScenarioID;references:BusScenarioID;constraint:OnDelete:CASCADE;"`
	RouteScenario       RouteScenario       `gorm:"foreignKey:RouteScenarioID;references:RouteScenarioID;constraint:OnDelete:CASCADE;"`
	ConfigurationDetail ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;references:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- BUS SCENARIO --------------------
type BusScenario struct {
	BusScenarioID string `gorm:"primaryKey" json:"bus_scenario_id"`

	ScenarioDetails []ScenarioDetail `gorm:"foreignKey:BusScenarioID"`
	ScheduleDatas   []ScheduleData   `gorm:"foreignKey:BusScenarioID"`
	BusInformations []BusInformation `gorm:"foreignKey:BusScenarioID"`
}

// ------------------- SCHEDULE DATA --------------------
type ScheduleData struct {
	ScheduleDataID string `gorm:"primaryKey" json:"schedule_data_id"`
	ScheduleList   string `json:"schedule_list"`
	RoutePathID    string `json:"route_path_id"`
	BusScenarioID  string `json:"bus_scenario_id"`

	RoutePath   RoutePath   `gorm:"foreignKey:RoutePathID;references:RoutePathID;constraint:OnDelete:CASCADE;"`
	BusScenario *BusScenario `gorm:"foreignKey:BusScenarioID;references:BusScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- BUS INFORMATION --------------------
type BusInformation struct {
	BusInformationID string  `gorm:"primaryKey" json:"bus_information_id"`
	Speed            float32 `json:"speed"`
	MaxDis           float32 `json:"max_dis"`
	MaxBus           int     `json:"max_bus"`
	Capacity         int     `json:"capacity"`
	BusScenarioID    string  `json:"bus_scenario_id"`
	RoutePathID      string  `json:"route_path_id"`

	RoutePath   RoutePath   `gorm:"foreignKey:RoutePathID;references:RoutePathID;constraint:OnDelete:CASCADE;"`
	BusScenario *BusScenario `gorm:"foreignKey:BusScenarioID;references:BusScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- ROUTE SCENARIO --------------------
type RouteScenario struct {
	RouteScenarioID string `gorm:"primaryKey" json:"route_scenario_id"`

	ScenarioDetails []ScenarioDetail `gorm:"foreignKey:RouteScenarioID"`
	RoutePaths      []RoutePath      `gorm:"foreignKey:RouteScenarioID"`
}

// ------------------- ROUTE PATH --------------------
type RoutePath struct {
	RoutePathID     string        `gorm:"primaryKey" json:"route_path_id"`
	Name            string        `json:"name"`
	Color           string        `json:"color"`
	RouteScenarioID string        `json:"route_scenario_id"`
	Route 			string 		  `json:"route" gorm:"type:geometry(LineString,4326)"`

	RouteScenario RouteScenario `gorm:"foreignKey:RouteScenarioID;references:RouteScenarioID;constraint:OnDelete:CASCADE;"`

	Orders []Order `gorm:"foreignKey:RoutePathID"`
	ScheduleDatas []ScheduleData `gorm:"foreignKey:RoutePathID"`
	BusInformations []BusInformation `gorm:"foreignKey:RoutePathID"`
}

// ------------------- ORDER --------------------
type Order struct {
	OrderID       string `gorm:"primaryKey" json:"order_id"`
	Order         int    `json:"order"`
	StationPairID string `json:"station_pair_id"`
	RoutePathID   string `json:"route_path_id"`

	RoutePath   RoutePath   `gorm:"foreignKey:RoutePathID;references:RoutePathID;constraint:OnDelete:CASCADE;"`
	StationPair StationPair `gorm:"foreignKey:StationPairID;references:StationPairID;constraint:OnDelete:CASCADE;"`
}

// ------------------- USER CONFIGURATION --------------------
type UserConfiguration struct {
	UserConfigurationID   string    `gorm:"primaryKey" json:"user_configuration_id"`
	Name                  string    `json:"name"`
	ModifyDate            time.Time `json:"modify_date"`
	CreateBy              string    `json:"create_by" gorm:"column:create_by"`
	CoverImgID            *string   `json:"cover_img" gorm:"column:cover_img_id"`
	ConfigurationDetailID string    `json:"configuration_detail" gorm:"column:configuration_detail_id"`

	CoverImage          *CoverImageConf     `gorm:"foreignKey:CoverImgID;references:CoverImageConfID;constraint:OnDelete:CASCADE;"`
	ConfigurationDetail ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;references:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
	CreateByUser        User                `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`

	PublicConfigurations []PublicConfiguration `gorm:"foreignKey:ConfigurationDetailID"`
}

// ------------------- PUBLIC CONFIGURATION --------------------
type PublicConfiguration struct {
	PublicConfigurationID string    `gorm:"primaryKey" json:"public_configuration_id"`
	Name                  string    `json:"name"`
	Description           string    `json:"description"`
	ModifyDate            time.Time `json:"modify_date"`
	PublishDate           time.Time `json:"publish_date"`
	CoverImgID            *string   `json:"cover_img" gorm:"column:cover_img_id"`
	CreateBy              string    `json:"create_by" gorm:"column:create_by"`
	PublishBy             string    `json:"publish_by" gorm:"column:publish_by"`
	ConfigurationDetailID string    `json:"configuration_detail" gorm:"column:configuration_detail_id"`

	CoverImage          *CoverImageConf     `gorm:"foreignKey:CoverImgID;references:CoverImageConfID;constraint:OnDelete:CASCADE;"`
	ConfigurationDetail ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;references:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
	CreateByUser        User                `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
	PublishByUser       User                `gorm:"foreignKey:PublishBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
}

// ------------------- CONFIGURATION DETAIL --------------------
type ConfigurationDetail struct {
	ConfigurationDetailID string `gorm:"primaryKey" json:"configuration_detail_id"`
	NetworkModelID        string `json:"network_model" gorm:"column:network_model_id"`

	NetworkModel         NetworkModel         `gorm:"foreignKey:NetworkModelID;references:NetworkModelID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE;"`
	
	UserConfigurations   []UserConfiguration   `gorm:"foreignKey:ConfigurationDetailID"`
	PublicConfigurations []PublicConfiguration `gorm:"foreignKey:ConfigurationDetailID"`
	ScenarioDetails      []ScenarioDetail      `gorm:"foreignKey:ConfigurationDetailID"`
	AlightingData        []AlightingData       `gorm:"foreignKey:ConfigurationDetailID"`
	InterArrivalData     []InterArrivalData    `gorm:"foreignKey:ConfigurationDetailID"`
}

// ------------------- ALIGHTING DATA --------------------
type AlightingData struct {
	AlightingDataID       string `gorm:"primaryKey" json:"alighting_data_id"`
	ConfigurationDetailID string `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`
	TimePeriod            string `json:"time_period" gorm:"column:time_period"`
	Distribution          string `json:"distribution_name" gorm:"column:distribution_name"`
	ArgumentList          string `json:"argument_list" gorm:"column:argument_list"`
	StationDetailID       string `json:"station_id" gorm:"column:station_detail_id"`

	StationDetail       StationDetail       `gorm:"foreignKey:StationDetailID;references:StationDetailID;constraint:OnDelete:CASCADE;"`
	ConfigurationDetail ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;references:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- INTER ARRIVAL DATA --------------------
type InterArrivalData struct {
	InterArrivalDataID    string `gorm:"primaryKey" json:"interarrival_data_id"`
	ConfigurationDetailID string `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`
	TimePeriod            string `json:"time_period" gorm:"column:time_period"`
	Distribution          string `json:"distribution_name" gorm:"column:distribution_name"`
	ArgumentList          string `json:"argument_list" gorm:"column:argument_list"`
	StationDetailID       string `json:"station_id" gorm:"column:station_detail_id"`

	StationDetail       StationDetail       `gorm:"foreignKey:StationDetailID;references:StationDetailID;constraint:OnDelete:CASCADE;"`
	ConfigurationDetail ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;references:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- NETWORK MODEL --------------------
type NetworkModel struct {
	NetworkModelID string `gorm:"primaryKey" json:"network_model_id"`
	NetworkModelName           string `json:"Network_model" gorm:"column:network_model_name"` // API response only (not stored in DB)

	ConfigurationDetails []ConfigurationDetail `gorm:"foreignKey:NetworkModelID"`
	StationPairs        []StationPair        `gorm:"foreignKey:NetworkModelID"`
}

// ------------------- STATION DETAIL --------------------
type StationDetail struct {
	StationDetailID string   `gorm:"primaryKey" json:"station_detail_id"`
	Name            string   `json:"name" gorm:"column:station_name"`
	Location 		string 	 `json:"location" gorm:"type:geometry(Point,4326);column:location"`
	Lat             float64  `json:"lat" gorm:"column:lat"`
	Lon             float64  `json:"lon" gorm:"column:lon"`
	StationIDOSM    string   `json:"station_id_osm" gorm:"column:station_id_osm"`

// ✅ แก้ไขตรงนี้: ลบ references ออก
    StationPairsAsFst []StationPair    `gorm:"foreignKey:FstStationID"`
    StationPairsAsSnd []StationPair    `gorm:"foreignKey:SndStationID"`
    AlightingData     []AlightingData  `gorm:"foreignKey:StationDetailID"` 
    InterArrivalData  []InterArrivalData `gorm:"foreignKey:StationDetailID"`
}

// ------------------- STATION PAIR --------------------
type StationPair struct {
	StationPairID  string `gorm:"primaryKey" json:"StationPairID"`
	FstStationID   string `json:"FstStation" gorm:"column:fst_station_id"`
	SndStationID   string `json:"SndStation" gorm:"column:snd_station_id"`
	RouteBetweenID string `json:"route_between_id" gorm:"column:route_between_id"`
	NetworkModelID string `json:"network_model_id" gorm:"column:network_model_id"`

	FstStation   StationDetail `gorm:"foreignKey:FstStationID;references:StationDetailID;constraint:OnDelete:CASCADE;" json:"-"`
	SndStation   StationDetail `gorm:"foreignKey:SndStationID;references:StationDetailID;constraint:OnDelete:CASCADE;" json:"-"`
	RouteBetween RouteBetween  `gorm:"foreignKey:RouteBetweenID;references:RouteBetweenID;constraint:OnDelete:CASCADE;" json:"RouteBetween"`
	NetworkModel NetworkModel  `gorm:"foreignKey:NetworkModelID;references:NetworkModelID;constraint:OnDelete:CASCADE;" json:"network_model,omitempty"`

	Orders []Order `gorm:"foreignKey:StationPairID;references:StationPairID"`
}

// ------------------- ROUTE BETWEEN --------------------
type RouteBetween struct {
	RouteBetweenID string  `gorm:"primaryKey;column:route_between_id" json:"RouteBetweenID"`
	TravelTime     float64 `json:"TravelTime" gorm:"column:travel_time"`
	Distance       float64 `json:"Distance" gorm:"column:distance"`

	StationPairs []StationPair `gorm:"foreignKey:RouteBetweenID"`
}
