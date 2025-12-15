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
	Stations    []models.Station_Detail `json:"stations"`
	NetworkName string                  `json:"network_name"`
}

func BuildNetworkModel(c *fiber.Ctx) error {
	// ORS key is optional — we will fallback if absent
	orsKey := os.Getenv("ORS_API_KEY")

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
	pairs := []models.Station_Pair{}

	n := len(req.Stations)
	// Decide whether to call ORS for per-pair route geometry.
	// Default: straight line for speed/reliability.
	routeMode := strings.ToLower(os.Getenv("ROUTE_GEOMETRY_MODE")) // "straight" | "ors"
	if routeMode == "" {
		routeMode = "straight"
	}
	maxPairs := 500 // directed pairs cap when using ORS
	if v := os.Getenv("ROUTE_GEOMETRY_MAX_PAIRS"); v != "" {
		if p, perr := strconv.Atoi(v); perr == nil && p > 0 {
			maxPairs = p
		}
	}
	useORSRoute := (routeMode == "ors") && (orsKey != "") && (n*(n-1) <= maxPairs)

	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			if i == j {
				continue
			}

			start := req.Stations[i].Location.Coordinates
			end := req.Stations[j].Location.Coordinates

			// Route geometry; optionally call ORS, else use straight line
			var coords [][2]float64
			if useORSRoute {
				// Soft timeout guard for each route fetch
				type routeRes struct {
					c   [][2]float64
					err error
				}
				ch := make(chan routeRes, 1)
				go func() {
					r, e := services.OrsRoute(start, end, orsKey)
					ch <- routeRes{c: r, err: e}
				}()
				select {
				case rr := <-ch:
					if rr.err != nil || len(rr.c) == 0 {
						coords = [][2]float64{start, end}
					} else {
						coords = rr.c
					}
				case <-time.After(2 * time.Second):
					coords = [][2]float64{start, end}
				}
			} else {
				coords = [][2]float64{start, end}
			}

			pair := models.Station_Pair{
				FstStation: req.Stations[i].StationID,
				SndStation: req.Stations[j].StationID,
				RouteBetween: models.Route_Between{
					RouteBetweenID: fmt.Sprintf("%s-%s",
						req.Stations[i].StationID,
						req.Stations[j].StationID,
					),
					TravelTime: matrix.Durations[i][j],
					Distance:   matrix.Distances[i][j],
					Route: models.GeoLineString{
						Type:        "LineString",
						Coordinates: coords,
					},
				},
			}

			pairs = append(pairs, pair)
		}
	}

	// Final response
	result := models.Network_Model{
		NetworkModel:  req.NetworkName,
		StationDetail: req.Stations,
		StationPair:   pairs,
	}

	return c.JSON(result)
}
