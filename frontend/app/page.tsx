"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Home = () => {
  const router = useRouter();
  const [roomID, setRoomID] = useState("");

  const getBackendURL = () => {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  };

  const createRoom = async () => {
    const response = await fetch(`${getBackendURL()}/create-room`, {
      method: "POST",
    });

    if (response.ok) {
      const data = await response.json();
      router.push(`room/${data.roomID}`);
    } else {
      alert("Failed to create a room. Please try again.");
    }
  };

  const joinRoom = () => {
    if (roomID.trim() === "") {
      alert("Please enter a room ID!");
      return;
    }
    router.push(`room/${roomID}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-md rounded-none">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome to Sesh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button onClick={createRoom} className="w-full">
              Create Room
            </Button>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Enter Room ID"
                value={roomID}
                onChange={(e) => setRoomID(e.target.value)}
              />
              <Button onClick={joinRoom}>Join</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
