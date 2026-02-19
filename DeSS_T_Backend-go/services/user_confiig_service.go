package services

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SaveUserConfiguration(input model_database.UserConfiguration) (model_database.UserConfiguration, error) {
	// ใช้ Transaction เพื่อความปลอดภัยของข้อมูล
	err := config.DB.Transaction(func(tx *gorm.DB) error {

		// --- 1. Generate New IDs ---
        input.ID = uuid.New().String()
        configDetail := &input.ConfigurationDetail
        configDetail.ID = uuid.New().String()
        input.ConfigurationDetailID = configDetail.ID

        netModel := &configDetail.NetworkModel
        netModel.ID = uuid.New().String()
        configDetail.NetworkModelID = netModel.ID

        // --- 2. บันทึก Network Model (เฉพาะ Header) ---
        // ใช้ Select() เพื่อระบุเลยว่าเอาแค่ฟิลด์พื้นฐาน ไม่เอาความสัมพันธ์
        if err := tx.Select("ID", "NetworkModelName").Create(netModel).Error; err != nil {
            return fmt.Errorf("failed to create network model: %w", err)
        }

        // --- 3. บันทึก StationDetails (SQL ดิบเพื่อรองรับ Geometry) ---
        stationIDMap := make(map[string]string)
        for i := range netModel.StationDetails {
            s := &netModel.StationDetails[i]
            oldID := s.ID
            newID := uuid.New().String()
            stationIDMap[oldID] = newID

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

            // Map ID สถานี (ต้องห้ามพลาด)
            if newFst, ok := stationIDMap[pair.FstStationID]; ok {
                pair.FstStationID = newFst
            } else {
                return fmt.Errorf("fst_station_id %s not found in mapping", pair.FstStationID)
            }
            
            if newSnd, ok := stationIDMap[pair.SndStationID]; ok {
                pair.SndStationID = newSnd
            } else {
                return fmt.Errorf("snd_station_id %s not found in mapping", pair.SndStationID)
            }

            pair.RouteBetween.ID = uuid.New().String()
            if err := tx.Create(&pair.RouteBetween).Error; err != nil {
                return err
            }
            pair.RouteBetweenID = pair.RouteBetween.ID

            // ✅ สำคัญ: Omit("FstStation", "SndStation") เพื่อไม่ให้ GORM ไปยุ่งกับ Object สถานีเดิม
            if err := tx.Omit("FstStation", "SndStation", "NetworkModel").Create(pair).Error; err != nil {
                return fmt.Errorf("failed to save station pair: %w", err)
            }
        }

        // --- 5. บันทึก Configuration Detail (ก่อนลูกๆ ตัวอื่น) ---
        // ❌ ลบคำสั่ง Create ซ้ำซ้อนออก เหลือแค่อันเดียวที่ Omit ลูกๆ ไว้
        if err := tx.Omit("AlightingData", "InterArrivalData", "ScenarioDetails", "NetworkModel").Create(configDetail).Error; err != nil {
            return fmt.Errorf("failed to create config detail: %w", err)
        }

        // --- 6. บันทึก Alighting & InterArrival (ใช้ Map ID สถานีด้วย) ---
		for i := range configDetail.AlightingData {
			d := &configDetail.AlightingData[i]
			d.ID = uuid.New().String()
			d.ConfigurationDetailID = configDetail.ID

			// 🔍 ตรวจสอบว่า ID เดิมที่ส่งมาคืออะไร (เอาไว้ Debug)
			oldStationID := d.StationDetailID 
			
			// ทำการ Map ID
			newStationID, ok := stationIDMap[oldStationID]
			if !ok || newStationID == "" {
				// ถ้า Map ไม่เจอ ให้ลองเช็คว่า d.StationDetailID มันว่างตั้งแต่แรกหรือไม่
				return fmt.Errorf("alighting_data: station_id '%s' not found in stationIDMap. check if JSON key matches", oldStationID)
			}
			
			d.StationDetailID = newStationID

			if err := tx.Omit("StationDetail", "ConfigurationDetail").Create(d).Error; err != nil {
				return fmt.Errorf("failed to create alighting data: %w", err)
			}
		}

		// ทำแบบเดียวกันกับ InterArrivalData
		for i := range configDetail.InterArrivalData {
			d := &configDetail.InterArrivalData[i]
			d.ID = uuid.New().String()
			d.ConfigurationDetailID = configDetail.ID

			newStationID, ok := stationIDMap[d.StationDetailID]
			if !ok || newStationID == "" {
				return fmt.Errorf("inter_arrival_data: station_id '%s' not found in stationIDMap", d.StationDetailID)
			}
			d.StationDetailID = newStationID

			if err := tx.Omit("StationDetail", "ConfigurationDetail").Create(d).Error; err != nil {
				return fmt.Errorf("failed to create inter arrival data: %w", err)
			}
		}
		
		// --- 7. จัดการ ScenarioDetails และ RoutePaths ---
		if input.ConfigurationDetail.ScenarioDetails != nil {
			for i := range input.ConfigurationDetail.ScenarioDetails {
				sd := &input.ConfigurationDetail.ScenarioDetails[i]
				sd.ID = uuid.New().String()
				sd.ConfigurationDetailID = input.ConfigurationDetail.ID

				// จัดการ RouteScenario ภายใน ScenarioDetail
				rs := &sd.RouteScenario
				rs.ID = uuid.New().String()
				sd.RouteScenarioID = rs.ID

				for j := range rs.RoutePaths {
					rp := &rs.RoutePaths[j]
					rp.ID = uuid.New().String()
					rp.RouteScenarioID = rs.ID

					// แปลง Coordinates เป็น LineString WKT
					var points []string
					for _, coord := range rp.RouteJSON.Coordinates {
						points = append(points, fmt.Sprintf("%f %f", coord[0], coord[1]))
					}
					lineWKT := fmt.Sprintf("LINESTRING(%s)", strings.Join(points, ","))

					query := `
						INSERT INTO route_paths (id, name, color, route_scenario_id, route)
						VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326))`

					if err := tx.Exec(query, rp.ID, rp.Name, rp.Color, rp.RouteScenarioID, lineWKT).Error; err != nil {
						return fmt.Errorf("failed to save route path %s: %w", rp.Name, err)
					}
				}

				if err := tx.Create(rs).Error; err != nil {
					return err
				}
				
				// ต้องมี BusScenario ด้วยตามความสัมพันธ์
				sd.BusScenario.ID = uuid.New().String()
				if err := tx.Create(&sd.BusScenario).Error; err != nil {
					return err
				}
				sd.BusScenarioID = sd.BusScenario.ID

				if err := tx.Create(sd).Error; err != nil {
					return err
				}
			}
		}


		// --- 8. บันทึก UserConfiguration (ตัวสุดท้าย) ---
        if err := tx.Omit("ConfigurationDetail", "CoverImage", "CreateByUser").Create(&input).Error; err != nil {
            return err
        }

		return nil
	})

	return input, err
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