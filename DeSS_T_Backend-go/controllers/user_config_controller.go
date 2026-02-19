package controllers

import (
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/services"
	"log"
	"errors"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateUserConfiguration(c *fiber.Ctx) error {
	var configInput model_database.UserConfiguration
	
	// 📥 โหลดข้อมูล JSON
	rawBody := c.Body()
	log.Printf("📦 Received JSON body length: %d bytes", len(rawBody))
	
	// Parse JSON (ต้องมั่นใจว่า Model เปลี่ยน Location/Route เป็น Struct แล้ว)
	if err := c.BodyParser(&configInput); err != nil {
		log.Printf("❌ Parse error: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "รูปแบบข้อมูลไม่ถูกต้อง (Check GeoJSON format)", 
			"detail": err.Error(),
		})
	}

	// ✅ ตรวจสอบข้อมูลเบื้องต้น
	if configInput.CreateBy == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ต้องระบุ create_by"})
	}

	// 💾 เรียก Service เพื่อบันทึกข้อมูล
	log.Println("💾 กำลังเริ่มขั้นตอนการ Gen ID ใหม่และบันทึกข้อมูล...")
	result, err := services.SaveUserConfiguration(configInput)
	if err != nil {
		log.Printf("❌ Save error: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "ไม่สามารถบันทึกข้อมูลได้", 
			"detail": err.Error(),
		})
	}

	log.Println("✅ บันทึกข้อมูลสำเร็จ")
	return c.Status(201).JSON(fiber.Map{
		"message": "บันทึก User Configuration สำเร็จ (Generated New IDs)",
		"data": result,
	})
}

func GetConfigurationDetail(c *fiber.Ctx) error {
	// 1. รับค่า ID จาก Parameter ใน URL
	configDetailID := c.Params("id")
	if configDetailID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ต้องระบุ configuration_detail_id",
		})
	}

	// 2. เรียก Service เพื่อดึงข้อมูล
	result, err := services.GetConfigurationDetailByID(configDetailID)
	if err != nil {
		// หากหาข้อมูลไม่พบ (Record Not Found)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "ไม่พบข้อมูล Configuration Detail นี้ในระบบ",
			})
		}
		
		// กรณี Error อื่นๆ จาก Database
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "เกิดข้อผิดพลาดในการดึงข้อมูล",
			"detail": err.Error(),
		})
	}

	// 3. ส่งข้อมูลกลับไปในรูปแบบ JSON ตามโครงสร้างที่กำหนด
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"configuration_detail": result,
	})
}