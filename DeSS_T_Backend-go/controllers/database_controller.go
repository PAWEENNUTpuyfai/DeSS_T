package controllers

import (
	"DeSS_T_Backend-go/models"
	"DeSS_T_Backend-go/services"

	"github.com/gofiber/fiber/v2"
)

func CreateGoogleUser(c *fiber.Ctx) error {
	var userInput models.User
	if err := c.BodyParser(&userInput); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	user, err := services.CreateOrUpdateGoogleUser(userInput)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to save user", "detail": err.Error()})
	}
	return c.JSON(user)
}

func GetGoogleUsers(c *fiber.Ctx) error {
	users, err := services.GetGoogleUsers()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch users", "detail": err.Error()})
	}
	return c.JSON(users)
}

// UploadConfigurationCoverImg อัปโหลดรูปปกสำหรับการกำหนดค่า และเก็บลงฐานข้อมูล
func UploadConfigurationCoverImg(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "file missing"})
	}

	response, err := services.SaveConfigurationCoverImage(
		fileHeader,
		c.Protocol(),
		c.Hostname(),
		c.SaveFile,
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to upload cover image", "detail": err.Error()})
	}

	return c.Status(201).JSON(response)
}

// func GetUserConfigurations(c *fiber.Ctx) error {
// 	userID := c.Params("user_id")
// 	if userID == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "user_id is required"})
// 	}

// 	var userConfigurations []model_database.UserConfiguration
// 	result := config.DB.
// 		Where("create_by = ?", userID).
// 		Preload("CoverImage").
// 		Preload("ConfigurationDetail").
// 		Find(&userConfigurations)

// 	if result.Error != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch user configurations", "detail": result.Error.Error()})
// 	}

// 	return c.JSON(userConfigurations)
// }

// // CreateUserConfiguration สร้าง UserConfiguration พร้อม ConfigurationDetail ลงฐานข้อมูล
// func CreateUserConfiguration(c *fiber.Ctx) error {
// 	var req models.UserConfiguration
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(400).JSON(fiber.Map{"error": "Invalid input", "detail": err.Error()})
// 	}

// 	// Validate required fields
// 	if req.Name == "" || req.CreateBy == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "name and create_by are required"})
// 	}

// 	// Start transaction
// 	tx := config.DB.WithContext(c.Context()).Begin()

// 	// Generate IDs if not provided
// 	configDetailID := req.ConfigurationDetailID
// 	if configDetailID == "" {
// 		configDetailID = uuid.New().String()
// 	}

// 	userConfigID := req.UserConfigurationID
// 	if userConfigID == "" {
// 		userConfigID = uuid.New().String()
// 	}

// 	// 1. Create ConfigurationDetail
// 	networkModelID := req.ConfigurationDetail.NetworkModelID
// 	if networkModelID == "" && req.ConfigurationDetail.NetworkModel.NetworkModelID != "" {
// 		networkModelID = req.ConfigurationDetail.NetworkModel.NetworkModelID
// 	}
// 	if networkModelID == "" {
// 		networkModelID = uuid.New().String()
// 	}

// 	var existingNetworkModel model_database.NetworkModel
// 	result := tx.Where("network_model_id = ?", networkModelID).Limit(1).Find(&existingNetworkModel)
// 	if result.Error != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to query network model", "detail": result.Error.Error()})
// 	}
// 	if result.RowsAffected == 0 {
// 		newNetworkModel := model_database.NetworkModel{NetworkModelID: networkModelID}
// 		if err := tx.Create(&newNetworkModel).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to create network model", "detail": err.Error()})
// 		}
// 	}

// 	configDetail := model_database.ConfigurationDetail{
// 		ConfigurationDetailID: configDetailID,
// 		NetworkModelID:        networkModelID,
// 	}

// 	if err := tx.Create(&configDetail).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to create configuration detail", "detail": err.Error()})
// 	}

// 	if len(req.ConfigurationDetail.NetworkModel.StationDetails) > 0 {
// 		for _, station := range req.ConfigurationDetail.NetworkModel.StationDetails {
// 			stationDetailID := station.StationDetailID
// 			if stationDetailID == "" && station.StationID != "" {
// 				stationDetailID = station.StationID
// 			}
// 			if stationDetailID == "" {
// 				tx.Rollback()
// 				return c.Status(400).JSON(fiber.Map{"error": "station_detail_id is required"})
// 			}

