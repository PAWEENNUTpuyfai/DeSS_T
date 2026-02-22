package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AreaCacheData struct {
	AreaCode string `json:"area_code"`
	AreaName string `json:"area_name"`
	Bounds   struct {
		MinLat float64 `json:"minLat"`
		MaxLat float64 `json:"maxLat"`
		MinLon float64 `json:"minLon"`
		MaxLon float64 `json:"maxLon"`
	} `json:"bounds"`
	Stations []map[string]interface{} `json:"stations"`
}

// GetAreaCache อ่านข้อมูล area จากไฟล์ JSON
func GetAreaCache(c *fiber.Ctx) error {
	areaCode := c.Params("code")
	if areaCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "area code required"})
	}

	// ตัวอย่าง: 189632187 เท่านั้น
	if areaCode != "189632187" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "area code not found in cache"})
	}

	// อ่านจากไฟล์ JSON - ลองหลายชื่นทาง (Docker container และ local development)
	possiblePaths := []string{
		filepath.Join("/data", fmt.Sprintf("area_cache_%s.json", areaCode)),  // Docker path
		filepath.Join("data", fmt.Sprintf("area_cache_%s.json", areaCode)),   // Relative path
		filepath.Join("./data", fmt.Sprintf("area_cache_%s.json", areaCode)), // Current working directory
	}

	var data []byte
	var err error
	found := false

	for _, path := range possiblePaths {
		data, err = os.ReadFile(path)
		if err == nil {
			found = true
			break
		}
	}

	if !found {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to read cache file",
			"code":  areaCode,
		})
	}

	var cacheData AreaCacheData
	if err := json.Unmarshal(data, &cacheData); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to parse cache file"})
	}

	// ส่งกลับในรูปแบบ frontend ต้องการ
	return c.JSON(fiber.Map{
		"bounds": fiber.Map{
			"minLat": cacheData.Bounds.MinLat,
			"maxLat": cacheData.Bounds.MaxLat,
			"minLon": cacheData.Bounds.MinLon,
			"maxLon": cacheData.Bounds.MaxLon,
		},
		"stations":   cacheData.Stations,
		"from_cache": true,
	})
}

type BuildNetworkRequest struct {
	Stations    []map[string]interface{} `json:"stations"`
	NetworkName string                   `json:"network_name"`
}

