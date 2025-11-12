package routes

import (
    "DeSS_T_Backend-go/controllers"
    "github.com/gofiber/fiber/v2"
)

func SetupComputeRoutes(app *fiber.App) {
    group := app.Group("/api")
    group.Post("/compute", controllers.ComputeFromPython)
}