// 			var existingStation model_database.StationDetail
// 			result := tx.Where("station_detail_id = ?", stationDetailID).Limit(1).Find(&existingStation)
// 			if result.Error != nil {
// 				tx.Rollback()
// 				return c.Status(500).JSON(fiber.Map{"error": "failed to query station detail", "detail": result.Error.Error()})
// 			}
// 			if result.RowsAffected == 0 {
// 				name := station.Name
// 				if name == "" {
// 					name = station.StationName
// 				}
// 				newStation := model_database.StationDetail{
// 					StationDetailID: stationDetailID,
// 					Name:            name,
// 					Location: model_database.GeoPoint{
// 						Type:        station.Location.Type,
// 						Coordinates: station.Location.Coordinates,
// 					},
// 					Lat:          station.Lat,
// 					Lon:          station.Lon,
// 					StationIDOSM: station.StationIDOSM,
// 				}
// 				if err := tx.Create(&newStation).Error; err != nil {
// 					tx.Rollback()
// 					return c.Status(500).JSON(fiber.Map{"error": "failed to create station detail", "detail": err.Error()})
// 				}
// 			}
// 		}
// 	}

// 	if len(req.ConfigurationDetail.NetworkModel.StationPairs) > 0 {
// 		for _, pair := range req.ConfigurationDetail.NetworkModel.StationPairs {
// 			routeBetweenID := pair.RouteBetweenID
// 			if routeBetweenID == "" && pair.RouteBetween.RouteBetweenID != "" {
// 				routeBetweenID = pair.RouteBetween.RouteBetweenID
// 			}
// 			if routeBetweenID == "" {
// 				routeBetweenID = uuid.New().String()
// 			}

// 			var existingRouteBetween model_database.RouteBetween
// 			result := tx.Where("route_between_id = ?", routeBetweenID).Limit(1).Find(&existingRouteBetween)
// 			if result.Error != nil {
// 				tx.Rollback()
// 				return c.Status(500).JSON(fiber.Map{"error": "failed to query route between", "detail": result.Error.Error()})
// 			}
// 			if result.RowsAffected == 0 {
// 				newRouteBetween := model_database.RouteBetween{
// 					RouteBetweenID: routeBetweenID,
// 					TravelTime:     pair.RouteBetween.TravelTime,
// 					Distance:       pair.RouteBetween.Distance,
// 				}
// 				if err := tx.Create(&newRouteBetween).Error; err != nil {
// 					tx.Rollback()
// 					return c.Status(500).JSON(fiber.Map{"error": "failed to create route between", "detail": err.Error()})
// 				}
// 			}

// 			stationPairID := pair.StationPairID
// 			if stationPairID == "" {
// 				stationPairID = uuid.New().String()
// 			}

// 			var existingPair model_database.StationPair
// 			result = tx.Where("station_pair_id = ?", stationPairID).Limit(1).Find(&existingPair)
// 			if result.Error != nil {
// 				tx.Rollback()
// 				return c.Status(500).JSON(fiber.Map{"error": "failed to query station pair", "detail": result.Error.Error()})
// 			}
// 			if result.RowsAffected == 0 {
// 				newPair := model_database.StationPair{
// 					StationPairID:  stationPairID,
// 					FstStationID:   pair.FstStationID,
// 					SndStationID:   pair.SndStationID,
// 					RouteBetweenID: routeBetweenID,
// 					NetworkModelID: networkModelID,
// 				}
// 				if err := tx.Create(&newPair).Error; err != nil {
// 					tx.Rollback()
// 					return c.Status(500).JSON(fiber.Map{"error": "failed to create station pair", "detail": err.Error()})
// 				}
// 			}
// 		}
// 	}

// 	stationIDSet := make(map[string]struct{})
// 	for _, alighting := range req.ConfigurationDetail.AlightingData {
// 		if alighting.StationID != "" {
// 			stationIDSet[alighting.StationID] = struct{}{}
// 		}
// 	}
// 	for _, interArrival := range req.ConfigurationDetail.InterArrivalData {
// 		if interArrival.StationID != "" {
// 			stationIDSet[interArrival.StationID] = struct{}{}
// 		}
// 	}

// 	if len(stationIDSet) > 0 {
// 		stationIDs := make([]string, 0, len(stationIDSet))
// 		for stationID := range stationIDSet {
// 			stationIDs = append(stationIDs, stationID)
// 		}

// 		var existingStations []model_database.StationDetail
// 		if err := tx.Where("station_detail_id IN ?", stationIDs).Find(&existingStations).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to query station details", "detail": err.Error()})
// 		}

