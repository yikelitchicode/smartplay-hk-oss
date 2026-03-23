import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl = "postgresql://dummy:dummy@localhost:5432/dummy";

export default defineConfig({
	schema: "./prisma/schema.prisma",
	migrations: {
		path: "./prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	datasource: {
		url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
	},
});
