package controllers

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/model_database"
	"DeSS_T_Backend-go/models"
	"fmt"
	"os"
	"path/filepath"
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

func UploadTestImage(c *fiber.Ctx) error {
    uploadDir := os.Getenv("UPLOAD_DIR")
    if uploadDir == "" {
        uploadDir = "./uploads"
    }
    resolvedUploadDir, err := filepath.Abs(uploadDir)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot resolve upload dir", "detail": err.Error()})
    }

    if err := os.MkdirAll(resolvedUploadDir, 0o755); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot create upload dir", "detail": err.Error()})
    }

    f, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "file missing"})
    }

    baseName := filepath.Base(f.Filename)
    ext := filepath.Ext(baseName)
    if ext == "" {
        ext = ".bin"
    }

    fileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
    savePath := filepath.Join(resolvedUploadDir, fileName)

    if err := c.SaveFile(f, savePath); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "cannot save file", "detail": err.Error()})
    }

    // Build public URL
    scheme := "http"
    if c.Protocol() == "https" {
        scheme = "https"
    }
    baseURL := fmt.Sprintf("%s://%s", scheme, c.Hostname())
    fileURL := fmt.Sprintf("%s/uploads/%s", baseURL, fileName)

    return c.JSON(fiber.Map{
        "fileName": fileName,
        "url":      fileURL,
    })
}