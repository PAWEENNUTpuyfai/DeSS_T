package controllers

import (
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"
	"errors"
	"log"
	"time"

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

	// 2. ดึงข้อมูลจากฐานข้อมูลผ่าน Service (ใช้ข้อมูลจาก model_database ที่ดึงด้วย Preload)
	dbResult, err := services.GetConfigurationDetailByID(configDetailID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "ไม่พบข้อมูล Configuration Detail นี้ในระบบ",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "เกิดข้อผิดพลาดในการดึงข้อมูล",
			"detail": err.Error(),
		})
	}

	// 3. 🛠 MAPPING: จาก model_database ไปยังโครงสร้าง models (DTO) เพื่อให้ JSON คลีน 100%
	
	// --- Map Station Details (ที่อยู่ใน Network Model) ---
	var stationDetails []models.StationDetail
	for _, sd := range dbResult.NetworkModel.StationDetails {
		stationDetails = append(stationDetails, models.StationDetail{
			StationDetailID: sd.ID,
			Name:            sd.Name,
			Lat:             sd.Lat,
			Lon:             sd.Lon,
			StationIDOSM:    sd.StationIDOSM,
			Location: models.GeoPoint{
				Type:        "Point",
				Coordinates: [2]float64{sd.Lon, sd.Lat},
			},
		})
	}

	// --- Map Station Pairs (พร้อมข้อมูล RouteBetween) ---
	var stationPairs []models.StationPair
	for _, sp := range dbResult.NetworkModel.StationPairs {
		stationPairs = append(stationPairs, models.StationPair{
			StationPairID:  sp.ID,
			FstStationID:   sp.FstStationID,
			SndStationID:   sp.SndStationID,
			RouteBetweenID: sp.RouteBetweenID,
			NetworkModelID: sp.NetworkModelID,
			RouteBetween: models.RouteBetween{
				RouteBetweenID: sp.RouteBetween.ID,
				TravelTime:     sp.RouteBetween.TravelTime,
				Distance:       sp.RouteBetween.Distance,
			},
			// สังเกตว่าเราไม่ใส่ NetworkModel ลงไปในนี้แล้ว เพื่อป้องกัน Recursive JSON และทำให้ข้อมูลสะอาดขึ้น
		})
	}

	// --- Map Network Model (หุ้ม StationPairs และ StationDetails ไว้) ---
	networkModel := models.NetworkModel{
		NetworkModelID: dbResult.NetworkModel.ID,
		Name:           dbResult.NetworkModel.NetworkModelName,
		StationPairs:   stationPairs,
		StationDetails: stationDetails,
	}

	// --- Map Alighting Data (ข้อมูลคนลง) ---
	var alightingData []models.AlightingData
	for _, ad := range dbResult.AlightingData {
		alightingData = append(alightingData, models.AlightingData{
			AlightingDataID:       ad.ID,
			ConfigurationDetailID: ad.ConfigurationDetailID,
			TimePeriod:            ad.TimePeriod,
			Distribution:          ad.Distribution,
			ArgumentList:          ad.ArgumentList,
			StationID:             ad.StationDetailID,
			
		})
	}

	// --- Map InterArrival Data (ข้อมูลเวลาระหว่างรถเข้า) ---
	var interArrivalData []models.InterArrivalData
	for _, ia := range dbResult.InterArrivalData {
		interArrivalData = append(interArrivalData, models.InterArrivalData{
			InterArrivalDataID:    ia.ID,
			ConfigurationDetailID: ia.ConfigurationDetailID,
			TimePeriod:            ia.TimePeriod,
			Distribution:          ia.Distribution,
			ArgumentList:          ia.ArgumentList,
			StationID:             ia.StationDetailID,
			
		})
	}

	// --- ประกอบร่าง Response ขั้นสุดท้ายเข้าไปใน ConfigurationDetail ---
	responseDetail := models.ConfigurationDetail{
		ConfigurationDetailID: dbResult.ID,
		NetworkModelID:        dbResult.NetworkModelID,
		NetworkModel:          networkModel,
		AlightingData:         alightingData,
		InterArrivalData:      interArrivalData,
	}

	// 4. ห่อหุ้มด้วย Struct ระดับบนสุด (ROOT CONFIGURATION)
	finalResponse := models.ConfigurationJSON{
		Configuration: responseDetail,
	}

	// ส่งกลับเป็น JSON
	return c.Status(fiber.StatusOK).JSON(finalResponse)
}

func GetUserConfigurations(c *fiber.Ctx) error {
	// 1. รับค่า user_id จาก Parameter
	userID := c.Params("user_id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ต้องระบุ user_id",
		})
	}

	// 2. ดึงข้อมูลจากฐานข้อมูล (ตอนนี้ Service จะเบาและเร็วมาก)
	dbConfigs, err := services.GetUserConfigurationsByUserID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "เกิดข้อผิดพลาดในการดึงข้อมูลรายการ Configuration",
			"detail": err.Error(),
		})
	}

	// 3. 🛠 MAPPING: จาก DB Model แปลงเป็น DTO Model
	var responseList []models.UserConfiguration

	for _, dbConf := range dbConfigs {
		// --- จัดการ Cover Image ---
		var coverImage models.CoverImageConf
		var coverImgIDStr string
		
		if dbConf.CoverImage != nil {
			// ถ้ามีข้อมูลรูปภาพ ให้ Map id และ path_file
			coverImgIDStr = dbConf.CoverImage.ID
			coverImage = models.CoverImageConf{
				CoverImageConfID: dbConf.CoverImage.ID,
				PathFile:         dbConf.CoverImage.PathFile,
			}
		} else if dbConf.CoverImgID != nil {
			coverImgIDStr = *dbConf.CoverImgID
		}

		// --- ประกอบร่าง User Configuration DTO ---
		dto := models.UserConfiguration{
			UserConfigurationID:   dbConf.ID,
			Name:                  dbConf.Name,
			ModifyDate:            dbConf.ModifyDate.Format(time.RFC3339), // แปลงเป็น ISO String
			CreateBy:              dbConf.CreateBy,
			CoverImgID:            coverImgIDStr,
			ConfigurationDetailID: dbConf.ConfigurationDetailID,
			CoverImage:            coverImage, 
			// ❌ สังเกตว่าเราไม่ประกาศ ConfigurationDetail ตรงนี้เลย
			// เนื่องจากใน models มี `omitempty` อยู่ ฟิลด์นี้จะไม่ถูกแสดงใน JSON ผลลัพธ์
		}

		responseList = append(responseList, dto)
	}

	// 4. ถ้าไม่มีข้อมูล จะคืนค่ากลับเป็น Array ว่าง [] เพื่อให้ Frontend ไม่เจอปัญหา null
	if responseList == nil {
		responseList = []models.UserConfiguration{}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"user_configurations": responseList,
	})
}