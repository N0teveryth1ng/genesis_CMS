/**
 * Creates the first admin user.
 * Run with: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email    = "admin@genesis.local";
  const password = "genesis123";
  const name     = "Admin";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("✓ Admin user already exists:", email);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { name, email, password: hashed, role: "admin" },
  });

  console.log("✓ Admin user created");
  console.log("  Email:   ", email);
  console.log("  Password:", password);
  console.log("\n  Change the password after first login.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
