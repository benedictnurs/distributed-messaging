"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

const Room = () => {
  const { roomID } = useParams();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>("");

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connectToWebSocket = () => {
    if (!username.trim()) {
      alert("Username is required!");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsURL = `${protocol}://${window.location.hostname}:8080/ws?roomID=${roomID}&username=${username}`;
    socketRef.current = new WebSocket(wsURL);

    socketRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setConnected(true);
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message") {
        setMessages((prevMessages) => [...prevMessages, { user: data.user, text: data.text }]);
      } else if (data.type === "room-closed") {
        alert(data.text);
        socketRef.current?.close();
        router.push("/");
      } else if (data.type === "admin-status") {
        setIsAdmin(data.isAdmin);
      } else if (data.type === "error") {
        alert(data.text);
        socketRef.current?.close();
        setConnected(false);
      }
    };

    socketRef.current.onclose = () => {
      setConnected(false);
    };
  };

  const sendMessage = () => {
    if (socketRef.current && inputMessage.trim()) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({ text: inputMessage });
        console.log("Sending message:", payload);
        socketRef.current.send(payload);
        setInputMessage("");
      } else {
        console.error("WebSocket is not open. State:", socketRef.current.readyState);
        alert("Unable to send message. WebSocket connection is closed.");
      }
    }
  };

  const handleCloseRoom = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ text: "/close" }));
    }
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard.writeText(roomLink).then(
      () => {
        setCopySuccess("Link copied!");
        setTimeout(() => setCopySuccess(""), 2000); // Clear message after 2 seconds
      },
      (err) => {
        console.error("Failed to copy: ", err);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {!connected ? (
        <div className="bg-white p-6 shadow-md rounded-md w-full max-w-sm">
          <h1 className="text-xl font-bold text-center mb-4">
            Join Room: <span className="text-blue-500">{roomID}</span>
          </h1>
          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          />
          <button
            onClick={connectToWebSocket}
            className="w-full bg-blue-500 text-white font-bold py-2 rounded-md hover:bg-blue-600 transition"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 shadow-md rounded-md w-full max-w-lg">
          <h2 className="text-xl font-bold mb-2 flex items-center">
            Room:{" "}
            <button onClick={copyRoomLink} className="ml-2 text-blue-500 underline">
              {roomID}
            </button>
            {copySuccess && (
              <span className="ml-2 text-green-500 text-sm">{copySuccess}</span>
            )}
          </h2>
          <div className="h-64 overflow-y-scroll border border-gray-300 rounded-md p-4 mb-4">
            {messages.map((msg, index) => (
              <div key={index} className="mb-2">
                <strong className="text-blue-500">{msg.user}:</strong> {msg.text}
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type a message"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-grow p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition"
            >
              Send
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={handleCloseRoom}
              className="w-full bg-red-500 text-white font-bold py-2 mt-4 rounded-md hover:bg-red-600 transition"
            >
              Close Room
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Room;
