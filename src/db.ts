import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { envConfig } from "./lib/env.js";

const adapter = new PrismaPg({
	connectionString: envConfig.databaseUrl,
});

declare global {
	var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (envConfig.isDevelopment) {
	globalThis.__prisma = prisma;
}

/**
 * Disconnect Prisma from the database
 * Call this on graceful shutdown
 */
export async function disconnectDatabase(): Promise<void> {
	try {
		await prisma.$disconnect();
		console.log("✅ Database disconnected successfully");
	} catch (error) {
		console.error("❌ Error disconnecting database:", error);
		throw error;
	}
}
