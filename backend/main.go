package main

import (
    "log"
    "backend/handlers"
    "net/http"
)

func main() {
    http.HandleFunc("/ws", handlers.HandleWebSocket)
    log.Println("Server running on http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
