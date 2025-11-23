package seed

import (
	"DeSS_T_Backend-go/config"
	"DeSS_T_Backend-go/models"
	"fmt"
)

func SeedData() {
	fmt.Println("🌱 Seeding data...")
	// config.DB.Create(&models.User{Name: "Alice", Age: 25})
	// config.DB.Create(&models.User{Name: "Bob", Age: 30})
	// config.DB.Create(&models.User{Name: "Charlie", Age: 28})
	// config.DB.Create(&models.User{Name: "Diana", Age: 22})
	// config.DB.Create(&models.User{Name: "Ethan", Age: 35})
	// config.DB.Create(&models.User{Name: "Fiona", Age: 27})
	// config.DB.Create(&models.User{Name: "George", Age: 29})
	// config.DB.Create(&models.User{Name: "Hannah", Age: 24})
	// config.DB.Create(&models.User{Name: "Ian", Age: 31})
	// config.DB.Create(&models.User{Name: "Jane", Age: 26})
	config.DB.Create(&models.User{Name: "Alice"})
	config.DB.Create(&models.User{Name: "Bob"})
	config.DB.Create(&models.User{Name: "Charlie"})
	config.DB.Create(&models.User{Name: "Diana"})
	config.DB.Create(&models.User{Name: "Ethan"})
	config.DB.Create(&models.User{Name: "Fiona"})
	config.DB.Create(&models.User{Name: "George"})
	config.DB.Create(&models.User{Name: "Hannah"})
	config.DB.Create(&models.User{Name: "Ian"})
	config.DB.Create(&models.User{Name: "Jane"})
	fmt.Println("✅ Data seeded")
}
