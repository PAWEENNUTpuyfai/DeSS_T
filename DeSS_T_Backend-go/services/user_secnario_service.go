package services

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
)

// CreateUserScenario สร้าง Scenario ใหม่ โดยอ้างอิง Configuration Detail ของเดิม
func CreateUserScenario(input model_database.UserScenario) (model_database.UserScenario, error) {

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		
		// 1. สร้าง ID ใหม่ให้ UserScenario
		input.ID = uuid.New().String()

		if input.ScenarioDetail != nil {
			sd := input.ScenarioDetail
			
			// 2. สร้าง ID ใหม่ให้ Scenario Detail
			sd.ID = uuid.New().String()
			input.ScenarioDetailID = sd.ID

			// ✅ [สำคัญ] ตรวจสอบว่ามี ConfigurationDetailID (ของเก่า) ส่งมาด้วยหรือไม่
			if sd.ConfigurationDetailID == "" {
				return fmt.Errorf("ต้องระบุ configuration_detail_id ของเดิมมาด้วย")
			}

			// 🗺️ เตรียม Map สำหรับเก็บคู่ ID เก่า-ใหม่ ของ RoutePath (เอาไว้ให้ BusInfo อ้างอิง)
			routePathIDMap := make(map[string]string)

			// ==========================================
			// 3. จัดการ RouteScenario ก่อน (เพื่อสร้าง ID Map)
			// ==========================================
			if sd.RouteScenario != nil {
				rs := sd.RouteScenario
				rs.ID = uuid.New().String()
				sd.RouteScenarioID = rs.ID

				// เซฟ Header ของ Route Scenario
				if err := tx.Omit("ScenarioDetails", "RoutePaths").Create(rs).Error; err != nil {
					return err
				}

				for i := range rs.RoutePaths {
					rp := &rs.RoutePaths[i]
					
					oldRpID := rp.ID // เก็บ ID เก่าจาก JSON ("Route 1-scenario-...")
					newRpID := uuid.New().String() // Gen ID ใหม่เอี่ยม
					
					rp.ID = newRpID
					rp.RouteScenarioID = rs.ID
					
					// 🗺️ บันทึกลง Map
					routePathIDMap[oldRpID] = newRpID

					// แปลง Coordinates เป็น LineString WKT
					var points []string
					for _, coord := range rp.RouteJSON.Coordinates {
						points = append(points, fmt.Sprintf("%f %f", coord[0], coord[1]))
					}
					
					if len(points) > 0 {
						lineWKT := fmt.Sprintf("LINESTRING(%s)", strings.Join(points, ","))
						query := `INSERT INTO route_paths (id, name, color, route_scenario_id, route) VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326))`
						if err := tx.Exec(query, rp.ID, rp.Name, rp.Color, rp.RouteScenarioID, lineWKT).Error; err != nil {
							return fmt.Errorf("failed to save route geometry: %w", err)
						}
					}

					// จัดการ Orders ใน RoutePath
					for j := range rp.Orders {
						order := &rp.Orders[j]
						order.ID = uuid.New().String()
						order.RoutePathID = rp.ID
						
						// ✅ สังเกต: เราไม่เปลี่ยน order.StationPairID เพราะมันเป็นของเดิมใน Database อยู่แล้ว!
						if err := tx.Omit("RoutePath", "StationPair").Create(order).Error; err != nil {
							return err
						}
					}
				}
			}

			// ==========================================
			// 4. จัดการ BusScenario
			// ==========================================
			if sd.BusScenario != nil {
				bs := sd.BusScenario
				bs.ID = uuid.New().String()
				sd.BusScenarioID = bs.ID

				// เซฟ Header โดยข้ามลูกๆ ไปก่อน
				if err := tx.Omit("ScenarioDetails", "ScheduleDatas", "BusInformations").Create(bs).Error; err != nil {
					return err
				}

				// --- [เพิ่มส่วนนี้] จัดการ ScheduleDatas ---
				for i := range bs.ScheduleDatas {
					schedule := &bs.ScheduleDatas[i]
					schedule.ID = uuid.New().String()
					schedule.BusScenarioID = bs.ID

					// 🗺️ แมพ ID ของ RoutePath ให้ถูกต้อง
					if newRpID, exists := routePathIDMap[schedule.RoutePathID]; exists {
						schedule.RoutePathID = newRpID
					} else {
						// กรณีไม่เจอใน Map (อาจเป็นเพราะ JSON ส่ง ID ผิด)
						return fmt.Errorf("ไม่พบอ้างอิง route_path_id: %s ใน schedule_data", schedule.RoutePathID)
					}

					// บันทึกโดยตัด Pointer ทิ้ง
					if err := tx.Omit("RoutePath", "BusScenario").Create(schedule).Error; err != nil {
						return fmt.Errorf("failed to create schedule data: %w", err)
					}
				}
				// ----------------------------------------

	

				for i := range bs.BusInformations {
					info := &bs.BusInformations[i]
					info.ID = uuid.New().String()
					info.BusScenarioID = bs.ID

					// 🗺️ แมพ ID ของ RoutePath จากของเก่าเป็นของใหม่
					if newRpID, exists := routePathIDMap[info.RoutePathID]; exists {
						info.RoutePathID = newRpID
					} else {
						// กันเหนียว เผื่อ Frontend ส่ง RoutePathID มาผิด
						return fmt.Errorf("ไม่พบอ้างอิง route_path_id: %s ใน route_scenario", info.RoutePathID)
					}

					if err := tx.Omit("RoutePath", "BusScenario").Create(info).Error; err != nil {
						return err
					}
				}
			}

			// ==========================================
			// 5. บันทึก Scenario Detail
			// ==========================================
			if err := tx.Omit("BusScenario", "RouteScenario", "ConfigurationDetail").Create(sd).Error; err != nil {
				return err
			}
		}

		// ==========================================
		// 6. บันทึก User Scenario
		// ==========================================
		// ✅ อัปเดตบรรทัดนี้! เพิ่ม Omit("CreateByUser") เข้าไปให้ชัดเจน
		if err := tx.Omit("CoverImage", "CreateByUser", "ScenarioDetail").Create(&input).Error; err != nil {
			return fmt.Errorf("failed to create user_scenario: %w", err)
		}

		return nil
	})

	return input, err
}

