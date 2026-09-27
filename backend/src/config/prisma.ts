import 'dotenv/config';
import { lookup } from 'node:dns/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

async function resolveDatabaseUrl(databaseUrl: string | undefined): Promise<string> {
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not defined.');
	}

	const normalizedUrl = databaseUrl.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
	const url = new URL(normalizedUrl);

	if (url.hostname === 'db') {
		try {
			await lookup(url.hostname);
		} catch {
			url.hostname = 'localhost';
			if (!url.port || url.port === '5432') {
				url.port = '9696';
			}
		}
	}

	return url.toString();
}

const connectionString = await resolveDatabaseUrl(process.env.DATABASE_URL);

export const prisma = new PrismaClient({
	adapter: new PrismaPg({
		connectionString,
	}),
});