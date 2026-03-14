package controllers

import (
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func validateScenarioRouteScheduleConsistency(input model_database.UserScenario) error {
	if input.ScenarioDetail == nil {
		return errors.New("scenario_detail is required")
	}

	sd := input.ScenarioDetail
	if sd.RouteScenario == nil || len(sd.RouteScenario.RoutePaths) == 0 {
		return errors.New("route_paths is required")
	}
	if sd.BusScenario == nil {
		return errors.New("bus_scenario is required")
	}

	routePathIDs := make(map[string]struct{})
	for _, rp := range sd.RouteScenario.RoutePaths {
		routePathID := strings.TrimSpace(rp.ID)
		if routePathID == "" {
			return errors.New("route_path_id is required in route_paths")
		}
		routePathIDs[routePathID] = struct{}{}
	}

	scheduleByRoute := make(map[string]int)
	for _, sch := range sd.BusScenario.ScheduleDatas {
		routePathID := strings.TrimSpace(sch.RoutePathID)
		if routePathID == "" {
			return errors.New("route_path_id is required in schedule_data")
		}
		if _, exists := routePathIDs[routePathID]; !exists {
			return errors.New("route and schedule mismatch: schedule_data contains route_path_id not present in route_paths")
		}
		scheduleByRoute[routePathID]++
	}

	for routePathID := range routePathIDs {
		if scheduleByRoute[routePathID] == 0 {
			return errors.New("route and schedule mismatch: some route_paths do not have schedule_data")
		}
	}

	for _, info := range sd.BusScenario.BusInformations {
		routePathID := strings.TrimSpace(info.RoutePathID)
		if routePathID == "" {
			return errors.New("route_path_id is required in bus_informations")
		}
		if _, exists := routePathIDs[routePathID]; !exists {
			return errors.New("route and bus information mismatch: bus_informations contains route_path_id not present in route_paths")
		}
	}

	return nil
}

func CreateUserScenario(c *fiber.Ctx) error {
	var input model_database.UserScenario

	// 1. รับและแปลง JSON เข้าสู่ Struct
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "รูปแบบ JSON ไม่ถูกต้อง",
			"detail": err.Error(),
		})
	}

	if err := validateScenarioRouteScheduleConsistency(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "ข้อมูล route และ schedule ไม่สอดคล้องกัน",
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

	// 1. เรียก Service (รับค่า result และ configName)
	result, configName, err := services.GetScenarioDetailByID(scenarioDetailID)

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

	// 2. 🛠️ ประกอบร่าง JSON Response
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"configuration_detail_id": result.ConfigurationDetailID,
		"configuration_name":      configName, // 👈 เพิ่มชื่อที่ค้นหาได้ตรงนี้!
		"scenario_detail":         result,
	})
}

// DeleteUserScenario ลบ User Scenario
func DeleteUserScenario(c *fiber.Ctx) error {
	// 1. รับค่า ID จาก Parameter ใน URL
	scenarioID := c.Params("id")
	if scenarioID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ต้องระบุ ID ของ User Scenario ที่ต้องการลบ",
		})
	}

	// 2. เรียกใช้ Service เพื่อลบข้อมูล
	err := services.DeleteUserScenarioByID(scenarioID)
	if err != nil {
		// กรณีที่ 1: หาข้อมูลไม่พบ
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "ไม่พบข้อมูล User Scenario ที่ต้องการลบในระบบ",
			})
		}

		// กรณีที่ 2: Error ขัดข้องจาก Database หรือการลบ
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "เกิดข้อผิดพลาดในการลบข้อมูล",
			"detail": err.Error(),
		})
	}

	// 3. ส่งผลลัพธ์การลบสำเร็จ
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ลบข้อมูล User Scenario และข้อมูลที่เกี่ยวข้องสำเร็จเรียบร้อย",
	})
}

// EditUserScenario ทำการแก้ไขโดย ลบข้อมูลเก่าทิ้ง (ถ้ามี) แล้วสร้างข้อมูลใหม่ทับลงไป
func EditUserScenario(c *fiber.Ctx) error {
	// 1. รับค่า ID ของ Scenario เก่าจาก Parameter ใน URL
	scenarioID := c.Params("id")
	if scenarioID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ต้องระบุ ID ของ User Scenario ที่ต้องการแก้ไข",
		})
	}

	// 2. รับและแปลง JSON โครงสร้างใหม่ที่ต้องการอัปเดตเข้าสู่ Struct
	var input model_database.UserScenario
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "รูปแบบ JSON ไม่ถูกต้อง",
			"detail": err.Error(),
		})
	}

	if err := validateScenarioRouteScheduleConsistency(input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "ข้อมูล route และ schedule ไม่สอดคล้องกัน",
			"detail": err.Error(),
		})
	}

	// 🛠️ [สำคัญมาก] บังคับให้ ID ของข้อมูลใหม่ ตรงกับ ID ที่รับมาจาก URL
	// เพื่อให้เวลาสร้างใหม่ มันจะไปสวมรอยเป็น ID เดิม ไม่ใช่เกิดเป็น ID ใหม่เอี่ยม
	input.ID = scenarioID

	// 3. สั่งลบข้อมูลเก่า (เรียกใช้ Service Delete)
	err := services.DeleteUserScenarioByID(scenarioID)
	if err != nil {
		// ถ้า Error คือ ErrRecordNotFound แปลว่าไม่มีของเก่าอยู่ ก็ไม่เป็นไร ให้ปล่อยผ่านไปสร้างใหม่ได้เลย
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			// แต่ถ้าเป็น Error อื่นๆ เช่น Database พัง ให้รีเทิร์นกลับไป
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":  "เกิดข้อผิดพลาดในการลบข้อมูล Scenario เก่าก่อนอัปเดต",
				"detail": err.Error(),
			})
		}
	}

	// 4. สั่งสร้างข้อมูลใหม่ (เรียกใช้ Service Create)
	// เนื่องจากใน CreateUserScenario มีโค้ดดักไว้ว่า `if input.ID == ""` ค่อย Gen ใหม่
	// แต่เราบังคับใส่ ID เดิมเข้าไปแล้ว มันจึงใช้ ID เดิมในการสร้างครับ
	result, err := services.CreateUserScenario(input)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "ลบข้อมูลเก่าสำเร็จ แต่เกิดข้อผิดพลาดในการสร้างข้อมูล Scenario ใหม่",
			"detail": err.Error(),
		})
	}

	// 5. ส่งผลลัพธ์กลับ
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":       "อัปเดต User Scenario สำเร็จเรียบร้อย",
		"user_scenario": result,
	})
}
