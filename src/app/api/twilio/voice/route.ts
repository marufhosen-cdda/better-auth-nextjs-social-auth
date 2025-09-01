// import { NextRequest, NextResponse } from 'next/server';
// import twilio from 'twilio';

// const VoiceResponse = twilio.twiml.VoiceResponse;

// export async function POST(request: NextRequest) {
//     try {
//         console.log('Voice webhook called');

//         const formData = await request.formData();
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

import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: Request) {
    try {
        // Try parsing as JSON first
        let params: any = {};

        try {
            params = await req.json();
            console.log("Parsed as JSON:", params);
        } catch (jsonError) {
            console.log("Not JSON, trying form data...");

            // If JSON fails, try form data
            const bodyText = await req.text();
            console.log("Raw body:", bodyText);

            const urlParams = new URLSearchParams(bodyText);
            params = Object.fromEntries(urlParams.entries());
            console.log("Parsed as form data:", params);
        }

        // Twilio often sends parameters in different cases and formats
        const to = params.To || params.to || params.Called || params.called;
        const from = params.From || params.from || params.Caller || params.caller;
        const foo = params.Foo || params.foo;

        console.log("Extracted params:", { to, from, foo });
        console.log("All available params:", params);

        const twiml = new twilio.twiml.VoiceResponse();

        if (to) {
            console.log("Dialing to:", to);
            const dial = twiml.dial();
            dial.client(to);
        } else {
            console.log("No recipient found, available params:", Object.keys(params));
            twiml.say("No recipient specified");
        }

        return new NextResponse(twiml.toString(), {
            headers: { "Content-Type": "text/xml" },
        });

    } catch (error) {
        console.error("Webhook error:", error);

        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("An error occurred");

        return new NextResponse(twiml.toString(), {
            headers: { "Content-Type": "text/xml" },
        });
    }
}