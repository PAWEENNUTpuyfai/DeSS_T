package routes

import (
    "DeSS_T_Backend-go/controllers"
    "github.com/gofiber/fiber/v2"
)

func AlightingRoutes(app *fiber.App) {
    app.Post("/guest/alighting/distribution_fit", controllers.UploadGuestAlightingFit)
}
