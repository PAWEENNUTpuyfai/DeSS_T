package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"encoding/json"

	// "fmt"
	// "os"
	// "path/filepath"
	// "time"

	"github.com/gofiber/fiber/v2"
)

func UploadGuestAlightingFit(c *fiber.Ctx) error {
    // รับไฟล์
    f, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "file missing"})
    }

    stationMapStr := c.FormValue("station_map")
    if stationMapStr == "" {
        return c.Status(400).JSON(fiber.Map{"error": "station_map missing"})
    }
    
    var stationMap map[string]string
    if err := json.Unmarshal([]byte(stationMapStr), &stationMap); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "invalid station_map"})
    }
    // เปิดไฟล์เป็น reader
    reader, err := f.Open()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot open file", "detail": err.Error()})
    }
    defer reader.Close()

    // อ่าน Excel → JSON (แก้ฟังก์ชันให้รับ io.Reader)
    jsonData, err := models.DistributionExcelToJSONReader(
        reader,
        stationMap,
    )

    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // ส่ง JSON ไป Python
    result, err := services.CallPythonDistributionFit(jsonData)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(result)
}

func UploadGuestInterarrivalFit(c *fiber.Ctx) error {
    // รับไฟล์
    f, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "file missing"})
    }
    stationMapStr := c.FormValue("station_map")
    if stationMapStr == "" {
        return c.Status(400).JSON(fiber.Map{"error": "station_map missing"})
    }
    
    var stationMap map[string]string
    if err := json.Unmarshal([]byte(stationMapStr), &stationMap); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "invalid station_map"})
    }
    // เปิดไฟล์เป็น reader
    reader, err := f.Open()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot open file", "detail": err.Error()})
    }
    defer reader.Close()

    // อ่าน Excel → JSON (แก้ฟังก์ชันให้รับ io.Reader)
    jsonData, err := models.DistributionExcelToJSONReader(
        reader,
        stationMap,
    )

    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // ส่ง JSON ไป Python
    result, err := services.CallPythonDistributionFit(jsonData)

    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(result)
}
