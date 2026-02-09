package routes

import (
    "github.com/gofiber/fiber/v2"
    "DeSS_T_Backend-go/controllers"
)

func DatabaseRoutes(app *fiber.App) {
    api := app.Group("/api")
    api.Post("/auth/google/login", controllers.CreateGoogleUser)
}
