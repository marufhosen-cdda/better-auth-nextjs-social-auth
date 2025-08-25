import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);

// import { getAuth } from "@/lib/auth";
// const auth = getAuth();
// export const { GET, POST } = auth.handler;