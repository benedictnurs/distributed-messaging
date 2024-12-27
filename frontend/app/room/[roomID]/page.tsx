"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { WavyBackground } from "@/components/ui/wavy-background";
import { Send } from "lucide-react";

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, {
      message: "Username must be at least 3 characters.",
    })
    .max(8, {
      message: "Username must be less than 8 characters.",
    })
    .regex(/^(?!\.)[a-zA-Z0-9_.]*(?<!\.)$/, {
      message:
        "Username can only contain letters, numbers, underscores (_), and periods (.), and cannot start or end with a period (.)",
    }),
});

const messageSchema = z.object({
  message: z.string().min(1, { message: "Message cannot be empty." }),
});

const Room = () => {
  const { roomID } = useParams();
  const router = useRouter();
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>("");
  const [currentUsername, setCurrentUsername] = useState<string>("");

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const usernameForm = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
    },
  });

  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    // Scroll to the bottom whenever messages are updated
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connectToWebSocket = (data: z.infer<typeof usernameSchema>) => {
    const username = data.username.trim();
    setCurrentUsername(username);

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // const wsURL = `${protocol}://${window.location.hostname}:8080/ws?roomID=${roomID}&username=${username}`;
    const wsURL = `wss://api.seshon.tech/ws?roomID=${roomID}&username=${username}`;
    socketRef.current = new WebSocket(wsURL);

    socketRef.current.onopen = () => {
      setConnected(true);
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            setMessages((prevMessages) => [
              ...prevMessages,
              { user: data.user, text: data.text },
            ]);
            break;

          case "room-closed":
            socketRef.current?.close();
            router.push("/");
            break;

          case "admin-status":
            setIsAdmin(data.isAdmin);
            break;

          case "error":
            socketRef.current?.close();
            setConnected(false);
            if (data.text === "Room does not exist") {
              router.push("/");
            } else if (data.text === "Username already exists in the room") {
              usernameForm.setError("username", {
                type: "manual",
                message: "Username is taken.",
              });
            }
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socketRef.current.onclose = () => {
      setConnected(false);
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert("A WebSocket error occurred. Please try again.");
      setConnected(false);
    };
  };

  const sendMessage = (data: z.infer<typeof messageSchema>) => {
    const message = data.message.trim();

    if (socketRef.current && message) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({ text: message });
        socketRef.current.send(payload);
        messageForm.reset();
      } else {
        alert("WebSocket is not open. Unable to send message.");
      }
    }
  };

  const handleCloseRoom = () => {
    if (socketRef.current && isAdmin) {
      socketRef.current.send(JSON.stringify({ text: "/close" }));
    }
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomID}`;
    navigator.clipboard
      .writeText(roomLink)
      .then(() => {
        setCopySuccess("Link copied.");
        setTimeout(() => setCopySuccess(""), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      {!connected ? (
        <WavyBackground>
          <div className="p-6 w-screen max-w-sm border rounded-lg shadow-md bg-black">
            <h1 className="text-3xl font-medium text-center mb-4">
              Joining room <span className="text-green-400">{roomID}</span>
            </h1>
            <Form {...usernameForm}>
              <form
                onSubmit={usernameForm.handleSubmit(connectToWebSocket)}
                className="space-y-4"
              >
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          placeholder="Enter Username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Join Room
                </Button>
              </form>
            </Form>
          </div>
        </WavyBackground>
      ) : (
        <div className="p-5 w-full h-full flex flex-col">
          <div className="flex justify-between mb-4 border-b pb-4">
            <h2 className="text-2xl font-medium flex items-center">
              <button
                onClick={copyRoomLink}
                className="ml-2 hover:underline text-green-400"
              >
                {roomID}
              </button>
              {copySuccess && (
                <span className="ml-2 text-sm">{copySuccess}</span>
              )}
            </h2>
            {isAdmin && <Button onClick={handleCloseRoom}>Close Room</Button>}
          </div>

          {/* 
            Use overflow-y-auto and overscroll-none to prevent "bouncy" or 
            extra Y-overflow on mobile devices
          */}
          <div className="flex-grow overflow-y-auto overscroll-none mb-4 rounded-lg shadow-inner custom-scrollbar p-4">
            {messages.map((msg, index) => {
              const isCurrentUser = msg.user === currentUsername;

              // Only show username if:
              // 1) It's the first message (index === 0), OR
              // 2) The previous message has a different user
              const showUsername =
                index === 0 || messages[index - 1].user !== msg.user;

              return (
                <div
                  key={index}
                  className={`mb-4 flex flex-col ${
                    isCurrentUser ? "items-end" : "items-start"
                  }`}
                >
                  {/* 
                    If it's NOT the current user and this is the first message 
                    of a consecutive sequence, show the username 
                  */}
                  {!isCurrentUser && showUsername && (
                    <p className="mb-1 text-sm font-semibold">{msg.user}</p>
                  )}

                  <div
                    className={`max-w-xs px-3 py-2 rounded-md break-words ${
                      isCurrentUser
                        ? "bg-green-400 text-black"
                        : "bg-neutral-400 text-black"
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef}></div>
          </div>

          <Form {...messageForm}>
            <form
              onSubmit={messageForm.handleSubmit(sendMessage)}
              className="flex items-center space-x-2"
            >
              <FormField
                control={messageForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder="Type a message"
                        {...field}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            messageForm.handleSubmit(sendMessage)();
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit">
                <Send strokeWidth={1.5} />
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
};

export default Room;
