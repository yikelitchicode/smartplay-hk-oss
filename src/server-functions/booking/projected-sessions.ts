import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/lib/server-utils/error-handler";
import { SessionProjector } from "@/lib/watch/services/session-projector";

const sessionProjector = new SessionProjector();

export const getProjectedSessions = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			venueId: z.string(),
			facilityCode: z.string(),
			startDay: z.number().int().min(0).optional().default(8),
			endDay: z.number().int().max(60).optional().default(36),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const sessions = await sessionProjector.projectSessions(
				data.venueId,
				data.facilityCode,
				data.startDay,
				data.endDay,
			);

			return createSuccessResponse(sessions);
		} catch (error) {
			console.error("Error fetching projected sessions:", error);
			return createErrorResponse(
				error instanceof Error
					? error.message
					: "Failed to fetch projected sessions",
				"FETCH_PROJECTED_SESIONS_ERROR",
			);
		}
	});
