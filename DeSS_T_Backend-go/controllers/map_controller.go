package controllers

import (
	"DeSS_T_Backend-go/services"

	"github.com/gofiber/fiber/v2"
)

type AreaBoundsRequest struct {
	AreaCode string `json:"area_code"`
}

type BusStopsRequest struct {
	MinLat float64 `json:"min_lat"`
	MinLon float64 `json:"min_lon"`
	MaxLat float64 `json:"max_lat"`
	MaxLon float64 `json:"max_lon"`
}

type BusStopsAreaRequest struct {
	AreaCode string `json:"area_code"`
}

// GetAreaBounds fetches area bounds from Overpass API
func GetAreaBounds(c *fiber.Ctx) error {
	var req AreaBoundsRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	if req.AreaCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "area_code is required")
	}

	bounds, err := services.FetchAreaBounds(req.AreaCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return c.JSON(bounds)
}

// GetBusStops fetches bus stops within bounds from Overpass API
func GetBusStops(c *fiber.Ctx) error {
	var req BusStopsRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	stops, err := services.FetchBusStops(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return c.JSON(stops)
}

// GetBusStopsInArea fetches bus stops in a specific area from Overpass API
func GetBusStopsInArea(c *fiber.Ctx) error {
	var req BusStopsAreaRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	if req.AreaCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "area_code is required")
	}

	stops, err := services.FetchBusStopsInArea(req.AreaCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return c.JSON(stops)
}

// GetAreaGeometry fetches area polygon geometry from Overpass API
func GetAreaGeometry(c *fiber.Ctx) error {
	var req AreaBoundsRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid JSON: "+err.Error())
	}

	if req.AreaCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "area_code is required")
	}

	geometry, err := services.FetchAreaGeometry(req.AreaCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return c.JSON(geometry)
}
