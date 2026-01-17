/**
 * Nitro Plugin: Security Headers
 *
 * Adds security headers including Content-Security-Policy for Cloudflare Turnstile.
 * This plugin runs on the server and adds headers to all responses.
 *
 * @vitest-environment false
 */

export default defineNitroPlugin((nitro: any) => {
	nitro.hooks.hook("render:response", (response: any) => {
		// Add security headers to all HTML responses
		const contentType = response.headers.get("content-type");
		if (contentType?.includes("text/html")) {
			const isDev = import.meta.env.DEV;

			// Content Security Policy
			// Allows Cloudflare Turnstile to function properly
			const cspDirectives = [
				// Default to same-origin for most resources
				"default-src 'self';",
				// Allow Cloudflare Turnstile iframes
				"frame-src 'self' https://challenges.cloudflare.com;",
				// Allow Turnstile scripts (inline needed for dynamic loading)
				"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;",
				// Allow Turnstile styles
				"style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;",
				// Allow images and data URLs
				"img-src 'self' data: blob: https:;",
				// Allow font data
				"font-src 'self' data:;",
				// Allow connections to Turnstile API
				"connect-src 'self' https://challenges.cloudflare.com wss://challenges.cloudflare.com;",
				// Allow media and data URLs for Turnstile challenges
				"media-src 'self' blob: data:;",
				// Block object/embed
				"object-src 'none';",
				// Restrict base URI
				"base-uri 'self';",
				// Allow form submissions to same origin
				"form-action 'self';",
				// Frame ancestors (now supported in HTTP headers!)
				"frame-ancestors 'self';",
				// Upgrade insecure requests to HTTPS
				"upgrade-insecure-requests;",
				// Report-uri for CSP violations (optional, for monitoring)
				isDev ? "" : "report-uri /csp-report;",
			]
				.filter(Boolean)
				.join(" ");

			response.headers.set("Content-Security-Policy", cspDirectives);

			// Additional security headers
			response.headers.set("X-Content-Type-Options", "nosniff");
			response.headers.set("X-Frame-Options", "SAMEORIGIN");
			response.headers.set("X-XSS-Protection", "1; mode=block");
			response.headers.set(
				"Referrer-Policy",
				"strict-origin-when-cross-origin",
			);
			response.headers.set(
				"Permissions-Policy",
				"geolocation=(), microphone=(), camera=()",
			);

			// HSTS (only in production with HTTPS)
			if (!isDev) {
				response.headers.set(
					"Strict-Transport-Security",
					"max-age=31536000; includeSubDomains; preload",
				);
			}
		}
	});
});

// Type declarations for Nitro plugin
function defineNitroPlugin(setup: (nitro: any) => void | Promise<void>): void {
	// This will be replaced by Nitro's actual plugin system at runtime
	setup({} as any); // Use parameter to avoid "declared but never read" error
}
