package main

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/routes"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file from current directory or parent
	envPath := ".env"
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️ Warning: Could not load .env from %s: %v\n", envPath, err)
	}

	// Verify ORS_API_KEY is loaded
	orsKey := os.Getenv("ORS_API_KEY")
	if orsKey == "" {
		fmt.Println("❌ ORS_API_KEY is empty - backend will use straight lines only")
	} else {
		fmt.Println("✅ ORS_API_KEY loaded successfully")
	}

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*", // หรือ "http://localhost:5173"
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Content-Type",
	}))

	// Connect to Postgres (runs AutoMigrate)
	config.ConnectDatabase()

	// seed.SeedData() // insert initial data


	// Setup routes
	routes.SetupRoutes(app)
	routes.SetupComputeRoutes(app)
	routes.SetupDistributionRoutes(app)
	routes.SetupSimulationRoutes(app)
	routes.DatabaseRoutes(app)

	println("🚀 DeSS_T Backend running on http://localhost:8080")

	routes.RegisterNetworkRoutes(app)

	app.Listen(":8080")
}

