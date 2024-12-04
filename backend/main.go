package main

import (
    "encoding/json"
    "log"
    "math/rand"
    "net/http"
    "sync"
    "time"

    "github.com/gorilla/websocket"
    "github.com/rs/cors"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

// Room structure to store users and admin
type Room struct {
    Users map[*websocket.Conn]string
    Admin string
    mu    sync.Mutex
}

// Global room storage
var rooms = struct {
    sync.Mutex
    data map[string]*Room
}{
    data: make(map[string]*Room),
}

// CreateRoom generates a random room ID and returns it
func CreateRoom(w http.ResponseWriter, r *http.Request) {
    roomID := generateRoomID()
    rooms.Lock()
    defer rooms.Unlock()

    if _, exists := rooms.data[roomID]; exists {
        http.Error(w, "Room already exists. Please try again.", http.StatusConflict)
        return
    }

    rooms.data[roomID] = &Room{
        Users: make(map[*websocket.Conn]string),
    }
    response := map[string]string{"roomID": roomID}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)

    log.Printf("Room %s created\n", roomID)
}

// generateRoomID creates a unique random string for room IDs
func generateRoomID() string {
    rand.Seed(time.Now().UnixNano())
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    id := make([]byte, 4)
    for i := range id {
        id[i] = charset[rand.Intn(len(charset))]
    }
    return string(id)
}

// HandleWebSocket handles WebSocket connections and broadcasts messages within a room
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade failed:", err)
        return
    }
    defer conn.Close()

    roomID := r.URL.Query().Get("roomID")
    username := r.URL.Query().Get("username")

    if roomID == "" || username == "" {
        conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"error", "text":"Room ID and Username are required"}`))
        return
    }

    room, exists := getRoom(roomID)
    if !exists {
        conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"error", "text":"Room does not exist"}`))
        return
    }

    room.mu.Lock()
    // Check for duplicate usernames
    for _, user := range room.Users {
        if user == username {
            conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"error", "text":"Username already exists in the room"}`))
            room.mu.Unlock()
            return
        }
    }

    // Assign admin if the first user
    if len(room.Users) == 0 {
        room.Admin = username
        conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"admin-status", "isAdmin":true}`))
        log.Printf("User %s is the admin of room %s\n", username, roomID)
    } else {
        conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"admin-status", "isAdmin":false}`))
    }

    room.Users[conn] = username
    log.Printf("User %s joined room %s\n", username, roomID)
    room.mu.Unlock()

    defer func() {
        room.mu.Lock()

        delete(room.Users, conn)
        isEmpty := len(room.Users) == 0
        isAdmin := room.Admin == username

        if isAdmin {
            // Admin left, close the room
            log.Printf("Admin %s left room %s. Closing room.\n", username, roomID)
            room.mu.Unlock() // Unlock before closing the room
            closeRoom(roomID)
        } else {
            log.Printf("User %s left room %s\n", username, roomID)
            if isEmpty {
                room.mu.Unlock() // Unlock before deleting the room
                deleteRoom(roomID)
            } else {
                room.mu.Unlock()
            }
        }
    }()

    // Listen for messages
    for {
        _, msg, err := conn.ReadMessage()
        if err != nil {
            log.Printf("Error reading message from %s in room %s: %v\n", username, roomID, err)
            break
        }

        var message map[string]string
        if err := json.Unmarshal(msg, &message); err != nil {
            conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"error", "text":"Invalid message format"}`))
            continue
        }

        log.Printf("Message from %s in room %s: %s\n", username, roomID, message["text"])

        // Admin closes the room (if you still want this feature)
        if username == room.Admin && message["text"] == "/close" {
            log.Printf("Admin %s is closing room %s\n", username, roomID)
            closeRoom(roomID)
            return
        }

        broadcastMessage(room, username, message["text"])
    }
}

// getRoom retrieves an existing room
func getRoom(roomID string) (*Room, bool) {
    rooms.Lock()
    defer rooms.Unlock()
    room, exists := rooms.data[roomID]
    return room, exists
}

// broadcastMessage sends a message from one user to all others in the same room
func broadcastMessage(room *Room, sender string, text string) {
    room.mu.Lock()
    defer room.mu.Unlock()

    for conn := range room.Users {
        data := map[string]string{
            "type": "message",
            "user": sender,
            "text": text,
        }
        payload, _ := json.Marshal(data)

        err := conn.WriteMessage(websocket.TextMessage, payload)
        if err != nil {
            log.Printf("Error broadcasting to user: %v\n", err)
            conn.Close()
            delete(room.Users, conn)
        }
    }
}

// closeRoom forcibly disconnects all users in a room and deletes it
func closeRoom(roomID string) {
    rooms.Lock()
    room, exists := rooms.data[roomID]
    rooms.Unlock()

    if !exists {
        log.Printf("Room %s does not exist, cannot close\n", roomID)
        return
    }

    room.mu.Lock()
    defer room.mu.Unlock()

    for conn := range room.Users {
        data := map[string]interface{}{
            "type": "room-closed",
            "text": "Room has been closed by the admin.",
        }
        payload, _ := json.Marshal(data)

        conn.WriteMessage(websocket.TextMessage, payload)
        conn.Close()
    }

    deleteRoom(roomID)
}

// deleteRoom removes a room from the global map
func deleteRoom(roomID string) {
    rooms.Lock()
    defer rooms.Unlock()

    delete(rooms.data, roomID)
    log.Printf("Room %s deleted\n", roomID)
}

// RoomExists checks if a room exists and responds accordingly
func RoomExists(w http.ResponseWriter, r *http.Request) {
    roomID := r.URL.Query().Get("roomID")
    log.Printf("RoomExists called with roomID: %s\n", roomID)

    if roomID == "" {
        log.Println("RoomExists error: roomID is empty")
        http.Error(w, `{"type":"error", "text":"Room ID is required"}`, http.StatusBadRequest)
        return
    }

    rooms.Lock()
    defer rooms.Unlock()

    _, exists := rooms.data[roomID]
    if !exists {
        log.Printf("RoomExists error: Room %s does not exist\n", roomID)
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusNotFound)
        json.NewEncoder(w).Encode(map[string]string{
            "type": "error",
            "text": "Room does not exist",
        })
        return
    }

    // If room exists, respond with a success message
    response := map[string]bool{"exists": exists}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    // Set up HTTP server and Route Handlers
    http.HandleFunc("/create-room", CreateRoom)
    http.HandleFunc("/ws", HandleWebSocket)
	http.HandleFunc("/room-exists", RoomExists)
    c := cors.New(cors.Options{
        AllowedOrigins:   []string{"*"},
        AllowCredentials: true,
    })

    handler := c.Handler(http.DefaultServeMux)
    log.Println("Server started on port 8080")
    http.ListenAndServe(":8080", handler)
}