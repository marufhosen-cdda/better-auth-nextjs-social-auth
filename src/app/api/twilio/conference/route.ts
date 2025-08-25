import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
    try {
        const { participants, conferenceName } = await request.json();

        if (!participants || !Array.isArray(participants)) {
            return NextResponse.json(
                { error: 'Participants array is required' },
                { status: 400 }
            );
        }

        const calls = [] as Array<{
            callSid: string | null;
            participant: string;
            status: string;
            error?: string;
        }>;

        // Create calls for each participant
        for (const participant of participants) {
            try {
                const call = await client.calls.create({
                    to: participant,
                    from: process.env.TWILIO_PHONE_NUMBER || '',
                    twiml: `
            <Response>
              <Dial>
                <Conference 
                  startConferenceOnEnter="true"
                  endConferenceOnExit="false"
                  waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
                  maxParticipants="10"
                >
                  ${conferenceName}
                </Conference>
              </Dial>
            </Response>
          `
                });

                calls.push({
                    callSid: call.sid,
                    participant,
                    status: call.status
                });
            } catch (error: any) {
                console.error(`Failed to call ${participant}:`, error);
                calls.push({
                    callSid: null,
                    participant,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            conferenceName,
            calls,
            participants: participants.map(p => ({
                callSid: calls.find(c => c.participant === p)?.callSid,
                identity: p,
                muted: false
            }))
        });
    } catch (error) {
        console.error('Conference creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create conference' },
            { status: 500 }
        );
    }
}