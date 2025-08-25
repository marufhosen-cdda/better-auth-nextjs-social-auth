import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const from = formData.get('From') as string;
        const to = formData.get('To') as string;

        const twiml = new VoiceResponse();

        // Check if call forwarding is enabled for this user
        // This would typically involve checking your database
        const isForwardingEnabled = false; // Replace with actual check
        const forwardingNumber = ''; // Replace with actual forwarding number

        if (isForwardingEnabled && forwardingNumber) {
            const dial = twiml.dial({
                callerId: from,
                timeout: 30
            });
            dial.number(forwardingNumber);
        } else {
            // Route to the client
            const dial = twiml.dial({
                timeout: 30
            });
            // Use the 'to' number as client identity
            dial.client(to.replace(process.env.TWILIO_PHONE_NUMBER || '', '').replace('+', ''));
        }

        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml'
            }
        });
    } catch (error) {
        console.error('Incoming call webhook error:', error);
        const twiml = new VoiceResponse();
        twiml.say('Sorry, we are unable to connect your call at this time.');

        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml'
            }
        });
    }
}