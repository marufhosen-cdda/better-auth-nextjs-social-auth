// import { NextRequest, NextResponse } from 'next/server';
// import twilio from 'twilio';

// const VoiceResponse = twilio.twiml.VoiceResponse;

// export async function POST(request: NextRequest) {
//     try {
//         console.log('Voice webhook called');

//         console.log('Parsing form data-- Form data', await request.formData());
//         console.log('Parsing form data-- Text data', await request.text());
//         console.log('Parsing form data-- Body data', request.body);


//         const formData = await request.formData();

//         console.log('Parsed form data:', formData);


//         const To = formData.get('To') as string;
//         const From = formData.get('From') as string;
//         const isAppToApp = formData.get('isAppToApp') === 'true';

//         console.log('Voice webhook params:', { To, From, isAppToApp });

//         const twiml = new VoiceResponse();

//         if (isAppToApp) {
//             console.log('Handling app-to-app call');
//             // App-to-app call
//             const dial = twiml.dial({
//                 callerId: From,
//                 timeout: 30,
//                 record: 'do-not-record'
//             });
//             dial.client(To);
//         } else {
//             console.log('Handling app-to-phone call');
//             // App-to-phone call
//             const dial = twiml.dial({
//                 callerId: process.env.TWILIO_PHONE_NUMBER,
//                 timeout: 30,
//                 record: 'do-not-record'
//             });
//             dial.number(To);
//         }

//         console.log('Generated TwiML:', twiml.toString());

//         return new NextResponse(twiml.toString(), {
//             headers: {
//                 'Content-Type': 'text/xml'
//             }
//         });
//     } catch (error) {
//         console.error('Voice webhook error:', error);
//         const twiml = new VoiceResponse();
//         twiml.say('An error occurred. Please try again later.');

//         return new NextResponse(twiml.toString(), {
//             headers: {
//                 'Content-Type': 'text/xml'
//             }
//         });
//     }
// }

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
    try {
        console.log('Voice webhook called');

        // Get the raw body for debugging
        const body = await request.text();
        console.log('Raw webhook body:', body);

        // Parse form data from the raw body
        const formData = new URLSearchParams(body);

        // Log all parameters for debugging
        console.log('All webhook parameters:');
        for (const [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }

        // Extract standard Twilio parameters
        const From = formData.get('From');
        const Called = formData.get('Called');  // This might contain the To value
        const AccountSid = formData.get('AccountSid');
        const CallSid = formData.get('CallSid');

        // Extract custom parameters (these are the ones you pass from device.connect())
        const customTo = formData.get('customTo') || formData.get('To');
        const isAppToApp = formData.get('isAppToApp') === 'true';

        // Try to determine the target from various sources
        let targetNumber = customTo || Called;

        console.log('Extracted parameters:', {
            From,
            Called,
            customTo,
            targetNumber,
            isAppToApp,
            CallSid
        });

        const twiml = new VoiceResponse();

        // If we still don't have a target, we need to handle this case
        if (!targetNumber) {
            console.error('No target number found in webhook parameters');
            twiml.say('Unable to determine call destination. Please try again.');
            return new NextResponse(twiml.toString(), {
                headers: { 'Content-Type': 'text/xml' }
            });
        }

        if (isAppToApp) {
            console.log('Handling app-to-app call to:', targetNumber);
            const dial = twiml.dial({
                callerId: From,
                timeout: 30,
                record: 'do-not-record'
            } as any);
            // For app-to-app calls, use client identity
            dial.client("+8801716250651");
        } else {
            console.log('Handling app-to-phone call to:', targetNumber);
            const dial = twiml.dial({
                callerId: process.env.TWILIO_PHONE_NUMBER,
                timeout: 30,
                record: 'do-not-record'
            });
            dial.number(targetNumber);
        }

        console.log('Generated TwiML:', twiml.toString());

        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error) {
        console.error('Voice webhook error:', error);
        const twiml = new VoiceResponse();
        twiml.say('An error occurred. Please try again later.');

        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}