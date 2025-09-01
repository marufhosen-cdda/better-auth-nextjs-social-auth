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
    const body = await req.formData(); // Twilio sends x-www-form-urlencoded
    const to = "1F09IOqtD6aHmfjygX92mT7TDx2pIozb"

    console.log("Voice webhook called with To:", body);


    const twiml = new twilio.twiml.VoiceResponse();

    if (to) {
        const dial = twiml.dial();
        dial.client(to); // route to recipient identity
    } else {
        twiml.say("No recipient specified");
    }

    return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
    });
}
