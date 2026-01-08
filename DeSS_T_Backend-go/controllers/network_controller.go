package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type BuildNetworkRequest struct {
	Stations    []models.StationDetail `json:"stations"`
	NetworkName string                 `json:"network_name"`
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

	if len(req.Stations) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Stations cannot be empty")
	}

	// 1) Matrix mode selection
	// Defaults to local for speed and reliability. Enable ORS via env when desired.
	matrixMode := strings.ToLower(os.Getenv("MATRIX_MODE")) // "local" | "ors"
	if matrixMode == "" {
		matrixMode = "local"
	}
	maxStations := 30
	if v := os.Getenv("MATRIX_MAX_STATIONS"); v != "" {
		if p, perr := strconv.Atoi(v); perr == nil && p > 0 {
			maxStations = p
		}
	}
	fallbackSpeedKmh := 30.0
	if v := os.Getenv("FALLBACK_SPEED_KMH"); v != "" {
		if f, ferr := strconv.ParseFloat(v, 64); ferr == nil && f > 0 {
			fallbackSpeedKmh = f
		}
	}
	metersPerSecond := fallbackSpeedKmh * 1000.0 / 3600.0

	var matrix *services.ORSMatrixResponse
	var err error
	useORSMatrix := (matrixMode == "ors" && orsKey != "" && len(req.Stations) <= maxStations)
	if useORSMatrix {
		// Soft timeout guard: ensure the handler returns fast even if ORS is slow
		done := make(chan struct{})
		var mErr error
		go func() {
			matrix, mErr = services.OrsMatrix(req.Stations, orsKey)
			close(done)
		}()
		select {
		case <-done:
			err = mErr
		case <-time.After(20 * time.Second):
			err = fmt.Errorf("ORS matrix timed out")
		}
	}
	if err != nil || matrix == nil {
		matrix, _ = services.LocalMatrix(req.Stations, metersPerSecond)
	}

	// 2. Create pair list
	pairs := []models.StationPair{}

	n := len(req.Stations)

	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			if i == j {
				continue
			}

			// RouteBetween stores distance and travel time only
			// Route geometry will be computed per-scenario in RoutePath
			pair := models.StationPair{
				StationPairID: fmt.Sprintf("%s-%s", req.Stations[i].StationDetailID, req.Stations[j].StationDetailID),
				FstStationID:  req.Stations[i].StationDetailID,
				SndStationID:  req.Stations[j].StationDetailID,
				RouteBetween: models.RouteBetween{
					RouteBetweenID: fmt.Sprintf("%s-%s-route", req.Stations[i].StationDetailID, req.Stations[j].StationDetailID),
					TravelTime:     matrix.Durations[i][j],
					Distance:       matrix.Distances[i][j],
				},
			}

			pairs = append(pairs, pair)
		}
	}

	// Final response
	result := models.NetworkModel{
		Name:           req.NetworkName,
		StationDetails: req.Stations,
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
	routePaths := make([]models.Route_Path, 0, len(body.Routes))
	for _, route := range body.Routes {
		segments := make([]models.RouteSegmentData, 0, len(route.Segments))
		for _, seg := range route.Segments {
			segments = append(segments, models.RouteSegmentData{
				From:   seg.From,
				To:     seg.To,
				Coords: seg.Coords,
			})
		}

		routePath := models.Route_Path{
			RoutePathID:    route.ID,
			RoutePathName:  route.Name,
			RoutePathColor: route.Color,
			Hidden:         route.Hidden,
			Locked:         route.Locked,
			RouteSegments:  segments,
		}
		routePaths = append(routePaths, routePath)
	}

	// Convert bus info to backend format
	busInfoList := make([]models.Bus_Information, 0, len(body.BusInfo))
	for i, busInfo := range body.BusInfo {
		busInformation := models.Bus_Information{
			BusInformationID: fmt.Sprintf("bus-%d", i+1),
			RoutePathID:      busInfo.RouteID,
			BusSpeed:         busInfo.Speed,
			MaxDistance:      busInfo.MaxDistance,
			BusCapacity:      busInfo.Capacity,
			MaxBuses:         busInfo.MaxBuses,
		}
		busInfoList = append(busInfoList, busInformation)
	}

	// TODO: Save routes and bus info separately to database
	// For now, just return success
	return c.JSON(fiber.Map{
		"message": "Routes and bus info saved successfully",
		"routes":  len(routePaths),
		"busInfo": len(busInfoList),
	})
}
