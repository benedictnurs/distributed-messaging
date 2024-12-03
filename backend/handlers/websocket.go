package handlers

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}
//Example URL: ws:
//ws://localhost:8080/ws?roomID=room123&username=Alice
// Room structure to store users and messages
type Room struct {
	Users map[*websocket.Conn]string // Active connections and their usernames
	mu    sync.Mutex                 // Mutex to handle concurrent access
}

// Global map of rooms
var rooms = struct {
	sync.Mutex
	data map[string]*Room
}{
	data: make(map[string]*Room),
}

// HandleWebSocket handles WebSocket connections and broadcasts messages within a room
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	// Get the roomID and username from query parameters
	roomID := r.URL.Query().Get("roomID")
	username := r.URL.Query().Get("username")

	if roomID == "" {
		log.Println("Room ID is required")
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Room ID is required"))
		return
	}

	if username == "" {
		log.Println("Username is required")
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Username is required"))
		return
	}

	// Ensure the room exists
	room := getOrCreateRoom(roomID)

	// Ensure the username is unique within the room
	room.mu.Lock()
	for _, existingUsername := range room.Users {
		if existingUsername == username {
			log.Printf("Username %s is already in use in room %s\n", username, roomID)
			conn.WriteMessage(websocket.TextMessage, []byte("Error: Username is already in use"))
			room.mu.Unlock()
			return
		}
	}

	// Add the user to the room
	room.Users[conn] = username
	room.mu.Unlock()
	log.Printf("User %s joined room %s\n", username, roomID)

	// Remove the user when the connection closes
	defer func() {
		room.mu.Lock()
		delete(room.Users, conn)
		room.mu.Unlock()
		log.Printf("User %s left room %s\n", username, roomID)
	}()

	// Listen for incoming messages
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message from %s in room %s: %v\n", username, roomID, err)
			break
		}

		// Validate the message is not blank
		if len(msg) == 0 {
			log.Printf("Blank message from %s in room %s was ignored\n", username, roomID)
			conn.WriteMessage(websocket.TextMessage, []byte("Error: Message cannot be blank"))
			continue
		}

		log.Printf("Message from %s in room %s: %s\n", username, roomID, msg)

		// Broadcast the message to all users in the room
		broadcastMessage(room, username, msg)
	}
}

// getOrCreateRoom retrieves an existing room or creates a new one
func getOrCreateRoom(roomID string) *Room {
	rooms.Lock()
	defer rooms.Unlock()

	room, exists := rooms.data[roomID]
	if !exists {
		room = &Room{
			Users: make(map[*websocket.Conn]string),
		}
		rooms.data[roomID] = room
		log.Printf("Room %s created\n", roomID)
	}
	return room
}

// broadcastMessage sends a message from one user to all others in the same room
func broadcastMessage(room *Room, sender string, message []byte) {
	room.mu.Lock()
	defer room.mu.Unlock()

	for conn, username := range room.Users {
		if username != sender { // Don't send the message back to the sender
			err := conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Printf("Error broadcasting to %s in room: %v\n", username, err)
				conn.Close()
				delete(room.Users, conn)
			}
		}
	}
}
