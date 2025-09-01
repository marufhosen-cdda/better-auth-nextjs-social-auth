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
    const [callTo, setCallTo] = useState();

    useEffect(() => {
        if (!session?.user.id) return;

        const initDevice = async () => {
            const res = await fetch("/api/twilio/token");
            const { token } = await res.json();

            const twilioDevice = new Device(token, {
                logLevel: 1,
                // codecPreferences: ["opus", "pcmu"],
            });

            twilioDevice.on("ready", () =>
                console.log("Twilio Device ready for", session.user.id)
            );

            twilioDevice.on("incoming", (call) => {
                console.log("Incoming call for", session.user.id);
                call.accept();
            });

            setDevice(twilioDevice);
        };

        initDevice();
    }, [session?.user.id]);

    const makeCall = () => {
        if (device) {
            device.connect({ To: callTo } as any);
        }
    };

    return (
        <>
            <h1 className="text-2xl font-bold mb-4">Twilio Voice Call</h1>
            <input
                type="text"
                placeholder="Enter user identity to call"
                value={callTo}
                onChange={(e:
                    React.ChangeEvent<HTMLInputElement>
                ) => setCallTo(e.target.value as any)}
                className="border p-2 mr-2"
            />
            <button
                onClick={makeCall}
                className="px-4 py-2 bg-blue-600 text-white rounded"
            >
                Call Another User
            </button>
        </>
    );
}

export default TwilioCall;