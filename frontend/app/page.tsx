"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        const data = await response.json();
        router.push(`room/${data.roomID}`);
    };

    const joinRoom = () => {
        if (roomID.trim() === "") {
            alert("Please enter a room ID!");
            return;
        }
        router.push(`room/${roomID}`);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold mb-6">Welcome to Sesh</h1>
            <button
                onClick={createRoom}
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition mb-4"
            >
                Create Room
            </button>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomID}
                    onChange={(e) => setRoomID(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                />
                <button
                    onClick={joinRoom}
                    className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition"
                >
                    Join Room
                </button>
            </div>
        </div>
    );
};

export default Home;