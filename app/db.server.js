import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma instances during Remix hot reload in development
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

export default prisma;
