package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"encoding/json"
    "os"
    "strings"
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

	configID := c.FormValue("configuration_detail_id")
	if configID == "" {
		configID = "default_config"
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
	var manualFitResponses []map[string]interface{} // สำหรับเก็บเคสที่ Go จัดการเองได้ (ไม่ต้องพึ่ง Python)

	// --- อ่านข้อมูลจาก Excel ---
	if isDayTemplate {
		// ประมวลผล Simulation ข้อมูลดิบ
		rawSimulationData, err := services.GenerateDiscreteSimulationJSON(fileReader, configID, stationMap)
		if err == nil {
			tempPath := "./storage/temp/" + configID + ".json"
			os.MkdirAll("./storage/temp/", 0755)
			fileData, _ := json.Marshal(rawSimulationData)
			os.WriteFile(tempPath, fileData, 0644)
		}

		if seeker, ok := fileReader.(io.Seeker); ok {
			seeker.Seek(0, 0)
		}

		jsonData, err = models.DistributionExcelToJSONReaderWithDayTemplate(fileReader, stationMap, isDayTemplate)
	} else {
		jsonData, err = models.DistributionExcelToJSONReader(fileReader, stationMap)
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

    // --- 3. Validation, Preparation & Time Formatting ---
    var dataToFit models.Data 
    
    for i := range jsonData.Data {
        // --- ส่วนที่เพิ่ม: ลบ AM/PM ออกจาก TimeRange ---
        jsonData.Data[i].TimeRange = strings.NewReplacer(
            " AM", "", " PM", "", 
            " am", "", " pm", "",
        ).Replace(jsonData.Data[i].TimeRange)
        
        item := jsonData.Data[i]
        stationID := item.Station
        stationName := idToNameMap[stationID]
        if stationName == "" { stationName = stationID }

        var interVals []float64
        for _, rec := range item.Records {
            interVals = append(interVals, rec.NumericValue)
        }

        if len(interVals) == 0 {
            manualFitResponses = append(manualFitResponses, map[string]interface{}{
                "station":      stationID,
                "station_name": stationName,
                "time_range":   item.TimeRange, // ใช้ตัวที่ clean แล้ว
                "distribution": "Fixed",
                "params":       map[string]float64{"value": 0},
                "status":       "no_data",
            })
            continue
        }

        if len(interVals) == 1 {
            manualFitResponses = append(manualFitResponses, map[string]interface{}{
                "station":      stationID,
                "station_name": stationName,
                "time_range":   item.TimeRange,
                "distribution": "Fixed",
                "params":       map[string]float64{"value": interVals[0]},
                "status":       "single_value",
            })
            interarrivalData = append(interarrivalData, models.InterarrivalItem{
                Station:            stationID,
                StationName:        stationName,
                TimeRange:          item.TimeRange,
                OriginalValues:     interVals,
                InterarrivalValues: interVals,
            })
            continue
        }

        dataToFit.Data = append(dataToFit.Data, item)
        interarrivalData = append(interarrivalData, models.InterarrivalItem{
            Station:            stationID,
            StationName:        stationName,
            TimeRange:          item.TimeRange,
            OriginalValues:     interVals,
            InterarrivalValues: interVals,
        })
    }
	// --- 4. เรียก Python Service เฉพาะข้อมูลที่ Fit ได้ ---
	var finalFitResponse []interface{}
	
	// รวมผลลัพธ์ที่เป็น Fixed ก่อน
	for _, m := range manualFitResponses {
		finalFitResponse = append(finalFitResponse, m)
	}

	if len(dataToFit.Data) > 0 {
		pythonResult, err := services.CallPythonInterarrivalDistributionFit(dataToFit)
		if err != nil {
			// ถ้า Python พัง อย่างน้อยเรายังมีข้อมูลเบื้องต้นส่งกลับ
			return c.Status(500).JSON(fiber.Map{
				"error":              "Python fitting service error",
				"detail":             err.Error(),
				"InterarrivalValues": interarrivalData,
			})
		}

		// ดึงผลลัพธ์จาก Python มาใส่ใน List
		if pyData, ok := pythonResult["DataFitResponse"].([]interface{}); ok {
			finalFitResponse = append(finalFitResponse, pyData...)
		} else if pythonResult != nil {
            // กรณี Python return array ตรงๆ
            finalFitResponse = append(finalFitResponse, pythonResult)
        }
	}

	// 5. ส่งกลับ Frontend
	response := fiber.Map{
		"DataFitResponse": finalFitResponse,
	}

	if isDayTemplate {
		response["InterarrivalValues"] = interarrivalData
	}

	return c.JSON(response)
}