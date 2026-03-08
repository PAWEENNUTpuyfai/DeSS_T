package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"encoding/json"
    "log"
	// "path/filepath"
	// "time"
    "io"
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

// FitDistributionFromInterarrivalValues receives interarrival values JSON directly and fits distribution
func FitDistributionFromInterarrivalValues(c *fiber.Ctx) error {
    // รับ JSON body โดยตรง
    var requestBody struct {
        InterarrivalValues []models.InterarrivalItem `json:"InterarrivalValues"`
    }
    
    if err := c.BodyParser(&requestBody); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "invalid JSON body", "detail": err.Error()})
    }
    
    if len(requestBody.InterarrivalValues) == 0 {
        return c.Status(400).JSON(fiber.Map{"error": "no interarrival values provided"})
    }
    
    // แปลง InterarrivalValues เป็น DataModelDistRequest สำหรับ Python
    var dataItems []models.ItemDistRequest
    for _, item := range requestBody.InterarrivalValues {
        var records []models.RecordDistRequest
        for i, val := range item.InterarrivalValues {
            records = append(records, models.RecordDistRequest{
                RecordID:     i + 1,
                NumericValue: val,
            })
        }
        dataItems = append(dataItems, models.ItemDistRequest{
            Station:   item.Station,
            TimeRange: item.TimeRange,
            Records:   records,
        })
    }
    
    jsonData := models.DataModelDistRequest{
        Data: dataItems,
    }
    
    // ส่ง JSON ไป Python สำหรับ distribution fitting
    result, err := services.CallPythonInterarrivalDistributionFit(jsonData)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    return c.JSON(result)
}

func UploadGuestInterarrivalFit(c *fiber.Ctx) error {
    // 1. รับค่า Parameter และไฟล์จาก Request
    f, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "file missing"})
    }

    // รับ config_id เพื่อใช้เป็นชื่อไฟล์ JSON
    configID := c.FormValue("configuration_detail_id")
    if configID == "" {
        configID = "default_config" // หรือจะใช้ timestamp แทนก็ได้
    }

    stationMapStr := c.FormValue("station_map")
    if stationMapStr == "" {
        return c.Status(400).JSON(fiber.Map{"error": "station_map missing"})
    }
    
    var stationMap map[string]string
    if err := json.Unmarshal([]byte(stationMapStr), &stationMap); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "invalid station_map"})
    }

    // สร้าง reverse map (ID -> Name) สำหรับแสดงผล
    idToNameMap := make(map[string]string)
    for name, id := range stationMap {
        idToNameMap[id] = name
    }

    isDayTemplate := c.FormValue("is_day_template") == "true"

    // 2. เปิดไฟล์ Excel
    fileReader, err := f.Open()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot open file", "detail": err.Error()})
    }
    defer fileReader.Close()

    var jsonData models.Data
    var interarrivalData []models.InterarrivalItem

    // --- ส่วนงานหลักกรณีเป็น Day Template ---
    if isDayTemplate {
        // A. สร้าง JSON ข้อมูลดิบ (Arrival Times) ตามโมเดล DiscreteSimulation
        rawSimulationData, err := services.GenerateDiscreteSimulationJSON(fileReader, configID)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "failed to generate simulation json", "detail": err.Error()})
        }

        // B. บันทึกไฟล์ JSON ลงในโฟลเดอร์ของระบบ Go (ไม่ส่งกลับ Frontend)
        // เรียกใช้ฟังก์ชัน Save ที่เราสร้างไว้ (ดูฟังก์ชัน Save ด้านล่างโค้ดนี้)
        _, err = services.SaveSimulationJSON(rawSimulationData)
        if err != nil {
            log.Printf("[ERROR] Save JSON failed: %v", err)
            // แจ้งเตือนใน Log แต่ปล่อยให้ระบบทำงานต่อได้
        }

        // C. สำคัญ: Reset Pointer ของไฟล์กลับไปจุดเริ่มต้น เพื่อให้ฟังก์ชันถัดไปอ่านได้
        if seeker, ok := fileReader.(io.Seeker); ok {
            seeker.Seek(0, 0)
        }

        // D. อ่านไฟล์เพื่อคำนวณ Interarrival (Logic เดิมของคุณ)
        jsonData, err = models.DistributionExcelToJSONReaderWithDayTemplate(
            fileReader,
            stationMap,
            isDayTemplate,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": err.Error()})
        }

        // E. เตรียมข้อมูล Interarrival สำหรับส่งกลับไปแสดงผลเบื้องต้น
        for i := range jsonData.Data {
            stationID := jsonData.Data[i].Station
            timeRange := jsonData.Data[i].TimeRange
            
            stationName := stationID
            if name, ok := idToNameMap[stationID]; ok {
                stationName = name
            }
            
            var interVals []float64
            for _, rec := range jsonData.Data[i].Records {
                interVals = append(interVals, rec.NumericValue)
            }

            interarrivalData = append(interarrivalData, models.InterarrivalItem{
                Station:            stationID,
                StationName:        stationName,
                TimeRange:          timeRange,
                OriginalValues:     interVals,
                InterarrivalValues: interVals,
            })
        }
    } else {
        // กรณีไม่ใช่ Day Template
        jsonData, err = models.DistributionExcelToJSONReader(fileReader, stationMap)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": err.Error()})
        }
    }

    // 3. ส่งข้อมูล (ที่ผ่านการหา Interarrival แล้ว) ไปให้ Python Fit Distribution
    result, err := services.CallPythonInterarrivalDistributionFit(jsonData)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Python fitting service error", "detail": err.Error()})
    }

    dataFitArray := result["DataFitResponse"]
    if dataFitArray == nil {
        dataFitArray = result 
    }

    // 4. สรุปผลลัพธ์ส่งกลับ Frontend
    // หมายเหตุ: เราไม่ส่ง RawArrivalData กลับไป เพราะเราเซฟลงเครื่องไปแล้วตามความต้องการ
    response := fiber.Map{
        "DataFitResponse": dataFitArray,
    }

    if isDayTemplate {
        response["InterarrivalValues"] = interarrivalData
    }

    return c.JSON(response)
}