// 		found := make(map[string]struct{}, len(existingStations))
// 		for _, station := range existingStations {
// 			found[station.StationDetailID] = struct{}{}
// 		}

// 		missing := make([]string, 0)
// 		for stationID := range stationIDSet {
// 			if _, ok := found[stationID]; !ok {
// 				missing = append(missing, stationID)
// 			}
// 		}
// 		if len(missing) > 0 {
// 			tx.Rollback()
// 			return c.Status(400).JSON(fiber.Map{"error": "station not found", "missing_station_ids": missing})
// 		}
// 	}

// 	// 2. Create AlightingData records
// 	for _, alighting := range req.ConfigurationDetail.AlightingData {
// 		alightingData := model_database.AlightingData{
// 			AlightingDataID:       uuid.New().String(),
// 			ConfigurationDetailID: configDetailID,
// 			TimePeriod:            alighting.TimePeriod,
// 			Distribution:          alighting.Distribution,
// 			ArgumentList:          alighting.ArgumentList,
// 			StationID:             alighting.StationID,
// 		}
// 		if err := tx.Create(&alightingData).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to create alighting data", "detail": err.Error()})
// 		}
// 	}

// 	// 3. Create InterArrivalData records
// 	for _, interArrival := range req.ConfigurationDetail.InterArrivalData {
// 		interArrivalData := model_database.InterArrivalData{
// 			InterArrivalDataID:    uuid.New().String(),
// 			ConfigurationDetailID: configDetailID,
// 			TimePeriod:            interArrival.TimePeriod,
// 			Distribution:          interArrival.Distribution,
// 			ArgumentList:          interArrival.ArgumentList,
// 			StationID:             interArrival.StationID,
// 		}
// 		if err := tx.Create(&interArrivalData).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to create inter arrival data", "detail": err.Error()})
// 		}
// 	}

// 	// 4. Create UserConfiguration
// 	// Handle empty CoverImgID - convert empty string to nil pointer
// 	var coverImgID *string
// 	if req.CoverImgID != "" {
// 		coverImgID = &req.CoverImgID
// 	}

// 	userConfig := model_database.UserConfiguration{
// 		UserConfigurationID:   userConfigID,
// 		Name:                  req.Name,
// 		ModifyDate:            time.Now(),
// 		CreateBy:              req.CreateBy,
// 		CoverImgID:            coverImgID,
// 		ConfigurationDetailID: configDetailID,
// 	}

// 	if err := tx.Create(&userConfig).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to create user configuration", "detail": err.Error()})
// 	}

// 	// Commit transaction
// 	if err := tx.Commit().Error; err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to commit transaction", "detail": err.Error()})
// 	}

// 	return c.Status(201).JSON(fiber.Map{
// 		"message":                 "User configuration created successfully",
// 		"user_configuration_id":   userConfigID,
// 		"configuration_detail_id": configDetailID,
// 	})
// }

// // UpdateUserConfiguration อัปเดต UserConfiguration พร้อม ConfigurationDetail
// func UpdateUserConfiguration(c *fiber.Ctx) error {
// 	userConfigID := c.Params("id")
// 	if userConfigID == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
// 	}

// 	var req models.UserConfiguration
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(400).JSON(fiber.Map{"error": "Invalid input", "detail": err.Error()})
// 	}

// 	// Validate required fields
// 	if req.Name == "" || req.CreateBy == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "name and create_by are required"})
// 	}

// 	// Check if UserConfiguration exists
// 	var existingConfig model_database.UserConfiguration
// 	if err := config.DB.First(&existingConfig, "user_configuration_id = ?", userConfigID).Error; err != nil {
// 		return c.Status(404).JSON(fiber.Map{"error": "user configuration not found"})
// 	}

// 	// Start transaction
// 	tx := config.DB.WithContext(c.Context()).Begin()

// 	// Get or use existing ConfigurationDetailID
// 	configDetailID := existingConfig.ConfigurationDetailID
// 	if req.ConfigurationDetailID != "" {
// 		configDetailID = req.ConfigurationDetailID
// 	}

