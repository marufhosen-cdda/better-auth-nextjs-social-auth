import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

export async function POST(request: NextRequest) {
    try {
        const { identity } = await request.json();

        if (!identity) {
            console.error("❌ No identity provided");
            return NextResponse.json(
                { error: "Identity is required" },
                { status: 400 }
            );
        }

        console.log("🔑 Generating token for identity:", identity);

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKey = process.env.TWIML_API_KEY;
        const apiSecret = process.env.TWILIO_API_KEY_SECRET;
        const twimlAppSid = process.env.TWIML_APP_SID;

        // Debug environment variables (without exposing secrets)
        console.log("🔍 Environment check:");
        console.log("- TWILIO_ACCOUNT_SID:", accountSid ? "✅ Set" : "❌ Missing");
        console.log("- TWIML_API_KEY:", apiKey ? "✅ Set" : "❌ Missing");
        console.log("- TWILIO_API_KEY_SECRET:", apiSecret ? "✅ Set" : "❌ Missing");
        console.log("- TWIML_APP_SID:", twimlAppSid ? "✅ Set" : "❌ Missing");

        if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
            const missingVars = [];
            if (!accountSid) missingVars.push("TWILIO_ACCOUNT_SID");
            if (!apiKey) missingVars.push("TWIML_API_KEY");
            if (!apiSecret) missingVars.push("TWILIO_API_KEY_SECRET");
            if (!twimlAppSid) missingVars.push("TWIML_APP_SID");

            console.error("❌ Missing environment variables:", missingVars);
            return NextResponse.json(
                {
                    error: "Missing Twilio configuration",
                    missing: missingVars
                },
                { status: 500 }
            );
        }

        // Validate the format of the SIDs
        if (!accountSid.startsWith('AC')) {
            console.error("❌ Invalid TWILIO_ACCOUNT_SID format");
            return NextResponse.json(
                { error: "Invalid Account SID format" },
                { status: 500 }
            );
        }

        if (!apiKey.startsWith('SK')) {
            console.error("❌ Invalid TWIML_API_KEY format");
            return NextResponse.json(
                { error: "Invalid API Key format" },
                { status: 500 }
            );
        }

        if (!twimlAppSid.startsWith('AP')) {
            console.error("❌ Invalid TWIML_APP_SID format");
            return NextResponse.json(
                { error: "Invalid TwiML App SID format" },
                { status: 500 }
            );
        }

        console.log("🔑 Creating access token...");

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

        console.log("✅ Token generated successfully for:", identity);

        // Optional: Decode and log token payload for debugging (remove in production)
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            console.log("🔍 Token payload:", {
                identity: payload.grants?.identity,
                exp: new Date(payload.exp * 1000).toISOString(),
                iss: payload.iss,
                sub: payload.sub
            });
        } catch (e) {
            console.warn("⚠️ Could not decode token for debugging");
        }

        return NextResponse.json({
            token,
            identity,
            // Include some debug info
            debug: {
                accountSid: accountSid.substring(0, 10) + "...", // Partial for debugging
                twimlAppSid: twimlAppSid,
                tokenExpires: new Date(Date.now() + 3600 * 1000).toISOString()
            }
        });

    } catch (error: any) {
        console.error("❌ Error generating token:", error);

        // Provide more specific error messages
        let errorMessage = "Failed to generate token";
        if (error.message.includes('JWT')) {
            errorMessage = "JWT token generation failed - check API credentials";
        } else if (error.message.includes('network')) {
            errorMessage = "Network error while generating token";
        }

        return NextResponse.json(
            { error: errorMessage, details: error.message },
            { status: 500 }
        );
    }
}