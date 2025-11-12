package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"

	"github.com/gofiber/fiber/v2"
)

func Calculate(c *fiber.Ctx) error {
	var req models.CalcRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	result, err := services.CallPythonAPIPOWER(req.Number)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to connect to Python service",
		})
	}

	return c.JSON(fiber.Map{
		"number": req.Number,
		"result": result,
	})
}
