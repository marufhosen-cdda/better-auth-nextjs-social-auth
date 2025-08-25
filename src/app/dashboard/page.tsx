"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.push("/");
                    },
                },
            });
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
                    <button
                        onClick={() => router.push("/auth")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold">Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                {session.user.image && (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}
                                <span className="text-sm font-medium">
                                    {session.user.name}
                                </span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                Welcome to your Dashboard!
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h4 className="font-medium mb-2">User Information:</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <p><strong>Name:</strong> {session.user.name}</p>
                                    <p><strong>Email:</strong> {session.user.email}</p>
                                    <p><strong>ID:</strong> {session.user.id}</p>
                                    <p><strong>Email Verified:</strong> {session.user.emailVerified ? "Yes" : "No"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}