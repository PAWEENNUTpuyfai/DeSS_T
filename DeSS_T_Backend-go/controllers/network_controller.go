package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
)

type BuildNetworkRequest struct {
	Stations    []models.Station_Detail `json:"stations"`
	NetworkName string                  `json:"network_name"`
}

func BuildNetworkModel(c *fiber.Ctx) error {

	// ⬇ ดึง ORS KEY จาก backend (.env)
	orsKey := os.Getenv("ORS_API_KEY")
	if orsKey == "" {
		return fiber.NewError(fiber.StatusInternalServerError, "ORS_API_KEY is missing in backend .env")
	}

	var req BuildNetworkRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	if len(req.Stations) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Stations cannot be empty")
	}

	// 1. Build ORS Matrix; if it fails (quota/limits), fallback to local matrix
	matrix, err := services.OrsMatrix(req.Stations, orsKey)
	if err != nil {
		// Fallback with straight-line distance and constant speed (30 km/h)
		// 30 km/h = 8.333... m/s
		matrix, _ = services.LocalMatrix(req.Stations, 30_000.0/3600.0)
	}

	// 2. Create pair list
	pairs := []models.Station_Pair{}

	for i := 0; i < len(req.Stations); i++ {
		for j := 0; j < len(req.Stations); j++ {
			if i == j {
				continue
			}

			start := req.Stations[i].Location.Coordinates
			end := req.Stations[j].Location.Coordinates

			// Route geometry; if ORS fails, use straight line
			coords, err := services.OrsRoute(start, end, orsKey)
			if err != nil {
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