func GetUserScenariosByUserID(userID string) ([]model_database.UserScenario, error) {
    var scenarios []model_database.UserScenario
    
    // ดึงเฉพาะข้อมูลพื้นฐานและหน้าปก (ไม่ดึง ScenarioDetail เพราะเราต้องการแค่ ID)
    err := config.DB.
        Preload("CoverImage").
        Where("create_by = ?", userID).
        Find(&scenarios).Error
        
    return scenarios, err
}

// parseWKTToGeoLineString แปลงข้อมูล ST_AsText (WKT) กลับเป็น GeoLineString
func parseWKTToGeoLineString(wkt string) models.GeoLineString {
	var coords [][2]float64

	// ตัดคำว่า LINESTRING( และ ) ออก
	wkt = strings.ReplaceAll(wkt, "LINESTRING(", "")
	wkt = strings.ReplaceAll(wkt, ")", "")

	// แยกแต่ละจุดด้วยลูกน้ำ
	points := strings.Split(wkt, ",")
	for _, p := range points {
		p = strings.TrimSpace(p)
		lonLat := strings.Split(p, " ") // แยก Lon กับ Lat ด้วยช่องว่าง
		if len(lonLat) == 2 {
			lon, _ := strconv.ParseFloat(lonLat[0], 64)
			lat, _ := strconv.ParseFloat(lonLat[1], 64)
			coords = append(coords, [2]float64{lon, lat})
		}
	}

	return models.GeoLineString{
		Type:        "LineString",
		Coordinates: coords,
	}
}

