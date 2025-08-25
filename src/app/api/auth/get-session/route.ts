import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error("Session check error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}