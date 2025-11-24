package routes

import (
    "DeSS_T_Backend-go/controllers"
    "github.com/gofiber/fiber/v2"
)

func SetupAlightingRoutes(app *fiber.App) {
    app.Post("/api/guest/alighting/distribution_fit", controllers.UploadGuestAlightingFit)
}
