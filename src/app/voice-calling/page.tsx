// import CallInterface from '@/components/core/CallInterface'
// import React from 'react'

// const VoiceCalling = () => {
//     return (
//         <div>
//             <CallInterface />
//         </div>
//     )
// }

// export default VoiceCalling


"use client";
import { useEffect, useState } from "react";
import { Device } from "@twilio/voice-sdk";
import { authClient } from "@/lib/auth-client";

function TwilioCall() {
    const { data: session } = authClient.useSession();
    const [device, setDevice] = useState<Device | null>(null);
    const [callTo, setCallTo] = useState<string>("");
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!session?.user.id) return;

        const initDevice = async () => {
            try {
                const res = await fetch("/api/twilio/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identity: session.user.id }),
                });
                const { token } = await res.json();

                const twilioDevice = new Device(token, {
                    logLevel: 1,
                    // codecPreferences: ["opus", "pcmu"],
                });

                twilioDevice.on("ready", () => {
                    console.log("Twilio Device ready for", session.user.id);
                    setIsConnected(true);
                });

                twilioDevice.on("incoming", (call) => {
                    console.log("Incoming call for", session.user.id);
                    call.accept();
                });

                twilioDevice.on("error", (error) => {
                    console.error("Device error:", error);
                    setIsConnected(false);
                });

                twilioDevice.on("disconnect", () => {
                    console.log("Device disconnected");
                    setIsConnected(false);
                });

                setDevice(twilioDevice);
            } catch (error) {
                console.error("Failed to initialize device:", error);
            }
        };

        initDevice();
    }, [session?.user.id]);

    const makeCall = async () => {
        if (!device || !callTo.trim()) {
            console.error("Device not ready or no recipient specified");
            return;
        }

        try {
            console.log("Making call to:", callTo);
            console.log("From:", session?.user.id);

            // Method 1: Try with the parameters as you had them
            const connection = await device.connect({
                To: callTo.trim(),
                From: session?.user.id,
                Foo: "bar"
            } as any);

            console.log("Call connection:", connection);

            connection.on("accept", () => {
                console.log("Call accepted");
            });

            connection.on("disconnect", () => {
                console.log("Call disconnected");
            });

            connection.on("error", (error) => {
                console.error("Call error:", error);
            });

        } catch (error) {
            console.error("Failed to make call:", error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Twilio Voice Call</h1>

            <div className="mb-4">
                <span className={`inline-block px-2 py-1 rounded text-sm ${isConnected ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Your ID: {session?.user.id}</p>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Enter user identity to call"
                    value={callTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCallTo(e.target.value)
                    }
                    className="border p-2 flex-1"
                />
                <button
                    onClick={makeCall}
                    disabled={!device || !isConnected || !callTo.trim()}
                    className={`px-4 py-2 rounded text-white ${device && isConnected && callTo.trim()
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 cursor-not-allowed'
                        }`}
                >
                    Call User
                </button>
            </div>
        </div>
    );
}

export default TwilioCall;