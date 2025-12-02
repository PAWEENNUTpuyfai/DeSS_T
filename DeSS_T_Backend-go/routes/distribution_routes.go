package routes

import (
	"DeSS_T_Backend-go/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupDistributionRoutes(app *fiber.App) {
    app.Post("/api/guest/alighting/distribution_fit", controllers.UploadGuestAlightingFit)
    app.Post("/api/guest/interarrival/distribution_fit", controllers.UploadGuestInterarrivalFit)
}