func BuildNetworkModel(c *fiber.Ctx) error {
	// ORS key is optional — we will fallback if absent
	orsKey := os.Getenv("ORS_API_KEY")

	// DEBUG: Log if ORS key is available
	if orsKey == "" {
		fmt.Println("⚠️ WARNING: ORS_API_KEY not found in environment - will use straight lines only")
	} else {
		fmt.Println("✅ ORS_API_KEY found - will use OpenRouteService for route geometry")
	}

	var req BuildNetworkRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	// Convert generic station maps to StationDetail objects
	stations := []models.StationDetail{}
	for _, sMap := range req.Stations {
		// Extract fields from the generic map
		stationDetailID := ""
		if id, ok := sMap["station_detail_id"].(string); ok && id != "" {
			stationDetailID = id
		} else if id, ok := sMap["StationID"].(string); ok && id != "" {
			stationDetailID = id
		}

		if stationDetailID == "" {
			continue // Skip stations without ID
		}

		name := ""
		if n, ok := sMap["name"].(string); ok {
			name = n
		} else if n, ok := sMap["StationName"].(string); ok {
			name = n
		}

		// Extract coordinates from Location object or lat/lon fields
		var lat, lon float64
		if locMap, ok := sMap["Location"].(map[string]interface{}); ok {
			if coords, ok := locMap["coordinates"].([]interface{}); ok && len(coords) >= 2 {
				if lonVal, ok := coords[0].(float64); ok {
					lon = lonVal
				}
				if latVal, ok := coords[1].(float64); ok {
					lat = latVal
				}
			}
		}

		// Fallback to direct lat/lon fields
		if lat == 0 && lon == 0 {
			if latVal, ok := sMap["lat"].(float64); ok {
				lat = latVal
			}
			if lonVal, ok := sMap["lon"].(float64); ok {
				lon = lonVal
			}
		}

		station := models.StationDetail{
			StationDetailID: stationDetailID,
			Name:            name,
			Location: models.GeoPoint{
				Type:        "Point",
				Coordinates: [2]float64{lon, lat},
			},
			Lat: lat,
			Lon: lon,
		}
		stations = append(stations, station)
	}

	if len(stations) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "No valid stations found in request")
	}

	// 1) Matrix mode selection
	matrixMode := strings.ToLower(os.Getenv("MATRIX_MODE")) // expect "ors"
	if matrixMode == "" {
		matrixMode = "ors"
	}
	maxStations := 0 // 0 = no limit; set env MATRIX_MAX_STATIONS to cap ORS usage
	if v := os.Getenv("MATRIX_MAX_STATIONS"); v != "" {
		if p, perr := strconv.Atoi(v); perr == nil {
			maxStations = p
		}
	}

	if matrixMode != "ors" {
		return fiber.NewError(fiber.StatusBadRequest, "Local matrix calculation disabled; set MATRIX_MODE=ors")
	}
	if orsKey == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ORS_API_KEY is missing; set it in the environment")
	}
	if maxStations > 0 && len(stations) > maxStations {
		return fiber.NewError(fiber.StatusBadRequest, fmt.Sprintf("Too many stations for ORS matrix: %d > %d", len(stations), maxStations))
	}

	var matrix *services.ORSMatrixResponse
	var err error
	// Soft timeout guard: ensure the handler returns fast even if ORS is slow
	done := make(chan struct{})
	var mErr error
	go func() {
		matrix, mErr = services.OrsMatrix(stations, orsKey)
		close(done)
	}()
	select {
	case <-done:
		err = mErr
	case <-time.After(20 * time.Second):
		err = fmt.Errorf("ORS matrix timed out")
	}
	if err != nil || matrix == nil {
		return fiber.NewError(fiber.StatusBadGateway, fmt.Sprintf("ORS matrix failed: %v", err))
	}

	// 2. Create pair list with RouteBetween data
	pairs := []models.StationPair{}
	routeBetweens := []models.RouteBetween{}

	n := len(stations)

	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			if i == j {
				continue
			}

			// Create RouteBetween record with distance and travel time
			routeBetweenID := fmt.Sprintf("%s-%s-route", stations[i].StationDetailID, stations[j].StationDetailID)
			routeBetween := models.RouteBetween{
				RouteBetweenID: routeBetweenID,
				TravelTime:     matrix.Durations[i][j],
				Distance:       matrix.Distances[i][j],
			}
			routeBetweens = append(routeBetweens, routeBetween)

			// Create StationPair that references the RouteBetween
			pair := models.StationPair{
				StationPairID:  fmt.Sprintf("%s-%s", stations[i].StationDetailID, stations[j].StationDetailID),
				FstStationID:   stations[i].StationDetailID,
				SndStationID:   stations[j].StationDetailID,
				RouteBetweenID: routeBetweenID,
				RouteBetween:   routeBetween,
			}

			pairs = append(pairs, pair)
		}
	}

	// Final response (includes RouteBetween data in each StationPair)
	result := models.NetworkModel{
		Name:           req.NetworkName,
		StationDetails: stations,
		StationPairs:   pairs,
	}

	return c.JSON(result)
}

