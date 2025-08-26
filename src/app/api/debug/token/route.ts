// pages/api/debug/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

export async function GET() {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKey = process.env.TWIML_API_KEY;
        const apiSecret = process.env.TWILIO_API_KEY_SECRET;
        const twimlAppSid = process.env.TWIML_APP_SID;

        console.log('Environment check:', {
            accountSid: accountSid ? '✓' : '✗',
            apiKey: apiKey ? '✓' : '✗',
            apiSecret: apiSecret ? '✓' : '✗',
            twimlAppSid: twimlAppSid ? '✓' : '✗'
        });

        if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
            throw new Error("Missing Twilio configuration");
        }

        // Test token generation
        const accessToken = new AccessToken(accountSid, apiKey, apiSecret, {
            identity: 'debug-user',
            ttl: 3600,
        });

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: true,
        });

        accessToken.addGrant(voiceGrant);
        const token = accessToken.toJwt();

        // Decode and verify token using jsonwebtoken
        // Install jsonwebtoken: npm install jsonwebtoken
        // import jwt from "jsonwebtoken"; at the top of the file
        // @ts-ignore
        // eslint-disable-next-line
        // import * as jwt from "jsonwebtoken";
        // For ESM: import jwt from "jsonwebtoken";
        // For CommonJS: const jwt = require("jsonwebtoken");
        // Here, we use require for compatibility:
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const jwt = require("jsonwebtoken");
        const decoded = jwt.decode(token) as { identity?: string; grants?: any; exp?: number };

        return NextResponse.json({
            success: true,
            tokenLength: token.length,
            identity: decoded?.identity,
            grants: decoded?.grants,
            exp: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null
        });

    } catch (error) {
        console.error("Debug token error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}