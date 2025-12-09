package routes

import (
    "github.com/gofiber/fiber/v2"
    "DeSS_T_Backend-go/controllers"
)

func NetworkRoutes(app *fiber.App) {
    api := app.Group("/api/network")
    api.Post("/build", controllers.BuildNetwork)
}
