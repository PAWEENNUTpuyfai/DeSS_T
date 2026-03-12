package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

func TransformDiscreteSimulationHandler(c *fiber.Ctx) error {
    // 1. รับค่าที่จำเป็นจาก Body หรือ Query (เช่น ID ของ Scenario และ Config)
    type InputRequest struct {
        ScenarioDetail      models.ScenarioDetail      `json:"scenario"`      // ✅ แก้เป็น "scenario"
        ConfigurationDetail models.ConfigurationDetail `json:"configuration"`
        TimePeriod          string                     `json:"time_periods"`  // ✅ แก้เป็น "time_periods"
        TimeSlot            string                     `json:"time_slot"`
    }

    var input InputRequest
    if err := c.BodyParser(&input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    // 2. โหลดไฟล์ Discrete Simulation จาก Storage ตาม ID (หัวใจสำคัญของงานนี้)
    // โดยใช้ ID จาก ConfigurationDetail ที่ส่งมา
	fmt.Printf("Received request to transform discrete simulation for ConfigurationDetailID: %s\n", input.ConfigurationDetail.ConfigurationDetailID)
    discreteFileData, err := services.LoadDiscreteSimulationFile(input.ConfigurationDetail.ConfigurationDetailID)
    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "ไม่พบไฟล์ข้อมูล Arrival: " + err.Error(),
        })
    }

    // 3. เรียก Service โดยส่ง Argument ให้ครบตามที่ฟังก์ชัน "Want" (ต้องการ)
    result := services.TransformDiscreteSimulationRequest(
        input.ScenarioDetail,       // arg 1
        input.ConfigurationDetail,  // arg 2
        *discreteFileData,          // arg 3 (ข้อมูลที่โหลดจากไฟล์)
        input.TimePeriod,           // arg 4
        input.TimeSlot,             // arg 5
    )

    return c.JSON(result)
}

func TransformSimulationHandler(c *fiber.Ctx) error {

	var req models.ProjectSimulationRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	result := services.TransformSimulationRequest(
		req.ScenarioDetail,
		req.ConfigurationDetail,
        req.TimePeriods,
		req.TimeSlot,
	)

	return c.JSON(result)
}

func RunSimulationHandler(c *fiber.Ctx) error {
    var req models.ProjectSimulationRequest

    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    configID := req.ConfigurationDetail.ConfigurationDetailID
    
    // 1. ลองโหลดไฟล์ดูว่ามี Discrete Data (ตารางเวลาจริง) หรือไม่
    discreteFileData, err := services.LoadDiscreteSimulationFile(configID)

    var result interface{} // สำหรับเก็บผลลัพธ์จาก Python ไม่ว่าจะเป็นแบบไหน
    var simErr error

    if err == nil && discreteFileData != nil {
        // --- กรณีที่ 1: พบไฟล์ -> ทำ Discrete Simulation ---
        transformedData := services.TransformDiscreteSimulationRequest(
            req.ScenarioDetail,
            req.ConfigurationDetail,
            *discreteFileData,
            req.TimePeriods,
            req.TimeSlot,
        )
        // ส่งไปที่ Python Service สำหรับ Discrete Sim (ถ้ามีฟังก์ชันแยก)
        // หรือส่งเข้า CallPythonSimulation ตัวเดิมถ้า Python รองรับทั้งคู่
        result, simErr = services.CallPythonSimulation(transformedData) 

    } else {
        // --- กรณีที่ 2: ไม่พบไฟล์ หรือ Error -> ทำ Standard Simulation ---
        transformedData := services.TransformSimulationRequest(
            req.ScenarioDetail,
            req.ConfigurationDetail,
            req.TimePeriods,
            req.TimeSlot,
        )
        result, simErr = services.CallPythonSimulation(transformedData)
    }

    if simErr != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to run simulation: " + simErr.Error(),
        })
    }

    return c.JSON(result)
}
// func RunSimulationHandler(c *fiber.Ctx) error {
// 	var req models.ProjectSimulationRequest

// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"error": err.Error(),
// 		})
// 	}

// 	// Transform the request first
// 	transformedData := services.TransformSimulationRequest(
// 		req.ScenarioDetail,
// 		req.ConfigurationDetail,
// 		req.TimePeriods,
// 		req.TimeSlot,
// 	)

// 	// Call Python simulation service with transformed data
// 	result, err := services.CallPythonSimulation(transformedData)
// 	if err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"error": "Failed to run simulation: " + err.Error(),
// 		})
// 	}

// 	return c.JSON(result)
// }
