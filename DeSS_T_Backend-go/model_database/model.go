package model_database

import (
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

    // ✅ เพิ่ม `references:GoogleID` และใส่เครื่องหมาย `;` คั่น
    CreatedPublicScenarios        []PublicScenario      `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    PublishedPublicScenarios      []PublicScenario      `gorm:"foreignKey:PublishBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    CreatedUserScenarios          []UserScenario        `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    CreatedUserConfigurations     []UserConfiguration   `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    CreatedPublicConfigurations   []PublicConfiguration `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    PublishedPublicConfigurations []PublicConfiguration `gorm:"foreignKey:PublishBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
}

// ------------------- COVER IMAGE --------------------
type CoverImageProject struct {
    ID       string `gorm:"primaryKey" json:"cover_image_pro_id"`
    PathFile string `json:"path_file"`

    // ✅ ใส่เครื่องหมาย `;` คั่น
    ImgUserScenarios   []UserScenario   `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;"`
    ImgPublicScenarios []PublicScenario `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;"`
}

type CoverImageConf struct {
    ID       string `gorm:"primaryKey" json:"cover_image_conf_id"`
    PathFile string `json:"path_file"`

    // ✅ ใส่เครื่องหมาย `;` คั่น
    ImgUserConfigurations   []UserConfiguration   `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;"`
    ImgPublicConfigurations []PublicConfiguration `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;"`
}

