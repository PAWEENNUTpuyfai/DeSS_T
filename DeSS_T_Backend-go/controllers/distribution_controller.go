package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"github.com/gofiber/fiber/v2"
)

func UploadGuestAlightingFit(c *fiber.Ctx) error {

    file, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "file missing"})
    }

    // Save to temp
    tempPath := "./tmp/" + file.Filename
    if err := c.SaveFile(file, tempPath); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot save file"})
    }

    // Read Excel → JSON
    jsonData, err := models.DistributionExcelToJSON(tempPath)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // Send JSON to Python
    result, err := services.CallPythonDistributionFit(jsonData)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(result)
}
