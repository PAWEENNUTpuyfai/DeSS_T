package routes

import (
    "DeSS_T_Backend-go/controllers"
    "github.com/gofiber/fiber/v2"
)

func SetupLogRoutes(app *fiber.App) {
    logGroup := app.Group("/api/logs")
    logGroup.Post("/", controllers.CreateLog)
    logGroup.Get("/", controllers.GetLogs)
}
