package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"encoding/json"
	"fmt"
	"os"
	"time"

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


    // // อ่าน Excel → JSON (แก้ฟังก์ชันให้รับ io.Reader)
    // jsonData, err := models.DistributionExcelToJSONReader(
    //     reader,
    //     stationMap,
    // )

    // if err != nil {
    //     return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    // }

// อ่าน Excel → JSON
    jsonData, err := models.DistributionExcelToJSONReader(reader, stationMap)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // 🚩 [1] บันทึกไฟล์ JSON ที่อ่านจาก Excel (ที่มี RecordID และ NumericValue)
    timeStr := time.Now().Format("20060102_150405")
    excelJsonFile := fmt.Sprintf("debug_excel_data_alighting%s.json", timeStr)
    if err := saveJSONToFile(excelJsonFile, jsonData); err != nil {
        fmt.Printf("Warning: could not save excel json: %v\n", err)
    }

    // ส่ง JSON ไป Python
    result, err := services.CallPythonAlightingDistributionFit(jsonData)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // 🚩 [2] บันทึกไฟล์ JSON ที่ได้จากการ Fit (ผลลัพธ์จาก Python)
    fitResultFile := fmt.Sprintf("debug_fit_result_alighting%s.json", timeStr)
    if err := saveJSONToFile(fitResultFile, result); err != nil {
        fmt.Printf("Warning: could not save fit result: %v\n", err)
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
    // อ่าน Excel → JSON
    jsonData, err := models.DistributionExcelToJSONReader(reader, stationMap)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // 🚩 [1] บันทึกไฟล์ JSON ที่อ่านจาก Excel (ที่มี RecordID และ NumericValue)
    timeStr := time.Now().Format("20060102_150405")
    excelJsonFile := fmt.Sprintf("debug_excel_data_Inter%s.json", timeStr)
    if err := saveJSONToFile(excelJsonFile, jsonData); err != nil {
        fmt.Printf("Warning: could not save excel json: %v\n", err)
    }

    // ส่ง JSON ไป Python
    result, err := services.CallPythonDistributionFit(jsonData)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // 🚩 [2] บันทึกไฟล์ JSON ที่ได้จากการ Fit (ผลลัพธ์จาก Python)
    fitResultFile := fmt.Sprintf("debug_fit_result_Inter%s.json", timeStr)
    if err := saveJSONToFile(fitResultFile, result); err != nil {
        fmt.Printf("Warning: could not save fit result: %v\n", err)
    }
    return c.JSON(result)
}

func saveJSONToFile(filename string, data interface{}) error {
	file, err := json.MarshalIndent(data, "", "  ") // ใช้ Indent ให้อ่านง่าย
	if err != nil {
		return err
	}
	return os.WriteFile(filename, file, 0644)
}