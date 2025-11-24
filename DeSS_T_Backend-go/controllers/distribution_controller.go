package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
)

func UploadGuestAlightingFit(c *fiber.Ctx) error {

    file, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "file missing"})
    }

    // Save to temp
    tmpDir := "./tmp"
    if err := os.MkdirAll(tmpDir, 0o755); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot create tmp dir", "detail": err.Error()})
    }

    safeName := filepath.Base(file.Filename)
    tempPath := filepath.Join(tmpDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeName))
    if err := c.SaveFile(file, tempPath); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot save file", "detail": err.Error()})
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