// 	// 1. Update ConfigurationDetail
// 	networkModelID := req.ConfigurationDetail.NetworkModelID
// 	if networkModelID == "" && req.ConfigurationDetail.NetworkModel.NetworkModelID != "" {
// 		networkModelID = req.ConfigurationDetail.NetworkModel.NetworkModelID
// 	}
// 	if networkModelID == "" {
// 		var existingDetail model_database.ConfigurationDetail
// 		if err := tx.First(&existingDetail, "configuration_detail_id = ?", configDetailID).Error; err != nil {
// 			tx.Rollback()
// 			if errors.Is(err, gorm.ErrRecordNotFound) {
// 				return c.Status(404).JSON(fiber.Map{"error": "configuration detail not found"})
// 			}
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to load configuration detail", "detail": err.Error()})
// 		}
// 		networkModelID = existingDetail.NetworkModelID
// 	}

// 	configDetail := model_database.ConfigurationDetail{
// 		ConfigurationDetailID: configDetailID,
// 		NetworkModelID:        networkModelID,
// 	}

// 	if err := tx.Model(&configDetail).Updates(configDetail).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to update configuration detail", "detail": err.Error()})
// 	}

// 	if len(req.ConfigurationDetail.NetworkModel.StationDetails) > 0 {
// 		for _, station := range req.ConfigurationDetail.NetworkModel.StationDetails {
// 			stationDetailID := station.StationDetailID
// 			if stationDetailID == "" && station.StationID != "" {
// 				stationDetailID = station.StationID
// 			}
// 			if stationDetailID == "" {
// 				tx.Rollback()
// 				return c.Status(400).JSON(fiber.Map{"error": "station_detail_id is required"})
// 			}

// 			var existingStation model_database.StationDetail
// 			result := tx.Where("station_detail_id = ?", stationDetailID).Limit(1).Find(&existingStation)
// 			if result.Error != nil {
// 				tx.Rollback()
// 				return c.Status(500).JSON(fiber.Map{"error": "failed to query station detail", "detail": result.Error.Error()})
// 			}
// 			if result.RowsAffected == 0 {
// 				name := station.Name
// 				if name == "" {
// 					name = station.StationName
// 				}
// 				newStation := model_database.StationDetail{
// 					StationDetailID: stationDetailID,
// 					Name:            name,
// 					Location: model_database.GeoPoint{
// 						Type:        station.Location.Type,
// 						Coordinates: station.Location.Coordinates,
// 					},
// 					Lat:          station.Lat,
// 					Lon:          station.Lon,
// 					StationIDOSM: station.StationIDOSM,
// 				}
// 				if err := tx.Create(&newStation).Error; err != nil {
// 					tx.Rollback()
// 					return c.Status(500).JSON(fiber.Map{"error": "failed to create station detail", "detail": err.Error()})
// 				}
// 			}
// 		}
// 	}

// 	if len(req.ConfigurationDetail.NetworkModel.StationPairs) > 0 {
// 		for _, pair := range req.ConfigurationDetail.NetworkModel.StationPairs {
// 			routeBetweenID := pair.RouteBetweenID
// 			if routeBetweenID == "" && pair.RouteBetween.RouteBetweenID != "" {
// 				routeBetweenID = pair.RouteBetween.RouteBetweenID
// 			}
// 			if routeBetweenID == "" {
// 				routeBetweenID = uuid.New().String()
// 			}

// 			var existingRouteBetween model_database.RouteBetween
// 			result := tx.Where("route_between_id = ?", routeBetweenID).Limit(1).Find(&existingRouteBetween)
// 			if result.Error != nil {
// 				tx.Rollback()
// 				return c.Status(500).JSON(fiber.Map{"error": "failed to query route between", "detail": result.Error.Error()})
// 			}
// 			if result.RowsAffected == 0 {
// 				newRouteBetween := model_database.RouteBetween{
// 					RouteBetweenID: routeBetweenID,
// 					TravelTime:     pair.RouteBetween.TravelTime,
// 					Distance:       pair.RouteBetween.Distance,
// 				}
// 				if err := tx.Create(&newRouteBetween).Error; err != nil {
// 					tx.Rollback()
// 					return c.Status(500).JSON(fiber.Map{"error": "failed to create route between", "detail": err.Error()})
// 				}
// 			}

// 			stationPairID := pair.StationPairID
// 			if stationPairID == "" {
// 				stationPairID = uuid.New().String()
// 			}

