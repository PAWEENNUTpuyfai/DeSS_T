package main

import (
	// "DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/routes"

	"github.com/gofiber/fiber/v2"

	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*", // หรือ "http://localhost:5173"
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Content-Type",
	}))
	// config.ConnectDatabase()
	// config.ConnectMongo()

	// seed.SeedData() // insert initial data
	// seed.SeedMongo()

	// Setup routes
	routes.SetupLogRoutes(app)
	routes.SetupRoutes(app)
	routes.SetupComputeRoutes(app)
	routes.SetupDistributionRoutes(app)
	routes.NetworkRoutes(app)

	app.Listen(":8080")
}

// package main

// import (
// 	"bytes"
// 	// "context"
// 	"encoding/json"
// 	"fmt"
// 	"log"
// 	"net/http"

// 	// "github.com/jackc/pgx/v5"
// )

// func main() {
// 	// // เชื่อมต่อ local PostgreSQL
// 	// dbURL := "postgres://DeSS_T:DeSS_T_491@localhost:5432/dess_db"
// 	// conn, err := pgx.Connect(context.Background(), dbURL)
// 	// if err != nil {
// 	// 	log.Fatalf("Cannot connect to DB: %v", err)
// 	// }
// 	// defer conn.Close(context.Background())

// 	// // สร้าง table
// 	// _, err = conn.Exec(context.Background(), `
// 	// 	CREATE TABLE IF NOT EXISTS people (
// 	// 		id SERIAL PRIMARY KEY,
// 	// 		name TEXT,
// 	// 		number INT
// 	// 	)
// 	// `)
// 	// if err != nil {
// 	// 	log.Fatalf("Create table failed: %v", err)
// 	// }

// 	// // Insert ตัวอย่าง
// 	// _, err = conn.Exec(context.Background(),
// 	// 	"INSERT INTO people (name, number) VALUES ($1, $2)", "Alice", 123)
// 	// if err != nil {
// 	// 	log.Fatalf("Insert failed: %v", err)
// 	// }

// 	// // Query ข้อมูล
// 	// rows, err := conn.Query(context.Background(), "SELECT id, name, number FROM people")
// 	// if err != nil {
// 	// 	log.Fatalf("Query failed: %v", err)
// 	// }
// 	// defer rows.Close()

// 	// fmt.Println("Data in DB:")
// 	// for rows.Next() {
// 	// 	var id, number int
// 	// 	var name string
// 	// 	rows.Scan(&id, &name, &number)
// 	// 	fmt.Printf("%d: %s - %d\n", id, name, number)
// 	// }
// 	// ข้อมูลที่จะส่งไป Python
// 	payload := map[string]int{
// 		"number": 20,
// 	}
// 	jsonData, _ := json.Marshal(payload)

// 	// เรียก Python service ผ่าน localhost
// 	resp, err := http.Post("http://127.0.0.1:5000/calculate", "application/json", bytes.NewBuffer(jsonData))
// 	if err != nil {
// 		log.Fatalf("Error calling Python service: %v", err)
// 	}
// 	defer resp.Body.Close()

// 	// อ่านผลลัพธ์
// 	var result map[string]interface{}
// 	json.NewDecoder(resp.Body).Decode(&result)

// 	fmt.Printf("Python calculated result: %v\n", result["result"])
// }
// package main

// import (
// 	"bytes"
// 	"encoding/json"
// 	"io"
// 	"log"
// 	"net/http"

// 	"github.com/gofiber/fiber/v2"
// 	"github.com/gofiber/fiber/v2/middleware/cors"
// )

// func main() {
// 	app := fiber.New()

//     app.Use(cors.New(cors.Config{
//         AllowOrigins: "*", // หรือ "http://localhost:5173"
//         AllowMethods: "GET,POST,OPTIONS",
//         AllowHeaders: "Content-Type",
//     }))

// 	app.Post("/api/calculate", func(c *fiber.Ctx) error {
// 		type Req struct{ Number int `json:"number"` }
//         var req Req
//         if err := c.BodyParser(&req); err != nil {
//             return c.Status(400).JSON(fiber.Map{"error": "invalid json"})
//         }
// 		// var req map[string]interface{}
// 		// if err := c.BodyParser(&req); err != nil {
// 		// 	return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
// 		// }

// 		// ส่งข้อมูลไป Python
// 		payload, _ := json.Marshal(req)
// 		resp, err := http.Post("http://127.0.0.1:5000/calculate", "application/json", bytes.NewBuffer(payload))
// 		if err != nil {
// 			log.Println("Error contacting Python:", err)
// 			return c.Status(500).JSON(fiber.Map{"error": "Python backend unavailable"})
// 		}
// 		defer resp.Body.Close()

// 		body, _ := io.ReadAll(resp.Body)
// 		var pyResp map[string]interface{}
// 		json.Unmarshal(body, &pyResp)

// 		return c.JSON(pyResp)
// 	})

// 	log.Println("🚀 Go backend running on http://localhost:8080")
// 	app.Listen(":8080")
// }
