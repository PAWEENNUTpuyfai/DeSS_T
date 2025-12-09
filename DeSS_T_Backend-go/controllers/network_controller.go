package controllers

import (
    "log"
    "os"

    "github.com/gofiber/fiber/v2"
    "DeSS_T_Backend-go/models"
    "DeSS_T_Backend-go/services"
)

func BuildNetwork(c *fiber.Ctx) error {

    var request struct {
        Stations []models.Station_Detail `json:"stations"`
        Name     string                  `json:"network_name"`
    }

    if err := c.BodyParser(&request); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
    }

    if len(request.Stations) == 0 {
        return c.Status(400).JSON(fiber.Map{"error": "stations cannot be empty"})
    }

    networkName := request.Name
    if networkName == "" {
        networkName = "guest_network"
    }

    orsKey := os.Getenv("ORS_API_KEY")
    if orsKey == "" {
        return c.Status(500).JSON(fiber.Map{"error": "ORS_API_KEY not found in env"})
    }

    result, err := services.BuildNetworkModel(request.Stations, networkName, orsKey)
    if err != nil {
        log.Println("Build error:", err)
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(result)
}