// 			var existingPair model_database.StationPair
// 			result = tx.Where("station_pair_id = ?", stationPairID).Limit(1).Find(&existingPair)
// 			if result.Error != nil {
// 				tx.Rollback()
// 				return c.Status(500).JSON(fiber.Map{"error": "failed to query station pair", "detail": result.Error.Error()})
// 			}
// 			if result.RowsAffected == 0 {
// 				newPair := model_database.StationPair{
// 					StationPairID:  stationPairID,
// 					FstStationID:   pair.FstStationID,
// 					SndStationID:   pair.SndStationID,
// 					RouteBetweenID: routeBetweenID,
// 					NetworkModelID: networkModelID,
// 				}
// 				if err := tx.Create(&newPair).Error; err != nil {
// 					tx.Rollback()
// 					return c.Status(500).JSON(fiber.Map{"error": "failed to create station pair", "detail": err.Error()})
// 				}
// 			}
// 		}
// 	}

// 	stationIDSet := make(map[string]struct{})
// 	for _, alighting := range req.ConfigurationDetail.AlightingData {
// 		if alighting.StationID != "" {
// 			stationIDSet[alighting.StationID] = struct{}{}
// 		}
// 	}
// 	for _, interArrival := range req.ConfigurationDetail.InterArrivalData {
// 		if interArrival.StationID != "" {
// 			stationIDSet[interArrival.StationID] = struct{}{}
// 		}
// 	}

// 	if len(stationIDSet) > 0 {
// 		stationIDs := make([]string, 0, len(stationIDSet))
// 		for stationID := range stationIDSet {
// 			stationIDs = append(stationIDs, stationID)
// 		}

// 		var existingStations []model_database.StationDetail
// 		if err := tx.Where("station_detail_id IN ?", stationIDs).Find(&existingStations).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to query station details", "detail": err.Error()})
// 		}

// 		found := make(map[string]struct{}, len(existingStations))
// 		for _, station := range existingStations {
// 			found[station.StationDetailID] = struct{}{}
// 		}

// 		missing := make([]string, 0)
// 		for stationID := range stationIDSet {
// 			if _, ok := found[stationID]; !ok {
// 				missing = append(missing, stationID)
// 			}
// 		}
// 		if len(missing) > 0 {
// 			tx.Rollback()
// 			return c.Status(400).JSON(fiber.Map{"error": "station not found", "missing_station_ids": missing})
// 		}
// 	}

// 	// 2. Delete old AlightingData and create new ones
// 	if err := tx.Where("configuration_detail_id = ?", configDetailID).Delete(&model_database.AlightingData{}).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to delete old alighting data", "detail": err.Error()})
// 	}

// 	for _, alighting := range req.ConfigurationDetail.AlightingData {
// 		alightingData := model_database.AlightingData{
// 			AlightingDataID:       uuid.New().String(),
// 			ConfigurationDetailID: configDetailID,
// 			TimePeriod:            alighting.TimePeriod,
// 			Distribution:          alighting.Distribution,
// 			ArgumentList:          alighting.ArgumentList,
// 			StationID:             alighting.StationID,
// 		}
// 		if err := tx.Create(&alightingData).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to create alighting data", "detail": err.Error()})
// 		}
// 	}

// 	// 3. Delete old InterArrivalData and create new ones
// 	if err := tx.Where("configuration_detail_id = ?", configDetailID).Delete(&model_database.InterArrivalData{}).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to delete old inter arrival data", "detail": err.Error()})
// 	}

// 	for _, interArrival := range req.ConfigurationDetail.InterArrivalData {
// 		interArrivalData := model_database.InterArrivalData{
// 			InterArrivalDataID:    uuid.New().String(),
// 			ConfigurationDetailID: configDetailID,
// 			TimePeriod:            interArrival.TimePeriod,
// 			Distribution:          interArrival.Distribution,
// 			ArgumentList:          interArrival.ArgumentList,
// 			StationID:             interArrival.StationID,
// 		}
// 		if err := tx.Create(&interArrivalData).Error; err != nil {
// 			tx.Rollback()
// 			return c.Status(500).JSON(fiber.Map{"error": "failed to create inter arrival data", "detail": err.Error()})
// 		}
// 	}

// 	// 4. Update UserConfiguration
// 	updateData := map[string]interface{}{
// 		"name":                    req.Name,
// 		"modify_date":             time.Now(),
// 		"create_by":               req.CreateBy,
// 		"cover_img_id":            req.CoverImgID,
// 		"configuration_detail_id": configDetailID,
// 	}

// 	if err := tx.Model(&existingConfig).Updates(updateData).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to update user configuration", "detail": err.Error()})
// 	}

// 	// Commit transaction
// 	if err := tx.Commit().Error; err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to commit transaction", "detail": err.Error()})
// 	}

