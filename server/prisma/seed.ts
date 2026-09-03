/**
 * Seed data: platform registry rows + initial admin account.
 * Run with: npm run db:seed  (requires DATABASE_URL)
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLATFORMS = [
  { slug: 'youtube', name: 'YouTube', enabled: true },
  { slug: 'tiktok', name: 'TikTok', enabled: true },
  { slug: 'instagram', name: 'Instagram', enabled: true },
  { slug: 'facebook', name: 'Facebook', enabled: false },
  { slug: 'x', name: 'X', enabled: false },
  { slug: 'reddit', name: 'Reddit', enabled: false },
  { slug: 'vimeo', name: 'Vimeo', enabled: false },
  { slug: 'twitch', name: 'Twitch', enabled: false },
  { slug: 'dailymotion', name: 'Dailymotion', enabled: false },
  { slug: 'pinterest', name: 'Pinterest', enabled: false },
];

async function main(): Promise<void> {
  for (const p of PLATFORMS) {
    await prisma.platform.upsert({
      where: { slug: p.slug },
      update: { name: p.name },
      create: p,
    });
  }
  console.log(`Seeded ${PLATFORMS.length} platforms`);

  const email = process.env.ADMIN_EMAIL ?? 'admin@fetchly.local';
  const password = process.env.ADMIN_PASSWORD ?? 'change-me-strong-password';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: 'Administrator',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log(`Seeded admin user ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