// GetScenarioDetailByID ดึงข้อมูลและ Map เข้าสู่ DTO Model พร้อมดึงชื่อ Configuration
func GetScenarioDetailByID(scenarioDetailID string) (models.ScenarioDetail, string, error) {
	var dbSD model_database.ScenarioDetail

	// 1. ดึงข้อมูล Scenario Detail
	err := config.DB.
		Preload("BusScenario").
		Preload("BusScenario.BusInformations").
		Preload("BusScenario.ScheduleDatas").
		Preload("RouteScenario").
		Preload("RouteScenario.RoutePaths").
		Preload("RouteScenario.RoutePaths.Orders").
		Preload("RouteScenario.RoutePaths.Orders.StationPair").
		Preload("RouteScenario.RoutePaths.Orders.StationPair.RouteBetween").
		First(&dbSD, "id = ?", scenarioDetailID).Error

	if err != nil {
		return models.ScenarioDetail{}, "", err // 👈 คืนค่า string ว่างไปก่อนถ้ามี Error
	}

	// 2. 🔍 ค้นหาชื่อ Configuration จาก ConfigurationDetailID
	var configName string
	var userConf model_database.UserConfiguration
	var publicConf model_database.PublicConfiguration

	// ลองหาใน User Configuration ก่อน
	if err := config.DB.Select("name").Where("configuration_detail_id = ?", dbSD.ConfigurationDetailID).First(&userConf).Error; err == nil {
		configName = userConf.Name
	} else {
		// ถ้าไม่เจอใน User ลองหาใน Public Configuration
		if err := config.DB.Select("name").Where("configuration_detail_id = ?", dbSD.ConfigurationDetailID).First(&publicConf).Error; err == nil {
			configName = publicConf.Name
		} else {
			// ถ้าไม่เจอเลย ก็ให้เป็นค่าว่าง หรือค่า Default
			configName = "Unknown Configuration"
		}
	}

	// 3. เริ่มขั้นตอน Mapping จาก model_database -> models (DTO) เหมือนเดิม
	response := models.ScenarioDetail{
		ScenarioDetailID:      dbSD.ID,
		BusScenarioID:         dbSD.BusScenarioID,
		RouteScenarioID:       dbSD.RouteScenarioID,
		ConfigurationDetailID: dbSD.ConfigurationDetailID,
	}

	// --- Map Bus Scenario (โค้ดเดิม) ---
	if dbSD.BusScenario != nil {
		var mappedBusInfos []models.BusInformation
		for _, info := range dbSD.BusScenario.BusInformations {
			mappedBusInfos = append(mappedBusInfos, models.BusInformation{
				BusInformationID: info.ID,
				Speed:            info.Speed,
				MaxDis:           info.MaxDis,
				MaxBus:           info.MaxBus,
				Capacity:         info.Capacity,
				BusScenarioID:    info.BusScenarioID,
				RoutePathID:      info.RoutePathID,
			})
		}

		var mappedSchedules []models.ScheduleData
		for _, sch := range dbSD.BusScenario.ScheduleDatas {
			mappedSchedules = append(mappedSchedules, models.ScheduleData{
				ScheduleDataID: sch.ID,
				ScheduleList:   sch.ScheduleList,
				RoutePathID:    sch.RoutePathID,
				BusScenarioID:  sch.BusScenarioID,
			})
		}

		response.BusScenario = models.BusScenario{
			BusScenarioID:   dbSD.BusScenario.ID,
			BusInformations: mappedBusInfos,
			ScheduleData:    mappedSchedules,
		}
	}

	// --- Map Route Scenario (โค้ดเดิม) ---
	if dbSD.RouteScenario != nil {
		var mappedRoutePaths []models.RoutePath

		for _, rp := range dbSD.RouteScenario.RoutePaths {
			var wktString string
			config.DB.Raw("SELECT ST_AsText(route) FROM route_paths WHERE id = ?", rp.ID).Scan(&wktString)

			var mappedOrders []models.Order
			for _, ord := range rp.Orders {
				mappedOrder := models.Order{
					OrderID:       ord.ID,
					Order:         ord.Order,
					StationPairID: ord.StationPairID,
					RoutePathID:   ord.RoutePathID,
				}

				if ord.StationPair != nil {
					sp := ord.StationPair
					mappedSP := models.StationPair{
						StationPairID:  sp.ID,
						FstStationID:   sp.FstStationID,
						SndStationID:   sp.SndStationID,
						RouteBetweenID: sp.RouteBetweenID,
						NetworkModelID: sp.NetworkModelID,
					}

					if sp.RouteBetween != nil {
						mappedSP.RouteBetween = models.RouteBetween{
							RouteBetweenID: sp.RouteBetween.ID,
							TravelTime:     sp.RouteBetween.TravelTime,
							Distance:       sp.RouteBetween.Distance,
						}
					}
					mappedOrder.StationPair = mappedSP
				}
				mappedOrders = append(mappedOrders, mappedOrder)
			}

			mappedRoutePaths = append(mappedRoutePaths, models.RoutePath{
				RoutePathID: rp.ID,
				Name:        rp.Name,
				Color:       rp.Color,
				Route:       parseWKTToGeoLineString(wktString), 
				Orders:      mappedOrders,
			})
		}

		response.RouteScenario = models.RouteScenario{
			RouteScenarioID: dbSD.RouteScenario.ID,
			RoutePaths:      mappedRoutePaths,
		}
	}

	// 🛠️ คืนค่า Response (DTO) และ ชื่อของ Configuration กลับไปพร้อมกัน
	return response, configName, nil
}
// DeleteUserScenarioByID ลบ User Scenario และข้อมูล Route/Bus ที่เกี่ยวข้องทั้งหมดแบบถอนรากถอนโคน
func DeleteUserScenarioByID(scenarioID string) error {
	var userScenario model_database.UserScenario

	// 1. ดึงข้อมูลพร้อม Preload เพื่อหา ID ของตัวลูกๆ (ScenarioDetail และ CoverImage)
	err := config.DB.
		Preload("CoverImage").
		Preload("ScenarioDetail").
		First(&userScenario, "id = ?", scenarioID).Error

	if err != nil {
		return err // ส่งกลับ Error ถ้าระบบไม่พบข้อมูล
	}

	// เตรียมชื่อไฟล์ไว้ลบจาก Disk
	var fileNameToDelete string
	if userScenario.CoverImage != nil {
		fileNameToDelete = userScenario.CoverImage.PathFile
	}

	// เก็บค่า ID ของลูกๆ ไว้ก่อนที่ตัวแม่จะถูกลบ
	scenarioDetailID := userScenario.ScenarioDetailID
	var busScenarioID, routeScenarioID string
	if userScenario.ScenarioDetail != nil {
		busScenarioID = userScenario.ScenarioDetail.BusScenarioID
		routeScenarioID = userScenario.ScenarioDetail.RouteScenarioID
	}

	// 2. เริ่ม Transaction ทำการลบแบบ Bottom-Up (รับประกันไม่ติด Foreign Key)
	err = config.DB.Transaction(func(tx *gorm.DB) error {

		// ก. ลบตาราง UserScenario ออกก่อน (เพื่อตัดสายใย Foreign Key)
		if err := tx.Delete(&userScenario).Error; err != nil {
			return err
		}

		// ข. ลบ ScenarioDetail
		if scenarioDetailID != "" {
			if err := tx.Delete(&model_database.ScenarioDetail{}, "id = ?", scenarioDetailID).Error; err != nil {
				return err
			}
		}

		// ค. กวาดลบฝั่ง Bus Scenario
		if busScenarioID != "" {
			// ลบข้อมูลลูกๆ ของ Bus ก่อน
			tx.Where("bus_scenario_id = ?", busScenarioID).Delete(&model_database.BusInformation{})
			tx.Where("bus_scenario_id = ?", busScenarioID).Delete(&model_database.ScheduleData{})
			
			// ลบ BusScenario ตัวแม่
			if err := tx.Delete(&model_database.BusScenario{}, "id = ?", busScenarioID).Error; err != nil {
				return err
			}
		}

		// ง. กวาดลบฝั่ง Route Scenario
		if routeScenarioID != "" {
			// ดึง RoutePath ทั้งหมดเพื่อไปตามลบ Order ข้างในก่อน
			var routePaths []model_database.RoutePath
			tx.Where("route_scenario_id = ?", routeScenarioID).Find(&routePaths)
			
			for _, rp := range routePaths {
				tx.Where("route_path_id = ?", rp.ID).Delete(&model_database.Order{})
			}

			// ลบ RoutePath
			tx.Where("route_scenario_id = ?", routeScenarioID).Delete(&model_database.RoutePath{})

			// ลบ RouteScenario ตัวแม่
			if err := tx.Delete(&model_database.RouteScenario{}, "id = ?", routeScenarioID).Error; err != nil {
				return err
			}
		}

		// จ. ลบ CoverImage (เฉพาะของโปรเจคนี้)
		if userScenario.CoverImgID != nil {
			tx.Delete(&model_database.CoverImageProject{}, "id = ?", *userScenario.CoverImgID)
		}

		return nil
	})

	// 3. หากลบข้อมูลใน DB สำเร็จ ให้ลบไฟล์รูปภาพออกจากโฟลเดอร์ในเซิร์ฟเวอร์
	if err == nil && fileNameToDelete != "" {
		deletePhysicalFile(fileNameToDelete)
	}

	return err
}