// 	return c.JSON(fiber.Map{
// 		"message":                 "User configuration updated successfully",
// 		"user_configuration_id":   userConfigID,
// 		"configuration_detail_id": configDetailID,
// 	})
// }

// // DeleteUserConfiguration ลบ UserConfiguration พร้อม ConfigurationDetail ที่เกี่ยวข้อง
// func DeleteUserConfiguration(c *fiber.Ctx) error {
// 	userConfigID := c.Params("id")
// 	if userConfigID == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
// 	}

// 	// Check if UserConfiguration exists
// 	var existingConfig model_database.UserConfiguration
// 	if err := config.DB.First(&existingConfig, "user_configuration_id = ?", userConfigID).Error; err != nil {
// 		return c.Status(404).JSON(fiber.Map{"error": "user configuration not found"})
// 	}

// 	// Start transaction
// 	tx := config.DB.WithContext(c.Context()).Begin()

// 	// Delete UserConfiguration (will cascade delete due to foreign key constraint)
// 	if err := tx.Delete(&existingConfig).Error; err != nil {
// 		tx.Rollback()
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to delete user configuration", "detail": err.Error()})
// 	}

// 	// Commit transaction
// 	if err := tx.Commit().Error; err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to commit transaction", "detail": err.Error()})
// 	}

// 	return c.JSON(fiber.Map{
// 		"message":               "User configuration deleted successfully",
// 		"user_configuration_id": userConfigID,
// 	})
// }

// // GetConfigurationDetails ดึง ConfigurationDetail พร้อมข้อมูล AlightingData และ InterArrivalData
// func GetConfigurationDetails(c *fiber.Ctx) error {
// 	configDetailID := c.Params("id")
// 	if configDetailID == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
// 	}

// 	var configDetail model_database.ConfigurationDetail
// 	result := config.DB.
// 		Where("configuration_detail_id = ?", configDetailID).
// 		Preload("NetworkModel").
// 		Preload("AlightingData").
// 		Preload("InterArrivalData").
// 		First(&configDetail)

// 	if result.Error != nil {
// 		return c.Status(404).JSON(fiber.Map{"error": "configuration detail not found"})
// 	}

// 	return c.JSON(configDetail)
// }

// // GetUserScenarios ดึงสถานการณ์ทั้งหมดที่สร้างโดยผู้ใช้
// func GetUserScenarios(c *fiber.Ctx) error {
// 	userID := c.Params("user_id")
// 	if userID == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "user_id is required"})
// 	}

// 	var userScenarios []model_database.UserScenario
// 	result := config.DB.
// 		Where("create_by = ?", userID).
// 		Preload("CoverImage").
// 		Preload("ScenarioDetail").
// 		Find(&userScenarios)

// 	if result.Error != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch user scenarios", "detail": result.Error.Error()})
// 	}

// 	return c.JSON(userScenarios)
// }

// // // CreateUserScenario สร้าง UserScenario พร้อม ScenarioDetail ลงฐานข้อมูล
// // func CreateUserScenario(c *fiber.Ctx) error {
// // 	var req models.UserScenario
// // 	if err := c.BodyParser(&req); err != nil {
// // 		return c.Status(400).JSON(fiber.Map{"error": "Invalid input", "detail": err.Error()})
// // 	}

// // 	// Validate required fields
// // 	if req.Name == "" || req.CreateBy == "" {
// // 		return c.Status(400).JSON(fiber.Map{"error": "name and create_by are required"})
// // 	}

// // 	// Start transaction
// // 	tx := config.DB.WithContext(c.Context()).Begin()

// // 	// Generate IDs if not provided
// // 	scenarioDetailID := req.ScenarioDetailID
// // 	if scenarioDetailID == "" {
// // 		scenarioDetailID = uuid.New().String()
// // 	}

// // 	userScenarioID := req.UserScenarioID
// // 	if userScenarioID == "" {
// // 		userScenarioID = uuid.New().String()
// // 	}

// // 	// 1. Create BusScenario
// // 	busScenarioID := uuid.New().String()
// // 	busScenario := model_database.BusScenario{
// // 		BusScenarioID: busScenarioID,
// // 	}

// // 	if err := tx.Create(&busScenario).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to create bus scenario", "detail": err.Error()})
// // 	}

// // 	// 2. Create RouteScenario
// // 	routeScenarioID := uuid.New().String()
// // 	routeScenario := model_database.RouteScenario{
// // 		RouteScenarioID: routeScenarioID,
// // 	}

