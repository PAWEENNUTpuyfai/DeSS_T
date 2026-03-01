package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"encoding/json"

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
    result, err := services.CallPythonAlightingDistributionFit(jsonData)
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

    // สร้าง reverse map (ID -> Name) สำหรับแสดงผลใน response
    idToNameMap := make(map[string]string)
    for name, id := range stationMap {
        idToNameMap[id] = name
    }

    // รับ flag ว่าเป็น day template หรือไม่
    isDayTemplateStr := c.FormValue("is_day_template")
    isDayTemplate := isDayTemplateStr == "true"

    // เปิดไฟล์เป็น reader
    reader, err := f.Open()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot open file", "detail": err.Error()})
    }
    defer reader.Close()
    
    // อ่าน Excel และคำนวณ interarrival ในแต่ละ column แล้วจัดกลุ่มตามชั่วโมง
    // Records ที่ได้คือ interarrival values แล้ว (ไม่ใช่ arrival times)
    jsonData, err := models.DistributionExcelToJSONReaderWithDayTemplate(
        reader,
        stationMap,
        isDayTemplate,
    )

    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // สร้าง interarrival data สำหรับ response (Records เป็น interarrival แล้ว)
    interarrivalData := []models.InterarrivalItem{}
    for i := range jsonData.Data {
        stationID := jsonData.Data[i].Station
        timeRange := jsonData.Data[i].TimeRange
        
        // หาชื่อสถานีจาก reverse map
        stationName := stationID
        if name, ok := idToNameMap[stationID]; ok {
            stationName = name
        }
        
        // แปลง records เป็น float64 array (ค่าเหล่านี้คือ interarrival แล้ว)
        var interVals []float64
        for _, rec := range jsonData.Data[i].Records {
            interVals = append(interVals, rec.NumericValue)
        }

        interarrivalData = append(interarrivalData, models.InterarrivalItem{
            Station:           stationID,
            StationName:       stationName,
            TimeRange:         timeRange,
            OriginalValues:    interVals, // ใช้ interarrival เป็น original ด้วย (เพื่อ download)
            InterarrivalValues: interVals,
        })
    }

    // ส่ง JSON ไป Python สำหรับ distribution fitting
    result, err := services.CallPythonInterarrivalDistributionFit(jsonData)

    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    // ส่ง response ที่รวม distribution fit + interarrival values
    response := fiber.Map{
        "DataFitResponse": result,
        "InterarrivalValues": interarrivalData,
    }

    return c.JSON(response)
}
