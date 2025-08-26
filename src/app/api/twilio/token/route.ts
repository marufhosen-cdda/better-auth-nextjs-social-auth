import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

export async function POST(request: NextRequest) {
    try {
        const { identity } = await request.json();

        if (!identity) {
            return NextResponse.json(
                { error: "Identity is required" },
                { status: 400 }
            );
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKey = process.env.TWIML_API_KEY;
        const apiSecret = process.env.TWILIO_API_KEY_SECRET;
        const twimlAppSid = process.env.TWIML_APP_SID;

        if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
            return NextResponse.json(
                { error: "Missing Twilio configuration" },
                { status: 500 }
            );
        }

        const accessToken = new AccessToken(accountSid, apiKey, apiSecret, {
            identity,
            ttl: 3600, // 1 hour
        });

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: true,
        });

        accessToken.addGrant(voiceGrant);
        const token = accessToken.toJwt();

        return NextResponse.json({ token, identity });
    } catch (error) {
        console.error("Error generating token:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}