// // 	if err := tx.Create(&routeScenario).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to create route scenario", "detail": err.Error()})
// // 	}

// // 	// 3. Create ScenarioDetail
// // 	scenarioDetail := model_database.ScenarioDetail{
// // 		ScenarioDetailID:      scenarioDetailID,
// // 		BusScenarioID:         busScenarioID,
// // 		RouteScenarioID:       routeScenarioID,
// // 		ConfigurationDetailID: req.ScenarioDetail.ConfigurationDetailID,
// // 	}

// // 	if err := tx.Create(&scenarioDetail).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to create scenario detail", "detail": err.Error()})
// // 	}

// // 	// 4. Create UserScenario
// // 	userScenario := model_database.UserScenario{
// // 		UserScenarioID:   userScenarioID,
// // 		Name:             req.Name,
// // 		ModifyDate:       time.Now(),
// // 		CreateBy:         req.CreateBy,
// // 		CoverImgID:       req.CoverImgID,
// // 		ScenarioDetailID: scenarioDetailID,
// // 	}

// // 	if err := tx.Create(&userScenario).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to create user scenario", "detail": err.Error()})
// // 	}

// // 	// Commit transaction
// // 	if err := tx.Commit().Error; err != nil {
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to commit transaction", "detail": err.Error()})
// // 	}

// // 	return c.Status(201).JSON(fiber.Map{
// // 		"message":           "User scenario created successfully",
// // 		"user_scenario_id":  userScenarioID,
// // 		"scenario_detail_id": scenarioDetailID,
// // 	})
// // }

// // // UpdateUserScenario อัปเดต UserScenario พร้อม ScenarioDetail
// // func UpdateUserScenario(c *fiber.Ctx) error {
// // 	userScenarioID := c.Params("id")
// // 	if userScenarioID == "" {
// // 		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
// // 	}

// // 	var req models.UserScenario
// // 	if err := c.BodyParser(&req); err != nil {
// // 		return c.Status(400).JSON(fiber.Map{"error": "Invalid input", "detail": err.Error()})
// // 	}

// // 	// Validate required fields
// // 	if req.Name == "" || req.CreateBy == "" {
// // 		return c.Status(400).JSON(fiber.Map{"error": "name and create_by are required"})
// // 	}

// // 	// Check if UserScenario exists
// // 	var existingScenario model_database.UserScenario
// // 	if err := config.DB.First(&existingScenario, "user_scenario_id = ?", userScenarioID).Error; err != nil {
// // 		return c.Status(404).JSON(fiber.Map{"error": "user scenario not found"})
// // 	}

// // 	// Start transaction
// // 	tx := config.DB.WithContext(c.Context()).Begin()

// // 	// Get or use existing ScenarioDetailID
// // 	scenarioDetailID := existingScenario.ScenarioDetailID
// // 	if req.ScenarioDetailID != "" {
// // 		scenarioDetailID = req.ScenarioDetailID
// // 	}

// // 	// 1. Update ScenarioDetail
// // 	scenarioDetail := model_database.ScenarioDetail{
// // 		ScenarioDetailID:      scenarioDetailID,
// // 		ConfigurationDetailID: req.ScenarioDetail.ConfigurationDetailID,
// // 	}

// // 	if err := tx.Model(&scenarioDetail).Updates(scenarioDetail).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to update scenario detail", "detail": err.Error()})
// // 	}

// // 	// 2. Update UserScenario
// // 	updateData := map[string]interface{}{
// // 		"name":                req.Name,
// // 		"modify_date":         time.Now(),
// // 		"create_by":           req.CreateBy,
// // 		"cover_img_id":        req.CoverImgID,
// // 		"scenario_detail_id":  scenarioDetailID,
// // 	}

// // 	if err := tx.Model(&existingScenario).Updates(updateData).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to update user scenario", "detail": err.Error()})
// // 	}

// // 	// Commit transaction
// // 	if err := tx.Commit().Error; err != nil {
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to commit transaction", "detail": err.Error()})
// // 	}

// // 	return c.JSON(fiber.Map{
// // 		"message":            "User scenario updated successfully",
// // 		"user_scenario_id":   userScenarioID,
// // 		"scenario_detail_id": scenarioDetailID,
// // 	})
// // }

