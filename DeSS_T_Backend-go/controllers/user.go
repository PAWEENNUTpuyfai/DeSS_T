package controllers


import (
    "github.com/gofiber/fiber/v2"
    "DeSS_T_Backend-go/config"
    "DeSS_T_Backend-go/models"
)

func CreateUser(c *fiber.Ctx) error {
    var user models.User
    if err := c.BodyParser(&user); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
    }

    config.DB.Create(&user)
    return c.JSON(user)
}

func GetUsers(c *fiber.Ctx) error {
    var users []models.User
    config.DB.Find(&users)
    return c.JSON(users)
}