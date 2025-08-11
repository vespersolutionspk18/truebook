import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsersWithBookouts() {
  console.log('Checking which users have bookouts...\n');

  try {
    // Get all vehicles with bookouts and their organizations
    const vehiclesWithBookouts = await prisma.vehicle.findMany({
      where: {
        bookouts: {
          some: {}
        }
      },
      include: {
        organization: {
          include: {
            users: {
              include: {
                user: true
              }
            }
          }
        },
        bookouts: {
          select: {
            id: true,
            provider: true,
            createdAt: true
          }
        }
      }
    });

    // Create a map of users and their bookout counts
    const userBookoutMap = new Map();

    for (const vehicle of vehiclesWithBookouts) {
      for (const orgUser of vehicle.organization.users) {
        const userKey = orgUser.user.email;
        if (!userBookoutMap.has(userKey)) {
          userBookoutMap.set(userKey, {
            id: orgUser.user.id,
            email: orgUser.user.email,
            name: orgUser.user.name,
            organizations: new Set(),
            bookoutCount: 0,
            role: orgUser.role
          });
        }
        const userData = userBookoutMap.get(userKey);
        userData.organizations.add(vehicle.organization.name);
        userData.bookoutCount += vehicle.bookouts.length;
      }
    }

    console.log('Users with bookouts:\n');
    console.log('='.repeat(80));
    
    for (const [email, userData] of userBookoutMap) {
      console.log(`\nUser: ${userData.name || 'No name'}`);
      console.log(`Email: ${userData.email}`);
      console.log(`User ID: ${userData.id}`);
      console.log(`Role: ${userData.role}`);
      console.log(`Organizations: ${Array.from(userData.organizations).join(', ')}`);
      console.log(`Total bookouts in their org(s): ${userData.bookoutCount}`);
      console.log('-'.repeat(40));
    }

    // Also show a summary
    console.log('\nSUMMARY:');
    console.log(`Total users with access to bookouts: ${userBookoutMap.size}`);
    
    // List just the emails for easy reference
    console.log('\nUser emails with bookouts:');
    for (const [email] of userBookoutMap) {
      console.log(`  - ${email}`);
    }

  } catch (error) {
    console.error('Error querying users with bookouts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersWithBookouts();