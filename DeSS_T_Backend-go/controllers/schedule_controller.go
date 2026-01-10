package controllers

import (
	"DeSS_T_Backend-go/models"

	"github.com/gofiber/fiber/v2"
)

func UploadGuestSchedulefile(c *fiber.Ctx) error {
	// ดึง scenarioID จากพารามิเตอร์
	scenarioID := c.Params("scenarioID")
	if scenarioID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "scenarioID is required")
	}
	// รับไฟล์
	f, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "file missing"})
	}

	// เปิดไฟล์เป็น reader
	reader, err := f.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "cannot open file", "detail": err.Error()})
	}
	defer reader.Close()

	// อ่าน Excel → JSON (แก้ฟังก์ชันให้รับ io.Reader)
	jsonData, err := models.ScheduleExcelToJsonReader(reader, scenarioID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(jsonData)
}