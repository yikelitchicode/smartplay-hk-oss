import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { prisma as db } from "@/db";

const COOKIE_NAME = "smartplay_browser_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

/**
 * Get or create browser session from HTTP request cookies
 */
export async function getOrCreateBrowserSessionId(): Promise<string> {
	const req = getRequest();
	if (!req) {
		throw new Error("No web request context available");
	}

	// 1. Try to get existing session from cookie
	const cookieId = getCookie(COOKIE_NAME);

	if (cookieId) {
		// Verify session exists in DB
		const session = await db.browserSession.findUnique({
			where: { id: cookieId },
		});

		if (session) {
			// Update last active timestamp if needed (optional optimization: only update if old)
			// For now, simple return
			return session.id;
		}
	}

	// 2. Create new session
	const newSession = await db.browserSession.create({
		data: {
			expiresAt: new Date(Date.now() + COOKIE_MAX_AGE * 1000),
		},
	});

	// 3. Set cookie
	setCookie(COOKIE_NAME, newSession.id, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: COOKIE_MAX_AGE,
	});

	return newSession.id;
}
