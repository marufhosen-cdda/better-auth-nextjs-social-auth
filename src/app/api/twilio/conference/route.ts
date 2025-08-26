import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
    try {
        const { participants, conferenceName } = await request.json();

        console.log('Create conference request:', { participants, conferenceName });

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return NextResponse.json(
                { error: 'Participants array is required and must not be empty' },
                { status: 400 }
            );
        }

        if (!process.env.TWILIO_PHONE_NUMBER) {
            console.error('Missing TWILIO_PHONE_NUMBER environment variable');
            return NextResponse.json(
                { error: 'Server configuration error: missing phone number' },
                { status: 500 }
            );
        }

        const calls = [] as Array<{
            callSid: string | null;
            participant: string;
            status: string;
            error?: string;
        }>;

        console.log('Creating calls for participants:', participants);

        // Create calls for each participant
        for (const participant of participants) {
            try {
                // Validate phone number format
                const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
                if (!phoneRegex.test(participant)) {
                    console.warn(`Invalid phone number format: ${participant}`);
                    calls.push({
                        callSid: null,
                        participant,
                        status: 'failed',
                        error: 'Invalid phone number format'
                    });
                    continue;
                }

                console.log(`Creating call for participant: ${participant}`);

                const call = await client.calls.create({
                    to: participant,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    twiml: `
<Response>
    <Dial>
        <Conference 
            startConferenceOnEnter="true"
            endConferenceOnExit="false"
            waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
            maxParticipants="10"
            record="do-not-record"
        >
            ${conferenceName}
        </Conference>
    </Dial>
</Response>`,
                    statusCallback: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'}/api/twilio/status`,
                    statusCallbackMethod: 'POST',
                    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
                });

                console.log(`Call created for ${participant}:`, { callSid: call.sid, status: call.status });

                calls.push({
                    callSid: call.sid,
                    participant,
                    status: call.status
                });

            } catch (error: any) {
                console.error(`Failed to call ${participant}:`, {
                    error: error.message,
                    code: error.code,
                    participant
                });

                calls.push({
                    callSid: null,
                    participant,
                    status: 'failed',
                    error: error.message || 'Unknown error'
                });
            }
        }

        const response = {
            conferenceName,
            calls,
            participants: participants.map(p => {
                const call = calls.find(c => c.participant === p);
                return {
                    callSid: call?.callSid || null,
                    identity: p,
                    muted: false,
                    status: call?.status || 'failed'
                };
            }),
            totalParticipants: participants.length,
            successfulCalls: calls.filter(c => c.callSid !== null).length,
            failedCalls: calls.filter(c => c.callSid === null).length
        };

        console.log('Conference created:', response);

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('Conference creation error:', {
            error: error.message,
            code: error.code,
            moreInfo: error.moreInfo
        });

        return NextResponse.json(
            {
                error: 'Failed to create conference',
                details: error.message,
                code: error.code
            },
            { status: 500 }
        );
    }
}