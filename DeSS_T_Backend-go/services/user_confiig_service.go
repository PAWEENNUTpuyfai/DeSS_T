package services

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SaveUserConfiguration(input model_database.UserConfiguration) (model_database.UserConfiguration, error) {
	// 🟢 [DEBUG] เช็คข้อมูลที่รับมาจาก JSON ก่อนเข้า Transaction
	// log.Println("--- DEBUG: START SAVE USER CONFIGURATION ---")
	// log.Printf("📦 Network Model Name: %s", input.ConfigurationDetail.NetworkModel.NetworkModelName)
	// log.Printf("📍 Stations count: %d", len(input.ConfigurationDetail.NetworkModel.StationDetails))
	// log.Printf("📉 Alighting Data count: %d", len(input.ConfigurationDetail.AlightingData))
	// log.Printf("📈 InterArrival Data count: %d", len(input.ConfigurationDetail.InterArrivalData))
    stationIDMap := make(map[string]string)
	err := config.DB.Transaction(func(tx *gorm.DB) error {

		// --- 1. Generate New IDs ---
		input.ID = uuid.New().String()
		configDetail := input.ConfigurationDetail
		configDetail.ID = uuid.New().String()
		input.ConfigurationDetailID = configDetail.ID

		netModel := configDetail.NetworkModel
		netModel.ID = uuid.New().String()
		configDetail.NetworkModelID = netModel.ID

		// log.Printf("🆔 New ConfigDetail ID: %s", configDetail.ID)
		// log.Printf("🆔 New NetworkModel ID: %s", netModel.ID)

		// --- 2. บันทึก Network Model ---
		if err := tx.Select("ID", "NetworkModelName").Create(netModel).Error; err != nil {
			return fmt.Errorf("failed to create network model: %w", err)
		}

		// --- 3. บันทึก StationDetails & Build ID Map ---
		for i := range netModel.StationDetails {
			s := &netModel.StationDetails[i]
			oldID := s.ID
			newID := uuid.New().String()
			stationIDMap[oldID] = newID

			// [DEBUG] เช็คพิกัดว่าอ่านจาก JSON ได้ไหม
			if len(s.LocationJSON.Coordinates) < 2 {
				return fmt.Errorf("station [%d] %s: coordinates are missing in JSON", i, s.Name)
			}

			// log.Printf("📍 Mapping Station [%d]: (Old) %s -> (New) %s | Name: %s", i, oldID, newID, s.Name)

			s.ID = newID
			s.NetworkModelID = netModel.ID

			pointWKT := fmt.Sprintf("POINT(%f %f)", s.LocationJSON.Coordinates[0], s.LocationJSON.Coordinates[1])
			query := `INSERT INTO station_details (id, station_name, network_model_id, lat, lon, station_id_osm, location)
                      VALUES (?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326))`

			if err := tx.Exec(query, s.ID, s.Name, s.NetworkModelID, s.Lat, s.Lon, s.StationIDOSM, pointWKT).Error; err != nil {
				return fmt.Errorf("failed to save station %s: %w", s.Name, err)
			}
		}

		// --- 4. บันทึก StationPair & RouteBetween ---
		for i := range netModel.StationPairs {
			pair := &netModel.StationPairs[i]
			pair.ID = uuid.New().String()
			pair.NetworkModelID = netModel.ID

			newFst, ok1 := stationIDMap[pair.FstStationID]
			newSnd, ok2 := stationIDMap[pair.SndStationID]

			if !ok1 || !ok2 {
				return fmt.Errorf("station_pair [%d]: fst(%s) or snd(%s) not found in map", i, pair.FstStationID, pair.SndStationID)
			}

			pair.FstStationID = newFst
			pair.SndStationID = newSnd
			pair.RouteBetween.ID = uuid.New().String()

			if err := tx.Create(&pair.RouteBetween).Error; err != nil {
				return err
			}
			pair.RouteBetweenID = pair.RouteBetween.ID

			if err := tx.Omit("FstStation", "SndStation", "NetworkModel").Create(pair).Error; err != nil {
				return fmt.Errorf("failed to save station pair: %w", err)
			}
		}

		// --- 5. บันทึก Configuration Detail ---
		if err := tx.Omit("AlightingData", "InterArrivalData", "ScenarioDetails", "NetworkModel").Create(configDetail).Error; err != nil {
			return fmt.Errorf("failed to create config detail: %w", err)
		}

		// --- 6. บันทึก Alighting Data (Check Mapping) ---
		for i := range configDetail.AlightingData {
			d := &configDetail.AlightingData[i]
			d.ID = uuid.New().String()
			d.ConfigurationDetailID = configDetail.ID

			oldStationID := d.StationDetailID
			newStationID, ok := stationIDMap[oldStationID]

			// [DEBUG] Log รายตัว
			// log.Printf("📉 Alighting [%d]: Looking for Station ID (Old): '%s'", i, oldStationID)

			if !ok || newStationID == "" {
				return fmt.Errorf("alighting_data [%d]: station_id '%s' not found. Check if 'station_id' in JSON matches station id in NetworkModel", i, oldStationID)
			}

			// log.Printf("📉 Alighting [%d]: Successfully Mapped to (New): %s", i, newStationID)
			d.StationDetailID = newStationID

			if err := tx.Omit("StationDetail", "ConfigurationDetail").Create(d).Error; err != nil {
				return fmt.Errorf("failed to create alighting data: %w", err)
			}
		}

		// --- 7. บันทึก InterArrival Data (Check Mapping) ---
		for i := range configDetail.InterArrivalData {
			d := &configDetail.InterArrivalData[i]
			d.ID = uuid.New().String()
			d.ConfigurationDetailID = configDetail.ID

			oldStationID := d.StationDetailID
			newStationID, ok := stationIDMap[oldStationID]

			// [DEBUG] Log รายตัว
			// log.Printf("📈 InterArrival [%d]: Looking for Station ID (Old): '%s'", i, oldStationID)

			if !ok || newStationID == "" {
				return fmt.Errorf("inter_arrival_data [%d]: station_id '%s' not found", i, oldStationID)
			}

			// log.Printf("📈 InterArrival [%d]: Successfully Mapped to (New): %s", i, newStationID)
			d.StationDetailID = newStationID

			if err := tx.Omit("StationDetail", "ConfigurationDetail").Create(d).Error; err != nil {
				return fmt.Errorf("failed to create inter arrival data: %w", err)
			}
		}

		// --- 8. Scenario Details & Route Paths ---
		if configDetail.ScenarioDetails != nil {
			for i := range configDetail.ScenarioDetails {
				sd := &configDetail.ScenarioDetails[i]
				sd.ID = uuid.New().String()
				sd.ConfigurationDetailID = configDetail.ID

				rs := sd.RouteScenario
				rs.ID = uuid.New().String()
				sd.RouteScenarioID = rs.ID

				for j := range rs.RoutePaths {
					rp := &rs.RoutePaths[j]
					rp.ID = uuid.New().String()
					rp.RouteScenarioID = rs.ID

					if len(rp.RouteJSON.Coordinates) == 0 {
						log.Printf("⚠️ Warning: RoutePath %s has no coordinates", rp.Name)
						continue
					}

					var points []string
					for _, coord := range rp.RouteJSON.Coordinates {
						points = append(points, fmt.Sprintf("%f %f", coord[0], coord[1]))
					}
					lineWKT := fmt.Sprintf("LINESTRING(%s)", strings.Join(points, ","))

					query := `INSERT INTO route_paths (id, name, color, route_scenario_id, route) VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326))`
					if err := tx.Exec(query, rp.ID, rp.Name, rp.Color, rp.RouteScenarioID, lineWKT).Error; err != nil {
						return fmt.Errorf("failed to save route path %s: %w", rp.Name, err)
					}
				}

				if err := tx.Create(rs).Error; err != nil { return err }
				sd.BusScenario.ID = uuid.New().String()
				if err := tx.Create(&sd.BusScenario).Error; err != nil { return err }
				sd.BusScenarioID = sd.BusScenario.ID
				if err := tx.Create(sd).Error; err != nil { return err }
			}
		}

		// --- 9. Final: Save UserConfiguration ---
		if err := tx.Omit("ConfigurationDetail", "CoverImage", "CreateByUser").Create(&input).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		log.Printf("❌ TRANSACTION FAILED: %v", err)
	} else {
		log.Println("✅ TRANSACTION SUCCESS: All data saved successfully")
	}

	// 2. ดึงไฟล์ Temp มาจัดการ
    tempPath := "./storage/temp/default_config.json"
    rawBytes, errRead := os.ReadFile(tempPath)
	// ✅ เมื่อบันทึก DB สำเร็จ (Transaction Committed)
	if errRead == nil {
        var rawData models.DiscreteSimulation
        if errUnmarshal := json.Unmarshal(rawBytes, &rawData); errUnmarshal == nil {

            // 3. 🛠 เริ่มการแปลง ID เป็นของจริง (Finalizing JSON)
            finalData := models.DiscreteSimulation{
                // ใช้ค่า ID ใหม่ที่ Gen ใน Transaction (cd.ID)
                ConfigurationDetailID: input.ConfigurationDetail.ID, 
                ArrivalList:           []models.ArrivalList{},
            }

            for _, arrival := range rawData.ArrivalList {
                // 🔍 ดึง New ID จาก Map ที่เราสร้างไว้ใน Transaction
                newStationID, ok := stationIDMap[arrival.StationID] 
                if !ok {
                    // ถ้าหาไม่เจอใน Map ให้ใช้ค่าเดิม (ป้องกันข้อมูลหาย)
                    newStationID = arrival.StationID
                    log.Printf("⚠️ Warning: Station ID %s not found in mapping", arrival.StationID)
                }
                
                finalData.ArrivalList = append(finalData.ArrivalList, models.ArrivalList{
                    StationID:       newStationID,
                    ArrivalTimeData: arrival.ArrivalTimeData,
                })
            }

            // 4. บันทึกไฟล์ที่เปลี่ยน ID แล้ว และลบไฟล์ Temp ทิ้ง
			savedPath, errSave := SaveSimulationJSON(finalData) // ✅ รับทั้ง 2 ค่า
			if errSave != nil {
				log.Printf("❌ Error saving final JSON: %v", errSave)
			} else {
				log.Printf("✅ Successfully saved final JSON at: %s", savedPath)
				os.Remove(tempPath) 
			}
        }
    } else {
        log.Printf("⚠️ Warning: Temp file not found at %s", tempPath)
    }

    return input, nil
}
func GetConfigurationDetailByID(configDetailID string) (model_database.ConfigurationDetail, error) {
	var configDetail model_database.ConfigurationDetail

	// 🔍 ใช้ Preload เพื่อดึงข้อมูลลูกและหลานที่เกี่ยวข้องทั้งหมด
	err := config.DB.
		Preload("NetworkModel").                            // ดึง Network Model
		Preload("NetworkModel.StationPairs").               // ดึง StationPair ที่อยู่ใน NetworkModel
		Preload("NetworkModel.StationPairs.RouteBetween").  // ดึง RouteBetween ที่อยู่ใน StationPair
		Preload("NetworkModel.StationDetails").             // ดึง StationDetail
		Preload("AlightingData").                           // ดึงข้อมูล Alighting
		Preload("InterArrivalData").                        // ดึงข้อมูล InterArrival
		First(&configDetail, "id = ?", configDetailID).Error // ค้นหาด้วย ID

	if err != nil {
		return configDetail, fmt.Errorf("query failed: %w", err)
	}

	// 🛠 Post-Processing: ประกอบร่าง LocationJSON ให้ StationDetail
	// เนื่องจากใน DB เราเก็บแยกเป็น Lat, Lon และ PostGIS Geometry
	// Frontend ต้องการ JSON Object { "type": "Point", "coordinates": [...] }
	for i := range configDetail.NetworkModel.StationDetails {
		station := &configDetail.NetworkModel.StationDetails[i]
		
		// นำ Lat, Lon ที่มีอยู่แล้วมาประกอบเข้า LocationJSON
		station.LocationJSON = model_database.LocationData{
			Type:        "Point",
			Coordinates: []float64{station.Lon, station.Lat}, // [Lon, Lat] ตามมาตรฐาน GeoJSON
		}
	}

	return configDetail, nil
}


// ดึงรายการ User Configuration ทั้งหมดของ User คนนั้น (แบบไม่ต้องเอา Detail)
func GetUserConfigurationsByUserID(userID string) ([]model_database.UserConfiguration, error) {
	var userConfigs []model_database.UserConfiguration

	err := config.DB.
		Preload("CoverImage"). // ✅ ดึงมาแค่ CoverImage เพื่อเอา path_file ก็พอ
		Where("create_by = ?", userID).
		Find(&userConfigs).Error

	return userConfigs, err
}

func DeleteUserConfigurationByID(configID string) error {
    var userConfig model_database.UserConfiguration

    // 1. ดึงข้อมูลพร้อม Preload ไปจนถึง ConfigurationDetail เพื่อหา NetworkModelID
    err := config.DB.
        Preload("CoverImage").
        Preload("ConfigurationDetail").
        First(&userConfig, "id = ?", configID).Error
    
    if err != nil {
        return err
    }

    // เตรียม ID และชื่อไฟล์สำหรับลบ
    var fileNameToDelete string
    var coverImageID string
    if userConfig.CoverImage != nil {
        fileNameToDelete = userConfig.CoverImage.PathFile
        coverImageID = userConfig.CoverImage.ID
    }

    // ดึง NetworkModelID ออกมาเก็บไว้ก่อนลบ Config
    networkModelID := ""
    if userConfig.ConfigurationDetail != nil {
        networkModelID = userConfig.ConfigurationDetail.NetworkModelID
    }

    // 2. ใช้ Transaction ลบตามลำดับความสัมพันธ์
    err = config.DB.Transaction(func(tx *gorm.DB) error {
        
        // ก. ลบ UserConfiguration
        if err := tx.Delete(&userConfig).Error; err != nil {
            return err
        }

        // ข. ลบ CoverImage (ถ้ามี)
        if coverImageID != "" {
            if err := tx.Delete(&model_database.CoverImageConf{}, "id = ?", coverImageID).Error; err != nil {
                return err
            }
        }

        // ค. ลบ ConfigurationDetail (ถ้ามี)
        // ตรงนี้จะลบ AlightingData, InterArrivalData ตาม Cascade
        if userConfig.ConfigurationDetailID != "" {
            if err := tx.Delete(&model_database.ConfigurationDetail{}, "id = ?", userConfig.ConfigurationDetailID).Error; err != nil {
                return err
            }
        }

        // ง. ลบ NetworkModel (หัวใจสำคัญ)
        // เมื่อลบ NetworkModelID นี้ StationDetail และ StationPair จะถูกลบตาม Cascade ใน Model
        if networkModelID != "" {
            // เช็คก่อนว่ามี Config อื่นใช้ NetworkModel นี้อยู่ไหม (ป้องกันลบพลาดถ้ามีการแชร์ Network)
            var count int64
            tx.Model(&model_database.ConfigurationDetail{}).Where("network_model_id = ?", networkModelID).Count(&count)
            
            if count == 0 { // ถ้าไม่มีใครใช้แล้ว ให้ลบทิ้งทันที
                if err := tx.Delete(&model_database.NetworkModel{}, "id = ?", networkModelID).Error; err != nil {
                    return err
                }
            }
        }

        return nil
    })

    // 3. ลบไฟล์จริงออกจาก Disk
    if err == nil && fileNameToDelete != "" {
        deletePhysicalFile(fileNameToDelete)
    }

    return err
}

// Helper function สำหรับลบไฟล์จริงบน Disk
func deletePhysicalFile(fileName string) {
    uploadDir := os.Getenv("UPLOAD_DIR")
    if uploadDir == "" { uploadDir = "./uploads" }
    
    filePath := filepath.Join(uploadDir, fileName)
    if _, err := os.Stat(filePath); err == nil {
        _ = os.Remove(filePath)
    }
}