// utils/checkTwilioConfig.ts
export function checkTwilioEnvironment() {
    const requiredVars = [
        'TWILIO_ACCOUNT_SID',
        'TWIML_API_KEY',
        'TWILIO_API_KEY_SECRET',
        'TWIML_APP_SID',
        'TWILIO_PHONE_NUMBER'
    ];

    const missing: string[] = [];
    const present: { [key: string]: boolean } = {};

    requiredVars.forEach(varName => {
        const value = process.env[varName];
        present[varName] = !!value;
        if (!value) {
            missing.push(varName);
        } else {
            console.log(`✓ ${varName}: ${value.substring(0, 10)}...`);
        }
    });

    if (missing.length > 0) {
        console.error('❌ Missing environment variables:', missing);
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ All Twilio environment variables are set');
    return present;
}

// Add this to your token route to debug
// pages/api/twilio/token/route.ts
// import { checkTwilioEnvironment } from '@/utils/checkTwilioConfig';

// export async function POST(request: NextRequest) {
//     try {
//         // Check environment first
//         checkTwilioEnvironment();

//         const { identity } = await request.json();
//         // ... rest of your existing code
//     } catch (error) {
//         console.error("Configuration error:", error);
//         return NextResponse.json(
//             { error: "Server configuration error" },
//             { status: 500 }
//         );
//     }
// }