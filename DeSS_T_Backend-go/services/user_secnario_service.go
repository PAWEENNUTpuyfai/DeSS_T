package services

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
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