// ------------------- PUBLIC SCENARIO --------------------
type PublicScenario struct {
    ID               string    `gorm:"primaryKey" json:"public_scenario_id"`
    Name             string    `json:"name"`
    Description      string    `json:"description"`
    ModifyDate       time.Time `json:"modify_date"`
    PublishDate      time.Time `json:"publish_date"`
    CreateBy         string    `json:"create_by" gorm:"column:create_by"`
    PublishBy        string    `json:"publish_by" gorm:"column:publish_by"`
    CoverImgID       *string   `json:"cover_img" gorm:"column:cover_img_id"`
    ScenarioDetailID string    `json:"scenario_detail" gorm:"column:scenario_detail_id"`

    CoverImage     *CoverImageProject `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;" json:"cover_image"`
    CreateByUser   *User              `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    PublishByUser  *User              `gorm:"foreignKey:PublishBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    ScenarioDetail *ScenarioDetail    `gorm:"foreignKey:ScenarioDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- USER SCENARIO --------------------
type UserScenario struct {
    ID               string    `gorm:"primaryKey" json:"user_scenario_id"`
    Name             string    `json:"name"`
    ModifyDate       time.Time `json:"modify_date"`
    CreateBy         string    `json:"create_by" gorm:"column:create_by"`
    CoverImgID       *string   `json:"cover_img" gorm:"column:cover_img_id"`
    ScenarioDetailID string    `json:"scenario_detail_id" gorm:"column:scenario_detail_id"`

    CoverImage     *CoverImageProject `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;"`
    CreateByUser   *User              `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    ScenarioDetail *ScenarioDetail    `gorm:"foreignKey:ScenarioDetailID;constraint:OnDelete:CASCADE;" json:"scenario_detail"`
}

// ------------------- SCENARIO DETAIL --------------------
type ScenarioDetail struct {
    ID                    string `gorm:"primaryKey" json:"scenario_detail_id"`
    BusScenarioID         string `json:"bus_scenario_id" gorm:"column:bus_scenario_id"`
    RouteScenarioID       string `json:"route_scenario_id" gorm:"column:route_scenario_id"`
    ConfigurationDetailID string `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`

    BusScenario         *BusScenario         `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;" json:"bus_scenario"`
    RouteScenario       *RouteScenario       `gorm:"foreignKey:RouteScenarioID;constraint:OnDelete:CASCADE;" json:"route_scenario"`
    ConfigurationDetail *ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;" json:"configuration_detail"`

    UserScenarios   []UserScenario   `gorm:"foreignKey:ScenarioDetailID;constraint:OnDelete:CASCADE;" json:"-"`
    PublicScenarios []PublicScenario `gorm:"foreignKey:ScenarioDetailID;constraint:OnDelete:CASCADE;" json:"-"`
}

// ------------------- BUS SCENARIO --------------------
type BusScenario struct {
    ID string `gorm:"primaryKey" json:"bus_scenario_id"`

    ScenarioDetails []ScenarioDetail `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;" json:"-"`
    ScheduleDatas   []ScheduleData   `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;" json:"schedule_data"` // (เผื่ออนาคต)
    BusInformations []BusInformation `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;" json:"bus_informations"` // 🛠️ แก้ไขตรงนี้: เพิ่ม json tag
}

// ------------------- SCHEDULE DATA --------------------
type ScheduleData struct {
    ID            string `gorm:"primaryKey" json:"schedule_data_id"`
    ScheduleList  string `json:"schedule_list"`
    RoutePathID   string `json:"route_path_id"`
    BusScenarioID string `json:"bus_scenario_id"`

    RoutePath   *RoutePath   `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE;"`
    BusScenario *BusScenario `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- BUS INFORMATION --------------------
type BusInformation struct {
    ID            string  `gorm:"primaryKey" json:"bus_information_id"`
    Speed         float32 `json:"speed"`
    MaxDis        float32 `json:"max_dis"`
    MaxBus        int     `json:"max_bus"`
    Capacity      int     `json:"capacity"`
    BusScenarioID string  `json:"bus_scenario_id"`
    RoutePathID   string  `json:"route_path_id"`

    RoutePath   *RoutePath   `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE;"`
    BusScenario *BusScenario `gorm:"foreignKey:BusScenarioID;constraint:OnDelete:CASCADE;"`
}

// ------------------- ROUTE SCENARIO --------------------
type RouteScenario struct {
    ID string `gorm:"primaryKey" json:"route_scenario_id"`

    ScenarioDetails []ScenarioDetail `gorm:"foreignKey:RouteScenarioID;constraint:OnDelete:CASCADE;" json:"-"`
    RoutePaths      []RoutePath      `gorm:"foreignKey:RouteScenarioID;constraint:OnDelete:CASCADE;" json:"route_paths"` // 🛠️ แก้ไขตรงนี้: เพิ่ม json tag
}

// ------------------- ROUTE PATH --------------------
type RoutePath struct {
    ID              string         `gorm:"primaryKey" json:"route_path_id"`
    Name            string         `json:"name"`
    Color           string         `json:"color"`
    RouteScenarioID string         `json:"route_scenario_id"`
    Route           string         `gorm:"column:route;type:geometry(LineString,4326);<-:false" json:"-"`
    RouteJSON       LineStringData `gorm:"-" json:"route"`

    RouteScenario   *RouteScenario   `gorm:"foreignKey:RouteScenarioID;constraint:OnDelete:CASCADE;" json:"-"`
    Orders          []Order          `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE;" json:"orders"` // 🛠️ แก้ไขตรงนี้: เพิ่ม json tag
    ScheduleDatas   []ScheduleData   `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE;" json:"-"`
    BusInformations []BusInformation `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE;" json:"-"`
}

// ------------------- ORDER --------------------
type Order struct {
    ID            string `gorm:"primaryKey" json:"order_id"`
    Order         int    `json:"order"`
    StationPairID string `json:"station_pair_id"`
    RoutePathID   string `json:"route_path_id"`

    RoutePath   *RoutePath   `gorm:"foreignKey:RoutePathID;constraint:OnDelete:CASCADE;" json:"-"`
    StationPair *StationPair `gorm:"foreignKey:StationPairID;constraint:OnDelete:CASCADE;" json:"station_pair"` // 🛠️ แก้ไขตรงนี้: เพิ่ม json tag
}

// ------------------- USER CONFIGURATION --------------------
type UserConfiguration struct {
    ID                    string    `gorm:"primaryKey" json:"user_configuration_id"`
    Name                  string    `json:"name"`
    ModifyDate            time.Time `json:"modify_date"`
    CreateBy              string    `json:"create_by" gorm:"column:create_by"`
    CoverImgID            *string   `json:"cover_img_id" gorm:"column:cover_img_id"`
    ConfigurationDetailID string    `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`

    CoverImage          *CoverImageConf      `gorm:"foreignKey:CoverImgID;constraint:OnDelete:SET NULL;" json:"cover_image"`
    ConfigurationDetail *ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;" json:"configuration_detail"`
    CreateByUser        *User                `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;" json:"create_by_user"`

    PublicConfigurations []PublicConfiguration `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- PUBLIC CONFIGURATION --------------------
type PublicConfiguration struct {
    ID                    string    `gorm:"primaryKey" json:"public_configuration_id"`
    Name                  string    `json:"name"`
    Description           string    `json:"description"`
    ModifyDate            time.Time `json:"modify_date"`
    PublishDate           time.Time `json:"publish_date"`
    CoverImgID            *string   `json:"cover_img_id" gorm:"column:cover_img_id"`
    CreateBy              string    `json:"create_by" gorm:"column:create_by"`
    PublishBy             string    `json:"publish_by" gorm:"column:publish_by"`
    ConfigurationDetailID string    `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`

    CoverImage          *CoverImageConf      `gorm:"foreignKey:CoverImgID;constraint:OnDelete:CASCADE;"`
    ConfigurationDetail *ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
    CreateByUser        *User                `gorm:"foreignKey:CreateBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
    PublishByUser       *User                `gorm:"foreignKey:PublishBy;references:GoogleID;constraint:OnDelete:CASCADE;"`
}

// ------------------- CONFIGURATION DETAIL --------------------
type ConfigurationDetail struct {
    ID             string `gorm:"primaryKey" json:"configuration_detail_id"`
    NetworkModelID string `json:"network_model_id" gorm:"column:network_model_id"`

    NetworkModel *NetworkModel `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE;" json:"network_model"`

    UserConfigurations   []UserConfiguration   `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
    PublicConfigurations []PublicConfiguration `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
    ScenarioDetails      []ScenarioDetail      `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;"`
    AlightingData        []AlightingData       `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;" json:"alighting_datas"`
    InterArrivalData     []InterArrivalData    `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;" json:"interarrival_datas"`
}

// ------------------- ALIGHTING DATA --------------------
type AlightingData struct {
    ID                    string `gorm:"primaryKey" json:"alighting_data_id"`
    ConfigurationDetailID string `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`
    TimePeriod            string `json:"time_period" gorm:"column:time_period"`
    Distribution          string `json:"distribution" gorm:"column:distribution_name"`
    ArgumentList          string `json:"argument_list" gorm:"column:argument_list"`
    StationDetailID       string `json:"station_id" gorm:"column:station_detail_id"`

    StationDetail       *StationDetail       `gorm:"foreignKey:StationDetailID;constraint:OnDelete:CASCADE;"`
    ConfigurationDetail *ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;" json:"configuration_detail"`
}

// ------------------- INTER ARRIVAL DATA --------------------
type InterArrivalData struct {
    ID                    string `gorm:"primaryKey" json:"inter_arrival_data_id"`
    ConfigurationDetailID string `json:"configuration_detail_id" gorm:"column:configuration_detail_id"`
    TimePeriod            string `json:"time_period" gorm:"column:time_period"`
    Distribution          string `json:"distribution" gorm:"column:distribution_name"`
    ArgumentList          string `json:"argument_list" gorm:"column:argument_list"`
    StationDetailID       string `json:"station_id" gorm:"column:station_detail_id"`

    StationDetail       *StationDetail       `gorm:"foreignKey:StationDetailID;constraint:OnDelete:CASCADE;"`
    ConfigurationDetail *ConfigurationDetail `gorm:"foreignKey:ConfigurationDetailID;constraint:OnDelete:CASCADE;" json:"configuration_detail"`
}

// ------------------- NETWORK MODEL --------------------
type NetworkModel struct {
    ID               string `gorm:"primaryKey" json:"network_model_id"`
    NetworkModelName string `json:"Network_model" gorm:"column:network_model_name"` 

    ConfigurationDetails []ConfigurationDetail `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;" json:"configuration_detail"`
    StationPairs         []StationPair         `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;" json:"StationPair"`
    StationDetails       []StationDetail       `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;" json:"station_detail"`
}

// ------------------- STATION DETAIL --------------------
type StationDetail struct {
    ID             string       `gorm:"primaryKey" json:"station_detail_id"`
    Name           string       `json:"name" gorm:"column:station_name"`
    NetworkModelID string       `json:"network_model_id" gorm:"column:network_model_id"`
    LocationDB     string       `gorm:"column:location;type:geometry(Point,4326);<-:false" json:"-"`
    LocationJSON   LocationData `gorm:"-" json:"location"`

    Lat          float64 `json:"lat" gorm:"column:lat"`
    Lon          float64 `json:"lon" gorm:"column:lon"`
    StationIDOSM string  `json:"station_id_osm" gorm:"column:station_id_osm"`

    NetworkModel      *NetworkModel      `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;" json:"network_model"`
    StationPairsAsFst []StationPair      `gorm:"foreignKey:FstStationID;constraint:OnDelete:CASCADE;" json:"StationPairAsFst"`
    StationPairsAsSnd []StationPair      `gorm:"foreignKey:SndStationID;constraint:OnDelete:CASCADE;" json:"StationPairAsSnd"`
    AlightingData     []AlightingData    `gorm:"foreignKey:StationDetailID;constraint:OnDelete:CASCADE;"`
    InterArrivalData  []InterArrivalData `gorm:"foreignKey:StationDetailID;constraint:OnDelete:CASCADE;"`
}

// ------------------- STATION PAIR --------------------
type StationPair struct {
    ID             string `gorm:"primaryKey" json:"StationPairID"`
    FstStationID   string `json:"FstStation" gorm:"column:fst_station_id"`
    SndStationID   string `json:"SndStation" gorm:"column:snd_station_id"`
    RouteBetweenID string `json:"route_between_id" gorm:"column:route_between_id"`
    NetworkModelID string `json:"network_model_id" gorm:"column:network_model_id"`

    // ✅ ใช้ Pointer เพื่อป้องกัน Circular Dependency
    FstStation   *StationDetail `gorm:"foreignKey:FstStationID;constraint:OnDelete:CASCADE;" json:"-"`
    SndStation   *StationDetail `gorm:"foreignKey:SndStationID;constraint:OnDelete:CASCADE;" json:"-"`
    RouteBetween *RouteBetween  `gorm:"foreignKey:RouteBetweenID;constraint:OnDelete:CASCADE;" json:"RouteBetween"`
    NetworkModel *NetworkModel  `gorm:"foreignKey:NetworkModelID;constraint:OnDelete:CASCADE;" json:"network_model"`

    Orders []Order `gorm:"foreignKey:StationPairID;constraint:OnDelete:CASCADE;"`
}

// ------------------- ROUTE BETWEEN --------------------
type RouteBetween struct {
    ID         string  `gorm:"primaryKey;" json:"RouteBetweenID"`
    TravelTime float64 `json:"TravelTime" gorm:"column:travel_time"`
    Distance   float64 `json:"Distance" gorm:"column:distance"`

    StationPairs []StationPair `gorm:"foreignKey:RouteBetweenID;constraint:OnDelete:CASCADE;" json:"-"`
}

// โครงสร้างรับ GeoJSON จาก Frontend
type LocationData struct {
    Type        string    `json:"type"`
    Coordinates []float64 `json:"coordinates"`
}

// โครงสร้างรับ GeoJSON LineString จาก Frontend
type LineStringData struct {
    Type        string      `json:"type"`
    Coordinates [][]float64 `json:"coordinates"` // Array ของพิกัด [lon, lat]
}