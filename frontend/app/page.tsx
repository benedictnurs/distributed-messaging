"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the zod schema for the Join Room form
const joinRoomSchema = z.object({
  roomID: z.string().min(1, { message: "Room ID is required." }),
});

type JoinRoomFormValues = z.infer<typeof joinRoomSchema>;

const Home = () => {
  const router = useRouter();
  const [copySuccess, setCopySuccess] = useState<string>("");

  const getBackendURL = () => {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  };

  // Initialize react-hook-form for the Join Room form
  const joinRoomForm = useForm<JoinRoomFormValues>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      roomID: "",
    },
  });

  // Handler to create a new room
  const createRoom = async () => {
    try {
      const response = await fetch(`${getBackendURL()}/create-room`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/room/${data.roomID}`);
      } else {
        const errorData = await response.json();
        alert(errorData.text || "Failed to create a room. Please try again.");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("An error occurred while creating the room. Please try again.");
    }
  };

  // Handler to join an existing room
  const joinRoom = async (data: JoinRoomFormValues) => {
    const roomID = data.roomID.trim();

    try {
      const response = await fetch(
        `${getBackendURL()}/room-exists?roomID=${roomID}`
      );
      const responseData = await response.json();

      if (responseData.exists) {
        router.push(`/room/${roomID}`);
      } else {
        // This block may not be necessary if you're handling 404
        joinRoomForm.setError("roomID", {
          type: "manual",
          message: "Room not found.",
        });
      }
    } catch (error) {
      console.error("Error checking room:", error);
      joinRoomForm.setError("roomID", {
        type: "manual",
        message: "An error occurred.",
      });
    }
  };

  // Function to copy the current page URL to the clipboard
  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}`;
    navigator.clipboard
      .writeText(roomLink)
      .then(() => {
        setCopySuccess("Link copied!");
        setTimeout(() => setCopySuccess(""), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome to Sesh...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            {/* Create Room Button */}
            <Button onClick={createRoom} className="w-full">
              Create Room
            </Button>

            {/* Join Room Form */}
            <Form {...joinRoomForm}>
              <form
                onSubmit={joinRoomForm.handleSubmit(joinRoom)}
                className="space-y-4"
              >
                <div className="flex">
                  <FormField
                    control={joinRoomForm.control}
                    name="roomID"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input placeholder="Enter Room ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-1/4 ml-3">
                    Join
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
