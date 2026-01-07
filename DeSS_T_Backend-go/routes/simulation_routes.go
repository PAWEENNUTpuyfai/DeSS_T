package routes

import (
	"DeSS_T_Backend-go/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupSimulationRoutes(app *fiber.App) {
	simulation := app.Group("/api/simulation")
	simulation.Post("/transform", controllers.TransformSimulationHandler)
	simulation.Post("/run", controllers.RunSimulationHandler)
}
