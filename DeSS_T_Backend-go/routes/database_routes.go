package routes

import (
	"DeSS_T_Backend-go/controllers"

	"github.com/gofiber/fiber/v2"
)

func DatabaseRoutes(app *fiber.App) {
    api := app.Group("/api")
    api.Post("/auth/google/login", controllers.CreateGoogleUser)
    api.Post("/upload/test", controllers.UploadTestImage)
}
