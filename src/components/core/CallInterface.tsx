// components/CallInterface.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { Device } from "@twilio/voice-sdk";

// Extend Window interface for twilioDevice
declare global {
    interface Window {
        twilioDevice?: Device;
    }
}

interface CallState {
    isConnected: boolean;
    isIncoming: boolean;
    isMuted: boolean;
    isOnHold: boolean;
    callSid: string | null;
    remoteName: string;
    remoteNumber: string;
    duration: number;
    status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'ringing';
}

interface ConferenceCall {
    conferenceName: string;
    participants: Array<{
        callSid: string;
        identity: string;
        muted: boolean;
    }>;
}

export default function CallInterface() {
    const { data: session } = authClient.useSession();
    const [device, setDevice] = useState<Device | null>(null);
    const [dialNumber, setDialNumber] = useState("");
    const [callState, setCallState] = useState<CallState>({
        isConnected: false,
        isIncoming: false,
        isMuted: false,
        isOnHold: false,
        callSid: null,
        remoteName: "",
        remoteNumber: "",
        duration: 0,
        status: 'idle'
    });
    const [conference, setConference] = useState<ConferenceCall | null>(null);
    const [showDialPad, setShowDialPad] = useState(false);
    const [callForwardNumber, setCallForwardNumber] = useState("");
    const [isForwardingEnabled, setIsForwardingEnabled] = useState(false);
    const [activeCall, setActiveCall] = useState<any>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Twilio Device
    useEffect(() => {
        if (session?.user) {
            initializeTwilioDevice();
        }
        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        };
    }, [session]);

    const initializeTwilioDevice = async () => {
        try {
            const response = await fetch('/api/twilio/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: session?.user.id })
            });

            const { token } = await response.json();

            const twilioDevice = new Device(token, {
                edge: 'sydney',
                logLevel: 1
            });

            twilioDevice.on('ready', () => {
                console.log('Twilio Device Ready');
                setDevice(twilioDevice);
            });

            twilioDevice.on('error', (error) => {
                console.error('Twilio Device Error:', error);
            });

            twilioDevice.on('incoming', (call) => {
                console.log('Incoming call:', call);
                handleIncomingCall(call);
            });

            twilioDevice.on('disconnect', () => {
                resetCallState();
            });

            await twilioDevice.register();
        } catch (error) {
            console.error('Failed to initialize Twilio device:', error);
        }
    };

    const handleIncomingCall = (call: any) => {
        setActiveCall(call);
        setCallState(prev => ({
            ...prev,
            isIncoming: true,
            status: 'ringing',
            remoteName: call.parameters.From || 'Unknown',
            remoteNumber: call.parameters.From || '',
            callSid: call.parameters.CallSid
        }));

        call.on('accept', () => {
            startCallTimer();
            setCallState(prev => ({ ...prev, isConnected: true, status: 'connected', isIncoming: false }));
        });

        call.on('disconnect', () => {
            resetCallState();
        });
    };

    const makeCall = async (number: string, isAppToApp: boolean = false) => {
        if (!device || !number) return;

        try {
            setCallState(prev => ({ ...prev, status: 'connecting' }));

            const params: any = isAppToApp
                ? { To: number, isAppToApp: true, identity: session?.user.id }
                : { To: number, From: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER };

            const call = await device.connect(params);
            setActiveCall(call);

            call.on('accept', () => {
                startCallTimer();
                setCallState(prev => ({
                    ...prev,
                    isConnected: true,
                    status: 'connected',
                    remoteNumber: number,
                    remoteName: isAppToApp ? `User ${number}` : number,
                    callSid: call.parameters?.CallSid
                }));
            });

            call.on('disconnect', () => {
                resetCallState();
            });

        } catch (error) {
            console.error('Call failed:', error);
            setCallState(prev => ({ ...prev, status: 'idle' }));
        }
    };

    const answerCall = () => {
        if (activeCall) {
            activeCall.accept();
        }
    };

    const rejectCall = () => {
        if (activeCall) {
            activeCall.reject();
            resetCallState();
        }
    };

    const hangUpCall = () => {
        if (activeCall) {
            activeCall.disconnect();
        }
        resetCallState();
    };

    const toggleMute = () => {
        if (activeCall) {
            const newMuteState = !callState.isMuted;
            activeCall.mute(newMuteState);
            setCallState(prev => ({ ...prev, isMuted: newMuteState }));
        }
    };

    const toggleHold = async () => {
        if (!activeCall) return;

        try {
            const newHoldState = !callState.isOnHold;

            await fetch('/api/twilio/hold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callSid: callState.callSid,
                    hold: newHoldState
                })
            });

            setCallState(prev => ({ ...prev, isOnHold: newHoldState }));
        } catch (error) {
            console.error('Failed to toggle hold:', error);
        }
    };

    const forwardCall = async () => {
        if (!callForwardNumber || !callState.callSid) return;

        try {
            await fetch('/api/twilio/forward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callSid: callState.callSid,
                    forwardTo: callForwardNumber
                })
            });
        } catch (error) {
            console.error('Failed to forward call:', error);
        }
    };

    const startConference = async (participants: string[]) => {
        try {
            const response = await fetch('/api/twilio/conference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participants,
                    conferenceName: `conf_${Date.now()}`
                })
            });

            const conferenceData = await response.json();
            setConference(conferenceData);
        } catch (error) {
            console.error('Failed to start conference:', error);
        }
    };

    const addToConference = async (number: string) => {
        if (!conference) return;

        try {
            await fetch('/api/twilio/conference/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conferenceName: conference.conferenceName,
                    participant: number
                })
            });
        } catch (error) {
            console.error('Failed to add to conference:', error);
        }
    };

    const startCallTimer = () => {
        callTimerRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    };

    const resetCallState = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
        setCallState({
            isConnected: false,
            isIncoming: false,
            isMuted: false,
            isOnHold: false,
            callSid: null,
            remoteName: "",
            remoteNumber: "",
            duration: 0,
            status: 'idle'
        });
        setActiveCall(null);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const dialPadNumbers = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#']
    ];

    const handleDialPadClick = (digit: string) => {
        setDialNumber(prev => prev + digit);
        // Send DTMF tone if in call
        if (activeCall && callState.isConnected) {
            activeCall.sendDigits(digit);
        }
    };

    const debugDeviceState = () => {
        console.log('=== DEVICE STATE DEBUG ===');
        console.log('React state device:', !!device);
        console.log('Device object:', device);
        console.log('Device state:', device?.state);
        console.log('Device isBusy:', device?.isBusy);
        console.log('Session user ID:', session?.user?.id);
        console.log('Call state:', callState);
        console.log('Active call:', activeCall);

        // Try to access the actual Twilio device from window if available
        if (window && window.twilioDevice) {
            console.log('Window device state:', window.twilioDevice.state);
            console.log('Window device ready:', window.twilioDevice.state === 'registered');
        }
    };

    // Store device in window for debugging
    useEffect(() => {
        if (device) {
            window.twilioDevice = device;
        }
    }, [device]);

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Voice Call</h2>
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${device ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-sm">{device ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>

            {/* Call Status Display */}
            <div className="p-6">
                {callState.status !== 'idle' ? (
                    <div className="text-center mb-6">
                        <div className="mb-4">
                            {callState.isIncoming && (
                                <div className="text-lg font-semibold text-green-600 mb-2">
                                    Incoming Call
                                </div>
                            )}
                            <div className="text-2xl font-bold text-gray-800">
                                {callState.remoteName || callState.remoteNumber || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">
                                {callState.remoteNumber}
                            </div>
                        </div>

                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <div className={`w-3 h-3 rounded-full ${callState.status === 'connected' ? 'bg-green-500' :
                                callState.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                            <span className="text-sm capitalize">{callState.status}</span>
                            {callState.isConnected && (
                                <span className="text-sm">• {formatDuration(callState.duration)}</span>
                            )}
                        </div>

                        {/* Call Control Buttons */}
                        <div className="flex justify-center space-x-4">
                            {callState.isIncoming && !callState.isConnected ? (
                                <>
                                    <button
                                        onClick={answerCall}
                                        className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                                    >
                                        📞
                                    </button>
                                    <button
                                        onClick={rejectCall}
                                        className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                                    >
                                        📵
                                    </button>
                                </>
                            ) : callState.isConnected ? (
                                <>
                                    <button
                                        onClick={toggleMute}
                                        className={`w-12 h-12 ${callState.isMuted ? 'bg-red-500' : 'bg-gray-500'} hover:bg-opacity-80 text-white rounded-full flex items-center justify-center shadow-lg transition-all`}
                                    >
                                        {callState.isMuted ? '🔇' : '🎤'}
                                    </button>
                                    <button
                                        onClick={toggleHold}
                                        className={`w-12 h-12 ${callState.isOnHold ? 'bg-yellow-500' : 'bg-gray-500'} hover:bg-opacity-80 text-white rounded-full flex items-center justify-center shadow-lg transition-all`}
                                    >
                                        ⏸️
                                    </button>
                                    <button
                                        onClick={() => setShowDialPad(!showDialPad)}
                                        className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                                    >
                                        🔢
                                    </button>
                                    <button
                                        onClick={hangUpCall}
                                        className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                                    >
                                        📵
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={hangUpCall}
                                    className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                                >
                                    📵
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Dial Input */}
                        <div className="mb-6">
                            <input
                                type="text"
                                value={dialNumber}
                                onChange={(e) => setDialNumber(e.target.value)}
                                placeholder="Enter phone number or user ID"
                                className="w-full text-2xl text-center border-2 border-gray-300 rounded-lg p-4 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Call Buttons */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={() => makeCall(dialNumber, false)}
                                disabled={!dialNumber || !device}
                                className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white p-4 rounded-lg transition-all"
                            >
                                <span>📞</span>
                                <span>Call Phone</span>
                            </button>
                            <button
                                onClick={() => makeCall(dialNumber, true)}
                                disabled={!dialNumber || !device}
                                className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-4 rounded-lg transition-all"
                            >
                                <span>📱</span>
                                <span>Call App</span>
                            </button>
                        </div>

                        {/* Call Forwarding */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">Call Forwarding</label>
                                <button
                                    onClick={() => setIsForwardingEnabled(!isForwardingEnabled)}
                                    className={`px-3 py-1 rounded text-xs ${isForwardingEnabled ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
                                >
                                    {isForwardingEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            <input
                                type="text"
                                value={callForwardNumber}
                                onChange={(e) => setCallForwardNumber(e.target.value)}
                                placeholder="Forward to number"
                                className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Conference Calling */}
                        <div className="mb-6">
                            <button
                                onClick={() => session?.user?.id && startConference([session.user.id])}
                                className="w-full bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg transition-all"
                            >
                                Start Conference Call
                            </button>
                        </div>
                    </>
                )}

                {/* Dial Pad */}
                {showDialPad && (
                    <div className="mt-6">
                        <div className="grid grid-cols-3 gap-3">
                            {dialPadNumbers.flat().map((digit) => (
                                <button
                                    key={digit}
                                    onClick={() => handleDialPadClick(digit)}
                                    className="w-16 h-16 bg-gray-100 hover:bg-gray-200 text-xl font-bold rounded-full mx-auto transition-all"
                                >
                                    {digit}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Conference Participants */}
                {conference && (
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium mb-2">Conference: {conference.conferenceName}</h4>
                        <div className="space-y-2">
                            {conference.participants.map((participant) => (
                                <div key={participant.callSid} className="flex items-center justify-between">
                                    <span className="text-sm">{participant.identity}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${participant.muted ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {participant.muted ? 'Muted' : 'Active'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Add participant"
                            className="w-full mt-2 p-2 text-sm border border-gray-300 rounded focus:outline-none"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    addToConference(e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}