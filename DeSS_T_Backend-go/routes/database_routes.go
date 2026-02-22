package routes

import (
	"DeSS_T_Backend-go/controllers"

	"github.com/gofiber/fiber/v2"
)

func DatabaseRoutes(app *fiber.App) {
    api := app.Group("/api")
    api.Post("/auth/google/login", controllers.CreateGoogleUser)

    // //public-configurations
    // api.Get("/public-configurations/:user_id", controllers.GetPublicConfigurations)
    // api.Post("/public-configuration", controllers.CreatePublicConfiguration)
    // api.Put("/public-configuration/:id", controllers.UpdatePublicConfiguration)
    // api.Delete("/public-configuration/:id", controllers.DeletePublicConfiguration)

    //user-configurations
    api.Get("/user-configurations/:user_id", controllers.GetUserConfigurations)
    api.Post("/user-configuration", controllers.CreateUserConfiguration)
    // api.Put("/user-configuration/:id",controllers.UpdateUserConfiguration)
    api.Delete("/user-configuration/:id",controllers.DeleteUserConfiguration)

    //configuration-details
    api.Get("/configuration-details/:id", controllers.GetConfigurationDetail)
    api.Post("/upload/configuration-cover-img", controllers.UploadConfigurationCoverImg)

    // // //public-scenarios
    // // api.Get("/public-scenarios/:user_id", controllers.GetPublicScenarios)
    // // api.Post("/public-scenario", controllers.CreatePublicScenario)
    // // api.Put("/public-scenario/:id", controllers.UpdatePublicScenario)
    // // api.Delete("/public-scenario/:id", controllers.DeletePublicScenario)

    // //user-scenarios
    api.Get("/user-scenarios/:user_id", controllers.GetUserScenarios)
    api.Post("/user-scenario-create",controllers.CreateUserScenario)
    api.Post("/user-scenario/:id",controllers.EditUserScenario)
    api.Delete("/user-scenario/:id",controllers.DeleteUserScenario)

    // //scenario-details
    api.Get("/scenario-details/:id", controllers.GetScenarioDetails)
    api.Post("/upload/scenario-cover-img", controllers.UploadScenarioCoverImg)

}
