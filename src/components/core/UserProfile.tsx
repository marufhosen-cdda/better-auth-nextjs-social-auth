"use client";

import { authClient } from "@/lib/auth-client";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function UserProfile() {
    const { data: session, isPending } = authClient.useSession();

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        window.location.href = "/";
                    },
                },
            });
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
                <GoogleSignInButton />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <div className="text-center">
                {session.user.image && (
                    <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-16 h-16 rounded-full mx-auto mb-4"
                    />
                )}
                <h2 className="text-xl font-semibold mb-2">
                    Welcome, {session.user.name}!
                </h2>
                <p className="text-gray-600 mb-4">{session.user.email}</p>
                <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}