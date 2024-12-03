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

const usernameSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

const messageSchema = z.object({
  message: z.string().min(1, {}),
});

const Room = () => {
  const { roomID } = useParams();
  const router = useRouter();
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ user: string; text: string }[]>(
    []
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>("");

  const socketRef = useRef<WebSocket | null>(null);

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
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connectToWebSocket = (data: z.infer<typeof usernameSchema>) => {
    const username = data.username.trim();

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsURL = `${protocol}://${window.location.hostname}:8080/ws?roomID=${roomID}&username=${username}`;
    socketRef.current = new WebSocket(wsURL);

    socketRef.current.onopen = () => {
      setConnected(true);
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: data.user, text: data.text },
        ]);
      } else if (data.type === "room-closed") {
        socketRef.current?.close();
        router.push("/");
      } else if (data.type === "admin-status") {
        setIsAdmin(data.isAdmin);
      } else if (data.type === "error") {
        socketRef.current?.close();
        setConnected(false);
      }
    };

    socketRef.current.onclose = () => {
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
        setTimeout(() => setCopySuccess(""), 2000);
      },
      (err) => {
        console.error("Failed to copy: ", err);
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {!connected ? (
        <div className="p-6 w-full max-w-sm border">
          <h1 className="text-xl font-bold text-center mb-4">
            Join Room: <span>{roomID}</span>
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
                      <Input placeholder="Enter Username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Join Room</Button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-2 flex items-center">
            Room:{" "}
            <button onClick={copyRoomLink} className="ml-2">
              {roomID}
            </button>
            {copySuccess && <span className="ml-2 text-sm">{copySuccess}</span>}
          </h2>
          <div className="h-64 overflow-y-scroll border p-4 mb-4">
            {messages.map((msg, index) => (
              <div key={index} className="mb-2">
                <strong>{msg.user}:</strong> {msg.text}
              </div>
            ))}
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
              <Button type="submit">Send</Button>
            </form>
          </Form>
          {isAdmin && (
            <Button onClick={handleCloseRoom} className="mt-4">
              Close Room
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Room;
