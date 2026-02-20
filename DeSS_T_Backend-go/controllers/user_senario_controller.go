package controllers

import (
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
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

func GetUserScenarios(c *fiber.Ctx) error {
    // 1. รับค่า user_id จาก Parameter
    userID := c.Params("user_id")
    if userID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "ต้องระบุ user_id",
        })
    }

    // 2. ดึงข้อมูลจากฐานข้อมูลผ่าน Service
    dbScenarios, err := services.GetUserScenariosByUserID(userID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error":  "เกิดข้อผิดพลาดในการดึงข้อมูลรายการ User Scenario",
            "detail": err.Error(),
        })
    }

    // 3. 🛠 MAPPING: จาก DB Model แปลงเป็น DTO Model (models.UserScenario)
    var responseList []models.UserScenario

    for _, dbSc := range dbScenarios {
        // --- จัดการ Cover Image ---
        var coverImage models.CoverImageProject
        var coverImgIDStr string
        
        if dbSc.CoverImage != nil {
            // ถ้ามีข้อมูลรูปภาพ ให้ Map id และ path_file
            coverImgIDStr = dbSc.CoverImage.ID
            coverImage = models.CoverImageProject{
                CoverImageProID: dbSc.CoverImage.ID,
                PathFile:        dbSc.CoverImage.PathFile,
            }
        } else if dbSc.CoverImgID != nil {
            coverImgIDStr = *dbSc.CoverImgID
        }

        // --- ประกอบร่าง User Scenario DTO ---
        dto := models.UserScenario{
            UserScenarioID:   dbSc.ID,
            Name:             dbSc.Name,
            ModifyDate:       dbSc.ModifyDate.Format(time.RFC3339), // แปลงเป็น ISO String เช่น "2026-02-19T10:00:00Z"
            CreateBy:         dbSc.CreateBy,
            CoverImgID:       coverImgIDStr,
            ScenarioDetailID: dbSc.ScenarioDetailID,
            CoverImage:       coverImage,
            // ScenarioDetail: (ข้ามฟิลด์นี้ไปเพื่อให้ JSON ไม่แสดงผลก้อนใหญ่ ตาม omitempty)
        }

        responseList = append(responseList, dto)
    }

    // 4. ถ้าไม่มีข้อมูล จะคืนค่ากลับเป็น Array ว่าง [] เพื่อให้ Frontend จัดการง่าย
    if responseList == nil {
        responseList = []models.UserScenario{}
    }

    return c.Status(fiber.StatusOK).JSON(fiber.Map{
        "user_scenarios": responseList,
    })
}
// GetScenarioDetails ดึงข้อมูล Scenario Detail แบบเต็มรูปแบบ
func GetScenarioDetails(c *fiber.Ctx) error {
	scenarioDetailID := c.Params("id")

	if scenarioDetailID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ต้องระบุ scenario_detail_id ใน URL",
		})
	}

	// 1. เรียก Service (ใช้ Service ตัวเดิมที่ผมเขียนให้ได้เลยครับ)
	result, err := services.GetScenarioDetailByID(scenarioDetailID)
	
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "ไม่พบข้อมูล Scenario Detail นี้ในระบบ",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "เกิดข้อผิดพลาดในการดึงข้อมูล",
			"detail": err.Error(),
		})
	}

	// 2. 🛠️ แก้ไขการส่ง Response ตรงนี้
	// ดึง ConfigurationDetailID ออกมาวางไว้ที่ Root Level คู่กับก้อน scenario_detail
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"configuration_detail_id": result.ConfigurationDetailID, // 👈 เพิ่มบรรทัดนี้
		"scenario_detail":         result,                       // ก้อนเดิม
	})
}