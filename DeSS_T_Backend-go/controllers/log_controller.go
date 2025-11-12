package controllers

import (
    "context"
    "time"

    "DeSS_T_Backend-go/config"
    "github.com/gofiber/fiber/v2"
    "go.mongodb.org/mongo-driver/bson"
)

func CreateLog(c *fiber.Ctx) error {
    var data map[string]interface{}
    if err := c.BodyParser(&data); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err := config.MongoDatabase.Collection("logs").InsertOne(ctx, data)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to insert"})
    }

    return c.JSON(fiber.Map{"message": "Inserted successfully"})
}

func GetLogs(c *fiber.Ctx) error {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    cursor, err := config.MongoDatabase.Collection("logs").Find(ctx, bson.M{})
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to get logs"})
    }
    defer cursor.Close(ctx)

    var results []map[string]interface{}
    if err = cursor.All(ctx, &results); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to parse logs"})
    }

    return c.JSON(results)
}
