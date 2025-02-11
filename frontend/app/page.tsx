"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { WavyBackground } from "@/components/ui/wavy-background";

// Define the zod schema for the Join Room form
const joinRoomSchema = z.object({
  roomID: z.string().min(1, { message: "Room ID is required." }),
});

type JoinRoomFormValues = z.infer<typeof joinRoomSchema>;

const Home = () => {
  const router = useRouter();

  const getBackendURL = () => {
    // return `${window.location.protocol}//${window.location.hostname}:8080`;
    return `https://api.seshon.tech`;

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

    const response = await fetch(
      `${getBackendURL()}/room-exists?roomID=${roomID}`
    );
    const responseData = await response.json();

    if (responseData.exists) {
      router.push(`/room/${roomID}`);
    } else {
      joinRoomForm.setError("roomID", {
        type: "manual",
        message: "Room not found.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <WavyBackground>
        <Card className="w-full sm:w-screen max-w-md shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-center text-4xl font-medium">
              Welcome to <span className="text-green-400 italic">Seshon</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-6">
              <Button onClick={createRoom} className="w-full">
                Create Room
              </Button>
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
                            <Input
                              autoComplete="off"
                              placeholder="Enter Room ID"
                              {...field}
                            />
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
      </WavyBackground>
    </div>
  );
};

export default Home;