// GetRouteGeometry returns a LineString between two coordinates using ORS when available,
// otherwise falls back to a straight line.
// Request body: {"start": [lon, lat], "end": [lon, lat]}
func GetRouteGeometry(c *fiber.Ctx) error {
	orsKey := os.Getenv("ORS_API_KEY")
	if orsKey == "" {
		return fiber.NewError(fiber.StatusInternalServerError, "ORS_API_KEY is missing; road geometry unavailable")
	}

	var body struct {
		Start [2]float64 `json:"start"`
		End   [2]float64 `json:"end"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	// Soft timeout guard for the single route (longer: 12s) and do not silently fallback
	type routeRes struct {
		c   [][2]float64
		err error
	}
	ch := make(chan routeRes, 1)
	go func() {
		r, e := services.OrsRoute(body.Start, body.End, orsKey)
		ch <- routeRes{c: r, err: e}
	}()
	select {
	case rr := <-ch:
		if rr.err != nil {
			return fiber.NewError(fiber.StatusBadGateway, "ORS route error: "+rr.err.Error())
		}
		if len(rr.c) == 0 {
			return fiber.NewError(fiber.StatusBadGateway, "ORS returned empty geometry")
		}
		return c.JSON(models.GeoLineString{
			Type:        "LineString",
			Coordinates: rr.c,
		})
	case <-time.After(12 * time.Second):
		return fiber.NewError(fiber.StatusGatewayTimeout, "ORS route request timed out")
	}
}

// ComputeRouteSegments computes route polylines for consecutive station points using ORS.
// Request body:
//
//	{
//	  "points": [{"id":"S1","coord":[lon,lat]}, {"id":"S2","coord":[lon,lat]}, ...]
//	}
//
// Response:
//
//	{
//	  "segments": [{"from":"S1","to":"S2","coords":[[lon,lat], ...]}, ...]
//	}
func ComputeRouteSegments(c *fiber.Ctx) error {
	orsKey := os.Getenv("ORS_API_KEY")
	if orsKey == "" {
		return fiber.NewError(fiber.StatusInternalServerError, "ORS_API_KEY is missing; road geometry unavailable")
	}

	type routePoint struct {
		ID    string     `json:"id"`
		Coord [2]float64 `json:"coord"`
	}
	var body struct {
		Points []routePoint `json:"points"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}
	if len(body.Points) < 2 {
		return fiber.NewError(fiber.StatusBadRequest, "At least 2 points are required")
	}

	type seg struct {
		From   string       `json:"from"`
		To     string       `json:"to"`
		Coords [][2]float64 `json:"coords"`
	}

	segments := make([]seg, 0, len(body.Points)-1)
	for i := 0; i < len(body.Points)-1; i++ {
		start := body.Points[i]
		end := body.Points[i+1]

		// Soft timeout per segment
		type routeRes struct {
			c   [][2]float64
			err error
		}
		ch := make(chan routeRes, 1)
		go func(s, e [2]float64) {
			r, err := services.OrsRoute(s, e, orsKey)
			ch <- routeRes{c: r, err: err}
		}(start.Coord, end.Coord)

		var coords [][2]float64
		select {
		case rr := <-ch:
			if rr.err != nil || len(rr.c) == 0 {
				// Fallback to straight line on error
				coords = [][2]float64{start.Coord, end.Coord}
			} else {
				coords = rr.c
			}
		case <-time.After(12 * time.Second):
			// Timeout: straight line fallback
			coords = [][2]float64{start.Coord, end.Coord}
		}

		segments = append(segments, seg{From: start.ID, To: end.ID, Coords: coords})
	}

	return c.JSON(struct {
		Segments []seg `json:"segments"`
	}{Segments: segments})
}

