package routes

import (
	"DeSS_T_Backend-go/controllers"

	"github.com/gofiber/fiber/v2"
)

func RegisterNetworkRoutes(app *fiber.App) {
	// Keep network endpoints consistent with other /api routes (e.g., distribution)
	app.Post("/api/network/build", controllers.BuildNetworkModel)
	app.Post("/api/network/route", controllers.GetRouteGeometry)
	app.Post("/api/network/route-paths", controllers.ComputeRouteSegments)
	app.Post("/api/network/save-routes", controllers.SaveRoutes)
	app.Post("/api/network/area-bounds", controllers.GetAreaBounds)
	app.Post("/api/network/bus-stops", controllers.GetBusStops)
	app.Post("/api/network/bus-stops-area", controllers.GetBusStopsInArea)
}
