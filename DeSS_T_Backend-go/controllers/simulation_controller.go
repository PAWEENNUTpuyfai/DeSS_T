package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"

	"github.com/gofiber/fiber/v2"
)

func TransformSimulationHandler(c *fiber.Ctx) error {

	var req models.ProjectSimulationRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	result := services.TransformSimulationRequest(
		req.ScenarioDetail,
		req.ConfigurationDetail,
        req.TimePeriods,
		req.TimeSlot,
	)

	return c.JSON(result)
}

func RunSimulationHandler(c *fiber.Ctx) error {
	var req models.ProjectSimulationRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Transform the request first
	transformedData := services.TransformSimulationRequest(
		req.ScenarioDetail,
		req.ConfigurationDetail,
		req.TimePeriods,
		req.TimeSlot,
	)

	// Call Python simulation service with transformed data
	result, err := services.CallPythonSimulation(transformedData)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to run simulation: " + err.Error(),
		})
	}

	return c.JSON(result)
}
