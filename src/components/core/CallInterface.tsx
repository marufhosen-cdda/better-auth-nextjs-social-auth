// components/CallInterface.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { Device } from "@twilio/voice-sdk";

// Extend the Window interface to include twilioDevice
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

interface DeviceState {
    device: Device | null;
    isReady: boolean;
    isRegistered: boolean;
    error: string | null;
}

export default function CallInterface() {
    const { data: session } = authClient.useSession();
    const [deviceState, setDeviceState] = useState<DeviceState>({
        device: null,
        isReady: false,
        isRegistered: false,
        error: null
    });
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
    const [isInitializing, setIsInitializing] = useState(false);
    const deviceRef = useRef<Device | null>(null); // Add device ref for reliable access

    // Initialize Twilio Device
    useEffect(() => {
        if (session?.user && !deviceState.device && !isInitializing) {
            initializeTwilioDevice();
        }
        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
            // Cleanup device on unmount
            if (deviceRef.current) {
                deviceRef.current.destroy();
                deviceRef.current = null;
            }
        };
    }, [session]);

    const initializeTwilioDevice = async () => {
        setIsInitializing(true);

        try {
            console.log('Initializing Twilio device for user:', session?.user.id);

            const response = await fetch('/api/twilio/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: session?.user.id })
            });

            if (!response.ok) {
                throw new Error(`Token request failed: ${response.status}`);
            }

            const { token } = await response.json();
            console.log('Received token, creating device...');

            const twilioDevice = new Device(token, {
                edge: 'sydney',
                logLevel: 1,
                allowIncomingWhileBusy: true
            });

            // Set up all event listeners before registering
            // Set device in state AND ref immediately after creation
            deviceRef.current = twilioDevice;
            setDeviceState(prev => ({
                ...prev,
                device: twilioDevice,
                error: null
            }));

            twilioDevice.on('ready', () => {
                console.log('Twilio Device Ready - State:', twilioDevice.state);
                setDeviceState(prev => ({
                    ...prev,
                    device: twilioDevice, // Ensure device is always set
                    isReady: true,
                    isRegistered: twilioDevice.state === 'registered',
                    error: null
                }));
            });

            twilioDevice.on('registered', () => {
                console.log('Twilio Device Registered');
                setDeviceState(prev => ({
                    ...prev,
                    device: twilioDevice, // Ensure device object is preserved
                    isRegistered: true,
                    error: null
                }));
            });

            twilioDevice.on('unregistered', () => {
                console.log('Twilio Device Unregistered');
                setDeviceState(prev => ({
                    ...prev,
                    isRegistered: false
                }));
            });

            twilioDevice.on('error', (error) => {
                console.error('Twilio Device Error:', error);
                setDeviceState(prev => ({
                    ...prev,
                    error: error.message || 'Unknown device error'
                }));
            });

            twilioDevice.on('incoming', (call) => {
                console.log('Incoming call:', call);
                handleIncomingCall(call);
            });

            twilioDevice.on('disconnect', () => {
                console.log('Device disconnected');
                resetCallState();
            });

            // Store in window for debugging
            window.twilioDevice = twilioDevice;

            console.log('Registering device...');
            await twilioDevice.register();

        } catch (error) {
            console.error('Failed to initialize Twilio device:', error);
            setDeviceState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to initialize device'
            }));
        } finally {
            setIsInitializing(false);
        }
    };

    const handleIncomingCall = (call: any) => {
        console.log('Handling incoming call:', call.parameters);
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
            console.log('Call accepted');
            startCallTimer();
            setCallState(prev => ({
                ...prev,
                isConnected: true,
                status: 'connected',
                isIncoming: false
            }));
        });

        call.on('disconnect', () => {
            console.log('Call disconnected');
            resetCallState();
        });

        call.on('reject', () => {
            console.log('Call rejected');
            resetCallState();
        });
    };

    const makeCall = async (number: string, isAppToApp: boolean = false) => {
        // Use deviceRef as primary source, fallback to state
        const device = deviceRef.current || deviceState.device;

        console.log('=== MAKE CALL DEBUG ===');
        console.log('deviceRef.current:', !!deviceRef.current);
        console.log('deviceState.device:', !!deviceState.device);
        console.log('deviceState.isRegistered:', deviceState.isRegistered);
        console.log('device (final):', !!device);
        console.log('device.state:', device?.state);
        console.log('number:', number);

        if (!device || !deviceState.isRegistered || !number) {
            console.error('Cannot make call:', {
                hasDevice: !!device,
                hasDeviceRef: !!deviceRef.current,
                hasDeviceState: !!deviceState.device,
                isRegistered: deviceState.isRegistered,
                hasNumber: !!number,
                deviceState: device?.state
            });
            return;
        }

        try {
            console.log('Making call to:', number, 'App-to-app:', isAppToApp);
            setCallState(prev => ({ ...prev, status: 'connecting' }));

            const params: any = {
                To: number,
            };

            if (isAppToApp) {
                params.isAppToApp = 'true';
            }

            console.log('Call parameters:', params);
            const call = await device.connect(params);
            console.log('Call object created:', call);
            setActiveCall(call);

            call.on('accept', () => {
                console.log('Outgoing call accepted');
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
                console.log('Outgoing call disconnected');
                resetCallState();
            });

            call.on('reject', () => {
                console.log('Outgoing call rejected');
                resetCallState();
            });

        } catch (error) {
            console.error('Call failed:', error);
            setCallState(prev => ({ ...prev, status: 'idle' }));
            setDeviceState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Call failed'
            }));
        }
    };

    const answerCall = () => {
        if (activeCall) {
            console.log('Answering call');
            activeCall.accept();
        }
    };

    const rejectCall = () => {
        if (activeCall) {
            console.log('Rejecting call');
            activeCall.reject();
            resetCallState();
        }
    };

    const hangUpCall = () => {
        if (activeCall) {
            console.log('Hanging up call');
            activeCall.disconnect();
        }
        resetCallState();
    };

    const toggleMute = () => {
        if (activeCall) {
            const newMuteState = !callState.isMuted;
            console.log('Toggling mute:', newMuteState);
            activeCall.mute(newMuteState);
            setCallState(prev => ({ ...prev, isMuted: newMuteState }));
        }
    };

    const toggleHold = async () => {
        if (!activeCall) return;

        try {
            const newHoldState = !callState.isOnHold;
            console.log('Toggling hold:', newHoldState);

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
            console.log('Forwarding call to:', callForwardNumber);
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
            console.log('Starting conference with participants:', participants);
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
            console.log('Adding participant to conference:', number);
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
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
        }
        callTimerRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    };

    const resetCallState = () => {
        console.log('Resetting call state');
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
            console.log('Sending DTMF:', digit);
            activeCall.sendDigits(digit);
        }
    };

    const debugDeviceState = () => {
        console.log('=== DEVICE STATE DEBUG ===');
        console.log('React deviceState:', deviceState);
        console.log('Device object:', deviceState.device);
        console.log('Device state:', deviceState.device?.state);
        console.log('Device isBusy:', deviceState.device?.isBusy);
        console.log('Session user ID:', session?.user?.id);
        console.log('Call state:', callState);
        console.log('Active call:', activeCall);

        if (window.twilioDevice) {
            console.log('Window device state:', window.twilioDevice.state);
            console.log('Window device ready:', window.twilioDevice.state === 'registered');
        }
    };

    const refreshDevice = async () => {
        console.log('Refreshing device...');
        if (deviceState.device) {
            try {
                await deviceState.device.destroy();
            } catch (error) {
                console.error('Error destroying device:', error);
            }
        }
        setDeviceState({
            device: null,
            isReady: false,
            isRegistered: false,
            error: null
        });
        if (session?.user) {
            await initializeTwilioDevice();
        }
    };

    // Get connection status for display
    const getConnectionStatus = () => {
        if (isInitializing) return { color: 'bg-yellow-400', text: 'Initializing...' };
        if (deviceState.error) return { color: 'bg-red-400', text: 'Error' };
        if (deviceState.isRegistered) return { color: 'bg-green-400', text: 'Connected' };
        if (deviceState.isReady) return { color: 'bg-yellow-400', text: 'Ready' };
        return { color: 'bg-red-400', text: 'Disconnected' };
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Voice Call</h2>
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${connectionStatus.color}`}></div>
                        <span className="text-sm">{connectionStatus.text}</span>
                    </div>
                </div>

                {/* Debug Controls */}
                <div className="mt-2 flex space-x-2">
                    <button
                        onClick={debugDeviceState}
                        className="text-xs bg-opacity-20 px-2 py-1 rounded"
                    >
                        Debug
                    </button>
                    <button
                        onClick={refreshDevice}
                        className="text-xs bg-opacity-20 px-2 py-1 rounded"
                    >
                        Refresh
                    </button>
                </div>

                {/* Error Display */}
                {deviceState.error && (
                    <div className="mt-2 text-xs bg-red-500 bg-opacity-50 p-2 rounded">
                        Error: {deviceState.error}
                    </div>
                )}
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
                                disabled={!dialNumber || !deviceState.isRegistered}
                                className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white p-4 rounded-lg transition-all"
                            >
                                <span>📞</span>
                                <span>Call Phone</span>
                            </button>
                            <button
                                onClick={() => makeCall(dialNumber, true)}
                                disabled={!dialNumber || !deviceState.isRegistered}
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
                                onClick={() => session && startConference([session.user.id])}
                                disabled={!deviceState.isRegistered}
                                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-all"
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