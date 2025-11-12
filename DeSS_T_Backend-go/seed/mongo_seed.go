package seed

import (
    "context"
    "fmt"
    "time"

    "DeSS_T_Backend-go/config"
)

func SeedMongo() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    logs := []interface{}{
        map[string]interface{}{"action": "login", "user": "Alice", "time": time.Now()},
        map[string]interface{}{"action": "logout", "user": "Bob", "time": time.Now()},
    }

    collection := config.MongoDatabase.Collection("logs")
    result, err := collection.InsertMany(ctx, logs)
    if err != nil {
        fmt.Println("❌ Mongo seed failed:", err)
        return
    }

    fmt.Println("✅ Mongo seed completed:", result.InsertedIDs)
}
