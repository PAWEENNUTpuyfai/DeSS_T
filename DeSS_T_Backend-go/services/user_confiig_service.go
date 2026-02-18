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

		// --- 1. Generate New IDs (เหมือนเดิม) ---
		input.ID = uuid.New().String()
		input.ConfigurationDetail.ID = uuid.New().String()
		input.ConfigurationDetailID = input.ConfigurationDetail.ID

		netModel := &input.ConfigurationDetail.NetworkModel
		netModel.ID = uuid.New().String()
		input.ConfigurationDetail.NetworkModelID = netModel.ID

		// ✅ --- 2. บันทึก Network Model Header (เฉพาะตัวมันเอง) ---
		// ใช้ Omit("StationPairs", "StationDetails") เพื่อไม่ให้ GORM แอบบันทึกลูกที่ยังจัดการ ID ไม่เสร็จ
		if err := tx.Omit("StationPairs", "StationDetails").Create(netModel).Error; err != nil {
			return fmt.Errorf("failed to create network model: %w", err)
		}

		// --- 3. บันทึก StationDetails (Geometry: Point) ---
		stationIDMap := make(map[string]string)
		for i := range netModel.StationDetails {
			station := &netModel.StationDetails[i]
			oldID := station.ID
			newID := uuid.New().String()
			stationIDMap[oldID] = newID

			station.ID = newID
			station.NetworkModelID = netModel.ID 
			
			lon := station.LocationJSON.Coordinates[0]
			lat := station.LocationJSON.Coordinates[1]
			pointWKT := fmt.Sprintf("POINT(%f %f)", lon, lat)

			query := `
				INSERT INTO station_details (id, station_name, network_model_id, lat, lon, station_id_osm, location)
				VALUES (?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326))`
			
			if err := tx.Exec(query, station.ID, station.Name, station.NetworkModelID, station.Lat, station.Lon, station.StationIDOSM, pointWKT).Error; err != nil {
				return fmt.Errorf("failed to save station %s: %w", station.Name, err)
			}
		}

		// --- 4. บันทึก StationPair & RouteBetween ---
		for i := range netModel.StationPairs {
			pair := &netModel.StationPairs[i]
			pair.ID = uuid.New().String()
			pair.NetworkModelID = netModel.ID

			// ✅ สำคัญ: เปลี่ยน ID สถานีให้เป็น ID ใหม่ที่บันทึกลง DB ไปแล้ว
			if newFst, ok := stationIDMap[pair.FstStationID]; ok {
				pair.FstStationID = newFst
			}
			if newSnd, ok := stationIDMap[pair.SndStationID]; ok {
				pair.SndStationID = newSnd
			}

			// RouteBetween
			pair.RouteBetween.ID = uuid.New().String()
			if err := tx.Create(&pair.RouteBetween).Error; err != nil {
				return err
			}
			pair.RouteBetweenID = pair.RouteBetween.ID

			// บันทึก StationPair (ตอนนี้ FstStationID และ SndStationID ถูกต้องแล้ว)
			if err := tx.Create(pair).Error; err != nil {
				return fmt.Errorf("failed to save station pair %s: %w", pair.ID, err)
			}
		}

		// --- 5. จัดการ RoutePaths ใน Scenario (Geometry: LineString) ---
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

		// --- 6. บันทึกข้อมูล AlightingData & InterArrivalData ---
		for i := range input.ConfigurationDetail.AlightingData {
			data := &input.ConfigurationDetail.AlightingData[i]
			data.ID = uuid.New().String()
			data.ConfigurationDetailID = input.ConfigurationDetail.ID
			if newStation, ok := stationIDMap[data.StationDetailID]; ok {
				data.StationDetailID = newStation
			}
			if err := tx.Create(data).Error; err != nil {
				return err
			}
		}

		for i := range input.ConfigurationDetail.InterArrivalData {
			data := &input.ConfigurationDetail.InterArrivalData[i]
			data.ID = uuid.New().String()
			data.ConfigurationDetailID = input.ConfigurationDetail.ID
			if newStation, ok := stationIDMap[data.StationDetailID]; ok {
				data.StationDetailID = newStation
			}
			if err := tx.Create(data).Error; err != nil {
				return err
			}
		}

		// --- 7. บันทึก Configuration Detail & User Configuration (Final) ---
		if err := tx.Create(&input.ConfigurationDetail).Error; err != nil {
			return err
		}

		if err := tx.Create(&input).Error; err != nil {
			return err
		}

		return nil
	})

	return input, err
}