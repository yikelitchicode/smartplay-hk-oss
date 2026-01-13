
import { prisma } from "../src/db";

async function verify() {
    const jobs = await prisma.crawlJob.findMany({ orderBy: { startedAt: 'desc' }, take: 1 });
    console.log("Latest Job:", JSON.stringify(jobs[0], null, 2));
    
    const facilities = await prisma.facility.count();
    console.log("Total Facilities:", facilities);
    
    const sessions = await prisma.session.count();
    console.log("Total Sessions:", sessions);
}

verify().catch(console.error).finally(() => prisma.$disconnect());
