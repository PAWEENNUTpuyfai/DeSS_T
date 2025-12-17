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
		req.Scenario,
		req.Configuration,
        
	)

	return c.JSON(result)
}
