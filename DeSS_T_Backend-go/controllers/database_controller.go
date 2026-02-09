package controllers

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

func CreateGoogleUser(c *fiber.Ctx) error {
    var userInput models.User
    if err := c.BodyParser(&userInput); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
    }

    // Check if user exists by GoogleID
    var existingUser model_database.User
    result := config.DB.First(&existingUser, "google_id = ?", userInput.GoogleID)

    if result.Error == nil {
        // User exists - update token and check for changes in Name, Email, Picture
        updateData := map[string]interface{}{
            "access_token":   userInput.AccessToken,
            "refresh_token":  userInput.RefreshToken,
            "token_expires":  parseStringToTime(userInput.TokenExpires),
            "last_login":     parseStringToTime(userInput.LastLogin),
        }

        // Check and update Name, Email, Picture if they changed
        if existingUser.Name != userInput.Name {
            updateData["name"] = userInput.Name
        }
        if existingUser.Email != userInput.Email {
            updateData["email"] = userInput.Email
        }
        if existingUser.Picture != userInput.Picture {
            updateData["picture"] = userInput.Picture
        }

        config.DB.Model(&existingUser).Updates(updateData)
        return c.JSON(existingUser)
    }

    // User doesn't exist - create new user
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

    config.DB.Create(&newUser)
    return c.JSON(newUser)
}

// Helper function to parse string to time
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

func GetGoogleUsers(c *fiber.Ctx) error {
    var users []model_database.User
    config.DB.Find(&users)
    return c.JSON(users)
}