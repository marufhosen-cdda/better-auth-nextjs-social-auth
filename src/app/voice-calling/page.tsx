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
    const [deviceState, setDeviceState] = useState<string>("Not initialized");
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.user.id) {
            setDeviceState("No user session");
            return;
        }

        const initDevice = async () => {
            try {
                setDeviceState("Fetching token...");
                setError(null);

                console.log("Fetching token for identity:", session.user.id);

                const res = await fetch("/api/twilio/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identity: session.user.id }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(`Token fetch failed: ${errorData.error || res.statusText}`);
                }

                const { token: twilioToken, identity } = await res.json();
                console.log("Received token for identity:", identity);
                setToken(twilioToken);

                setDeviceState("Creating device...");

                const twilioDevice = new Device(twilioToken, {
                    logLevel: 1,
                    // @ts-ignore
                    codecPreferences: ["opus", "pcmu"],
                    // sounds: {
                    //     disconnect: "/sounds/disconnect.mp3",
                    //     incoming: "/sounds/incoming.mp3",
                    //     outgoing: "/sounds/outgoing.mp3",
                    // }
                });

                // Set up event listeners before registering
                twilioDevice.on("ready", () => {
                    console.log("✅ Twilio Device ready for", identity);
                    setDeviceState("Ready");
                    setDevice(twilioDevice);
                });

                twilioDevice.on("error", (error) => {
                    console.error("❌ Device error:", error);
                    setError(`Device error: ${error.message}`);
                    setDeviceState("Error");
                });

                twilioDevice.on("offline", () => {
                    console.log("📴 Device offline");
                    setDeviceState("Offline");
                });

                twilioDevice.on("incoming", (call) => {
                    console.log("📞 Incoming call for", identity);
                    console.log("Call parameters:", call.parameters);

                    // Auto-accept for testing
                    call.accept();

                    call.on("accept", () => {
                        console.log("📞 Call accepted");
                    });

                    call.on("disconnect", () => {
                        console.log("📞 Call disconnected");
                    });
                });

                twilioDevice.on("registered", () => {
                    console.log("📋 Device registered");
                });

                twilioDevice.on("unregistered", () => {
                    console.log("📋 Device unregistered");
                });

                setDeviceState("Registering...");

                // The device should automatically register and become ready
                // If it doesn't, there might be a configuration issue

            } catch (error: any) {
                console.error("❌ Failed to initialize device:", error);
                setError(`Initialization failed: ${error.message}`);
                setDeviceState("Failed");
            }
        };

        initDevice();

        // Cleanup
        return () => {
            if (device) {
                device.destroy();
                setDevice(null);
                setDeviceState("Destroyed");
            }
        };
    }, [session?.user.id]);

    const makeCall = async () => {
        if (!device) {
            setError("Device not ready");
            return;
        }

        if (!callTo.trim()) {
            setError("Please enter a user identity to call");
            return;
        }

        try {
            setError(null);
            console.log("🔄 Making call to:", callTo);
            console.log("🔄 From:", session?.user.id);

            const connection = await device.connect({
                To: callTo.trim(),
                From: session?.user.id,
                CustomParam: "test-value"
            } as any); // 'as any' to bypass strict typing for custom params

            console.log("📞 Call initiated:", connection);

            connection.on("accept", () => {
                console.log("✅ Call accepted");
            });

            connection.on("disconnect", () => {
                console.log("📴 Call disconnected");
            });

            connection.on("error", (error) => {
                console.error("❌ Call error:", error);
                setError(`Call error: ${error.message}`);
            });

        } catch (error: any) {
            console.error("❌ Failed to make call:", error);
            setError(`Call failed: ${error.message}`);
        }
    };

    const testToken = () => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log("Token payload:", payload);
            } catch (e) {
                console.error("Invalid token format");
            }
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Twilio Voice Call Debug</h1>

            {/* Status Display */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h2 className="font-semibold mb-2">Device Status</h2>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">User ID:</span>
                        <span className="text-gray-600">{session?.user.id || 'Not logged in'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Device State:</span>
                        <span className={`px-2 py-1 rounded text-sm ${deviceState === 'Ready' ? 'bg-green-200 text-green-800' :
                            deviceState === 'Error' || deviceState === 'Failed' ? 'bg-red-200 text-red-800' :
                                'bg-yellow-200 text-yellow-800'
                            }`}>
                            {deviceState}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Token:</span>
                        <span className="text-gray-600">{token ? 'Generated' : 'None'}</span>
                        {token && (
                            <button onClick={testToken} className="text-blue-600 text-sm hover:underline">
                                Inspect Token
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Call Interface */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="callTo" className="block text-sm font-medium mb-2">
                        User Identity to Call:
                    </label>
                    <input
                        id="callTo"
                        type="text"
                        placeholder="Enter user identity (e.g., user123)"
                        value={callTo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCallTo(e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                </div>

                <button
                    onClick={makeCall}
                    disabled={deviceState !== 'Ready' || !callTo.trim()}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${deviceState === 'Ready' && callTo.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {deviceState === 'Ready' ? 'Make Call' : `Wait for Ready (${deviceState})`}
                </button>
            </div>

            {/* Debug Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Debug Checklist</h3>
                <ul className="text-sm space-y-1 text-gray-600">
                    <li>✓ Check browser console for detailed logs</li>
                    <li>✓ Verify all Twilio environment variables are set</li>
                    <li>✓ Confirm TwiML App SID is correct</li>
                    <li>✓ Ensure webhook URL is accessible from internet</li>
                    <li>✓ Check if browser allows microphone access</li>
                </ul>
            </div>
        </div>
    );
}

export default TwilioCall;