import { PrismaClient } from "@prisma/client";

declare global {
  var cachedPrisma: PrismaClient;
}

let prismaClient: PrismaClient | null = null;

async function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
    try {
      await prismaClient.$connect();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      prismaClient = null;
      throw error;
    }
  }
  return prismaClient;
}

let db: PrismaClient;

if (process.env.NODE_ENV === "production") {
  // Initialize database connection in production
  getPrismaClient()
    .then((client) => {
      db = client;
      console.log('Database connected in production mode');
    })
    .catch((error) => {
      console.error('Failed to initialize database in production:', error);
      process.exit(1); // Exit if we can't connect to the database in production
    });
} else {
  // Initialize database connection in development
  if (!global.cachedPrisma) {
    getPrismaClient()
      .then((client) => {
        global.cachedPrisma = client;
        db = client; // Assign the client to db after successful initialization
        console.log('Database connected in development mode');
      })
      .catch((error) => {
        console.error('Failed to initialize database in development:', error);
        throw error; // Propagate the error
      });
  } else {
    db = global.cachedPrisma; // Only assign if cached client exists
  }
}

export { db }