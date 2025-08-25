import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const callSid = formData.get('CallSid') as string;
        const callStatus = formData.get('CallStatus') as string;
        const from = formData.get('From') as string;
        const to = formData.get('To') as string;

        // Log call status for debugging
        console.log('Call Status Update:', {
            callSid,
            callStatus,
            from,
            to,
            timestamp: new Date().toISOString()
        });

        // You can store this in your database or send real-time updates to your frontend
        // For example, using WebSockets or Server-Sent Events

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Status webhook error:', error);
        return NextResponse.json(
            { error: 'Failed to process status' },
            { status: 500 }
        );
    }
}