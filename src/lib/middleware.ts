/**
 * Security Middleware
 *
 * Sets security headers including Content-Security-Policy for Cloudflare Turnstile.
 * Applied via TanStack Start's server integration.
 */

export function setSecurityHeaders(): Record<string, string> {
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
		// Allow media and data URLs for Turnstile challenges (CRITICAL)
		"media-src 'self' blob: data:;",
		// Block object/embed
		"object-src 'none';",
		// Restrict base URI
		"base-uri 'self';",
		// Allow form submissions to same origin
		"form-action 'self';",
		// Frame ancestors (only works in HTTP headers, not meta tags)
		"frame-ancestors 'self';",
		// Upgrade insecure requests to HTTPS
		"upgrade-insecure-requests;",
		// Report-uri for CSP violations (optional, for monitoring)
		isDev ? "" : "report-uri /csp-report;",
	]
		.filter(Boolean)
		.join(" ");

	return {
		// Content Security Policy
		"Content-Security-Policy": cspDirectives,

		// Additional security headers
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "SAMEORIGIN",
		"X-XSS-Protection": "1; mode=block",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "geolocation=(), microphone=(), camera=()",

		// HSTS (only in production with HTTPS)
		...(isDev
			? {}
			: {
					"Strict-Transport-Security":
						"max-age=31536000; includeSubDomains; preload",
				}),
	};
}

/**
 * Apply security headers to a Response
 */
export function withSecurityHeaders(response: Response): Response {
	const headers = setSecurityHeaders();

	Object.entries(headers).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	return response;
}
