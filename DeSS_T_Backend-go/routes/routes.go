package routes

import (
    "github.com/gofiber/fiber/v2"
    "DeSS_T_Backend-go/controllers"
)

func SetupRoutes(app *fiber.App) {
    api := app.Group("/api")
    api.Get("/users", controllers.GetUsers)
    api.Post("/users", controllers.CreateUser)
}