// // // DeleteUserScenario ลบ UserScenario พร้อม ScenarioDetail ที่เกี่ยวข้อง
// // func DeleteUserScenario(c *fiber.Ctx) error {
// // 	userScenarioID := c.Params("id")
// // 	if userScenarioID == "" {
// // 		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
// // 	}

// // 	// Check if UserScenario exists
// // 	var existingScenario model_database.UserScenario
// // 	if err := config.DB.First(&existingScenario, "user_scenario_id = ?", userScenarioID).Error; err != nil {
// // 		return c.Status(404).JSON(fiber.Map{"error": "user scenario not found"})
// // 	}

// // 	// Start transaction
// // 	tx := config.DB.WithContext(c.Context()).Begin()

// // 	// Delete UserScenario (will cascade delete due to foreign key constraint)
// // 	if err := tx.Delete(&existingScenario).Error; err != nil {
// // 		tx.Rollback()
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to delete user scenario", "detail": err.Error()})
// // 	}

// // 	// Commit transaction
// // 	if err := tx.Commit().Error; err != nil {
// // 		return c.Status(500).JSON(fiber.Map{"error": "failed to commit transaction", "detail": err.Error()})
// // 	}

// // 	return c.JSON(fiber.Map{
// // 		"message":           "User scenario deleted successfully",
// // 		"user_scenario_id":  userScenarioID,
// // 	})
// // }

// // GetScenarioDetails ดึง ScenarioDetail พร้อมข้อมูล BusScenario และ RouteScenario
// func GetScenarioDetails(c *fiber.Ctx) error {
// 	scenarioDetailID := c.Params("id")
// 	if scenarioDetailID == "" {
// 		return c.Status(400).JSON(fiber.Map{"error": "id is required"})
// 	}

// 	var scenarioDetail model_database.ScenarioDetail
// 	result := config.DB.
// 		Where("scenario_detail_id = ?", scenarioDetailID).
// 		Preload("BusScenario").
// 		Preload("RouteScenario").
// 		Preload("ConfigurationDetail").
// 		First(&scenarioDetail)

// 	if result.Error != nil {
// 		return c.Status(404).JSON(fiber.Map{"error": "scenario detail not found"})
// 	}

// 	return c.JSON(scenarioDetail)
// }

// // UploadScenarioCoverImg อัปโหลดรูปปกสำหรับสถานการณ์ และเก็บลงฐานข้อมูล
// func UploadScenarioCoverImg(c *fiber.Ctx) error {
// 	uploadDir := os.Getenv("UPLOAD_DIR")
// 	if uploadDir == "" {
// 		uploadDir = "./uploads"
// 	}
// 	resolvedUploadDir, err := filepath.Abs(uploadDir)
// 	if err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "cannot resolve upload dir", "detail": err.Error()})
// 	}

// 	if err := os.MkdirAll(resolvedUploadDir, 0o755); err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "cannot create upload dir", "detail": err.Error()})
// 	}

// 	f, err := c.FormFile("file")
// 	if err != nil {
// 		return c.Status(400).JSON(fiber.Map{"error": "file missing"})
// 	}

// 	baseName := filepath.Base(f.Filename)
// 	ext := filepath.Ext(baseName)
// 	if ext == "" {
// 		ext = ".bin"
// 	}

// 	fileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
// 	savePath := filepath.Join(resolvedUploadDir, fileName)

// 	if err := c.SaveFile(f, savePath); err != nil {
// 		return c.Status(500).JSON(fiber.Map{"error": "cannot save file", "detail": err.Error()})
// 	}

// 	// Generate cover image ID
// 	coverImageID := uuid.New().String()

// 	// Save to database
// 	coverImage := model_database.CoverImageProject{
// 		CoverImageProID: coverImageID,
// 		PathFile:        fileName,
// 	}

// 	if err := config.DB.Create(&coverImage).Error; err != nil {
// 		// Delete uploaded file if database insert fails
// 		os.Remove(savePath)
// 		return c.Status(500).JSON(fiber.Map{"error": "failed to save to database", "detail": err.Error()})
// 	}

// 	// Build public URL
// 	scheme := "http"
// 	if c.Protocol() == "https" {
// 		scheme = "https"
// 	}
// 	baseURL := fmt.Sprintf("%s://%s", scheme, c.Hostname())
// 	fileURL := fmt.Sprintf("%s/uploads/%s", baseURL, fileName)

// 	return c.Status(201).JSON(fiber.Map{
// 		"cover_image_id": coverImageID,
// 		"path_file":      fileName,
// 		"url":            fileURL,
// 	})
// }
