package controllers

import (
	"github.com/gofiber/fiber/v2"
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/services"
)

func CreateUserScenario(c *fiber.Ctx) error {
	var input model_database.UserScenario

	// 1. รับและแปลง JSON เข้าสู่ Struct
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "รูปแบบ JSON ไม่ถูกต้อง",
			"detail": err.Error(),
		})
	}

	// 2. เรียกใช้ Service เพื่อบันทึกข้อมูล
	result, err := services.CreateUserScenario(input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "ไม่สามารถบันทึก User Scenario ได้",
			"detail": err.Error(),
		})
	}

	// 3. ส่งผลลัพธ์กลับ
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "สร้าง User Scenario สำเร็จ",
		"data":    result,
	})
}