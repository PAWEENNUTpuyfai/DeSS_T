package services

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func CreateOrUpdateGoogleUser(userInput models.User) (model_database.User, error) {
	var existingUser model_database.User
	result := config.DB.First(&existingUser, "google_id = ?", userInput.GoogleID)
	if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return model_database.User{}, fmt.Errorf("query user: %w", result.Error)
	}

	if result.Error == nil {
		updateData := map[string]interface{}{
			"access_token":  userInput.AccessToken,
			"refresh_token": userInput.RefreshToken,
			"token_expires": parseStringToTime(userInput.TokenExpires),
			"last_login":    parseStringToTime(userInput.LastLogin),
		}

		if existingUser.Name != userInput.Name {
			updateData["name"] = userInput.Name
		}
		if existingUser.Email != userInput.Email {
			updateData["email"] = userInput.Email
		}
		if existingUser.Picture != userInput.Picture {
			updateData["picture"] = userInput.Picture
		}

		if err := config.DB.Model(&existingUser).Updates(updateData).Error; err != nil {
			return model_database.User{}, fmt.Errorf("update user: %w", err)
		}

		existingUser.AccessToken = userInput.AccessToken
		existingUser.RefreshToken = userInput.RefreshToken
		existingUser.TokenExpires = parseStringToTime(userInput.TokenExpires)
		existingUser.LastLogin = parseStringToTime(userInput.LastLogin)
		existingUser.Name = userInput.Name
		existingUser.Email = userInput.Email
		existingUser.Picture = userInput.Picture

		return existingUser, nil
	}

	newUser := model_database.User{
		GoogleID:     userInput.GoogleID,
		Name:         userInput.Name,
		Email:        userInput.Email,
		Picture:      userInput.Picture,
		AccessToken:  userInput.AccessToken,
		RefreshToken: userInput.RefreshToken,
		TokenExpires: parseStringToTime(userInput.TokenExpires),
		LastLogin:    parseStringToTime(userInput.LastLogin),
		CreatedAt:    parseStringToTime(userInput.CreatedAt),
	}

	if err := config.DB.Create(&newUser).Error; err != nil {
		return model_database.User{}, fmt.Errorf("create user: %w", err)
	}

	return newUser, nil
}

func GetGoogleUsers() ([]model_database.User, error) {
	var users []model_database.User
	if err := config.DB.Find(&users).Error; err != nil {
		return nil, fmt.Errorf("fetch users: %w", err)
	}
	return users, nil
}

func parseStringToTime(dateStr string) time.Time {
	if dateStr == "" {
		return time.Now()
	}
	parsedTime, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		return time.Now()
	}
	return parsedTime
}