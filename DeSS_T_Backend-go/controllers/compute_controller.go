package controllers

import (
    "DeSS_T_Backend-go/services"
    "github.com/gofiber/fiber/v2"
)

func ComputeFromPython(c *fiber.Ctx) error {
    var input struct {
        Num int `json:"num"`
    }

    if err := c.BodyParser(&input); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
    }

    result, err := services.CallPythonAPI(input.Num)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"num": input.Num, "result": result})
}