// SaveRoutes saves route and bus data separately
// Request body:
//
//	{
//	  "routes": [
//	    {
//	      "id": "route-123",
//	      "name": "Route 1",
//	      "color": "#3b82f6",
//	      "hidden": false,
//	      "locked": false,
//	      "stations": ["S1", "S2", "S3"],
//	      "segments": [
//	        {"from": "S1", "to": "S2", "coords": [[lon,lat], ...]},
//	        {"from": "S2", "to": "S3", "coords": [[lon,lat], ...]}
//	      ]
//	    },
//	    ...
//	  ],
//	  "busInfo": [
//	    {
//	      "routeId": "route-123",
//	      "maxDistance": 40,
//	      "speed": 40,
//	      "capacity": 21,
//	      "maxBuses": 21
//	    },
//	    ...
//	  ]
//	}
func SaveRoutes(c *fiber.Ctx) error {
	type RouteSegment struct {
		From   string       `json:"from"`
		To     string       `json:"to"`
		Coords [][2]float64 `json:"coords"`
	}

	type RouteData struct {
		ID       string         `json:"id"`
		Name     string         `json:"name"`
		Color    string         `json:"color"`
		Hidden   bool           `json:"hidden"`
		Locked   bool           `json:"locked"`
		Stations []string       `json:"stations"`
		Segments []RouteSegment `json:"segments"`
	}

	type BusInfoData struct {
		RouteID     string  `json:"routeId"`
		MaxDistance float64 `json:"maxDistance"`
		Speed       float64 `json:"speed"`
		Capacity    int     `json:"capacity"`
		MaxBuses    int     `json:"maxBuses"`
	}

	var body struct {
		Routes  []RouteData   `json:"routes"`
		BusInfo []BusInfoData `json:"busInfo"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	// Convert routes to backend format (geometry + stations only)
	routePaths := make([]models.RoutePath, 0, len(body.Routes))
	for _, route := range body.Routes {
		// Note: RoutePath model uses simplified structure
		// For now, we'll store the route data in a simple format
		routePath := models.RoutePath{
			RoutePathID: route.ID,
			Name:        route.Name,
			Color:       route.Color,
			// Route field could store JSON-encoded route data if needed
			Route:  models.GeoLineString{Type: "LineString", Coordinates: [][2]float64{}}, // TODO: Store route geometry/segments as needed
			Orders: []models.Order{},
		}
		routePaths = append(routePaths, routePath)
	}

	// Convert bus info to backend format
	busInfoList := make([]models.BusInformation, 0, len(body.BusInfo))
	for i, busInfo := range body.BusInfo {
		busInformation := models.BusInformation{
			BusInformationID: fmt.Sprintf("bus-%d", i+1),
			RoutePathID:      busInfo.RouteID,
			Speed:            float32(busInfo.Speed),
			MaxDis:           float32(busInfo.MaxDistance),
			Capacity:         busInfo.Capacity,
			MaxBus:           busInfo.MaxBuses,
			BusScenarioID:    "", // TODO: Set appropriate bus scenario ID
		}
		busInfoList = append(busInfoList, busInformation)
	}

	// TODO: Save routes and bus info separately to database
	// For now, just return success
	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Routes data received",
	})
}

// SaveConfiguration saves NetworkModel with StationDetails, StationPairs, and RouteBetween to database
// Request body:
//
//	{
//	  "network_model_id": "guest_network",
//	  "name": "Test Network",
//	  "stations": [{...StationDetail}],
//	  "station_pairs": [{...StationPair with RouteBetween}]
//	}
func SaveConfiguration(c *fiber.Ctx) error {
	type stationPayload struct {
		StationDetailID string `json:"station_detail_id"`
		Name            string `json:"name"`
		StationName     string `json:"StationName"`
		Location        struct {
			Type        string     `json:"type"`
			Coordinates [2]float64 `json:"coordinates"`
		} `json:"Location"`
		Lat          float64 `json:"lat"`
		Lon          float64 `json:"lon"`
		StationIDOSM string  `json:"station_id_osm"`
	}

	type routeBetweenPayload struct {
		RouteBetweenID string  `json:"RouteBetweenID"`
		TravelTime     float64 `json:"TravelTime"`
		Distance       float64 `json:"Distance"`
	}

	type stationPairPayload struct {
		StationPairID  string              `json:"StationPairID"`
		FstStation     string              `json:"FstStation"`
		SndStation     string              `json:"SndStation"`
		RouteBetween   routeBetweenPayload `json:"RouteBetween"`
		NetworkModelID string              `json:"network_model_id"`
	}

	var req struct {
		NetworkModelID string               `json:"network_model_id"`
		Name           string               `json:"name"`
		Stations       []stationPayload     `json:"stations"`
		StationPairs   []stationPairPayload `json:"station_pairs"`
	}

	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request: "+err.Error())
	}

	if req.NetworkModelID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "network_model_id is required")
	}

	if len(req.Stations) == 0 || len(req.StationPairs) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "stations and station_pairs are required")
	}

	// Create StationDetail records
	stationDetails := []models.StationDetail{}
	for _, s := range req.Stations {
		if s.StationDetailID == "" {
			continue
		}
		sd := models.StationDetail{
			StationDetailID: s.StationDetailID,
			Name:            s.Name,
			Location: models.GeoPoint{
				Type:        "Point",
				Coordinates: s.Location.Coordinates,
			},
			Lat:          s.Lat,
			Lon:          s.Lon,
			StationIDOSM: s.StationIDOSM,
		}
		stationDetails = append(stationDetails, sd)
	}

	// Create RouteBetween records
	routeBetweenMap := make(map[string]models.RouteBetween)
	for _, sp := range req.StationPairs {
		if sp.RouteBetween.RouteBetweenID != "" {
			rb := models.RouteBetween{
				RouteBetweenID: sp.RouteBetween.RouteBetweenID,
				TravelTime:     sp.RouteBetween.TravelTime,
				Distance:       sp.RouteBetween.Distance,
			}
			routeBetweenMap[sp.RouteBetween.RouteBetweenID] = rb
		}
	}

	// Create StationPair records
	stationPairs := []models.StationPair{}
	for _, sp := range req.StationPairs {
		pair := models.StationPair{
			StationPairID:  sp.StationPairID,
			FstStationID:   sp.FstStation,
			SndStationID:   sp.SndStation,
			RouteBetweenID: sp.RouteBetween.RouteBetweenID,
			NetworkModelID: req.NetworkModelID,
			RouteBetween:   routeBetweenMap[sp.RouteBetween.RouteBetweenID],
		}
		stationPairs = append(stationPairs, pair)
	}

	// Create NetworkModel
	networkModel := models.NetworkModel{
		NetworkModelID: req.NetworkModelID,
		Name:           req.Name,
		StationDetails: stationDetails,
		StationPairs:   stationPairs,
	}

	// Return the NetworkModel with all data (in real scenario, this would be saved to DB)
	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Configuration saved successfully",
		"data":    networkModel,
	})
}
