import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookouts() {
  console.log('Checking for existing bookouts in the database...\n');

  try {
    // 1. Count total bookouts
    const totalBookouts = await prisma.bookout.count();
    console.log(`Total bookouts: ${totalBookouts}`);

    if (totalBookouts > 0) {
      // 2. Get bookouts grouped by provider
      const bookoutsByProvider = await prisma.bookout.groupBy({
        by: ['provider'],
        _count: {
          id: true
        }
      });
      console.log('\nBookouts by provider:');
      bookoutsByProvider.forEach(group => {
        console.log(`  ${group.provider}: ${group._count.id} bookouts`);
      });

      // 3. Get sample bookouts with vehicle and organization info
      const sampleBookouts = await prisma.bookout.findMany({
        take: 5,
        include: {
          vehicle: {
            include: {
              organization: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('\nRecent bookouts (up to 5):');
      for (const bookout of sampleBookouts) {
        console.log(`\n  Bookout ID: ${bookout.id}`);
        console.log(`  Provider: ${bookout.provider}`);
        console.log(`  Vehicle VIN: ${bookout.vehicle.vin}`);
        console.log(`  Organization: ${bookout.vehicle.organization.name} (${bookout.vehicle.organization.slug})`);
        console.log(`  Created: ${bookout.createdAt.toISOString()}`);
        console.log(`  Values: Trade-In: $${bookout.cleanTradeIn || 'N/A'}, Retail: $${bookout.cleanRetail || 'N/A'}`);
      }

      // 4. Get organizations that have bookouts
      const vehiclesWithBookouts = await prisma.vehicle.findMany({
        where: {
          bookouts: {
            some: {}
          }
        },
        select: {
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              bookouts: true
            }
          }
        },
        distinct: ['organizationId']
      });

      console.log('\n\nOrganizations with bookouts:');
      const orgMap = new Map();
      for (const vehicle of vehiclesWithBookouts) {
        if (!orgMap.has(vehicle.organization.id)) {
          orgMap.set(vehicle.organization.id, {
            name: vehicle.organization.name,
            slug: vehicle.organization.slug,
            bookoutCount: 0
          });
        }
      }

      // Get actual counts per org
      for (const [orgId, orgData] of orgMap) {
        const count = await prisma.bookout.count({
          where: {
            vehicle: {
              organizationId: orgId
            }
          }
        });
        console.log(`  ${orgData.name} (${orgData.slug}): ${count} bookouts`);
      }

      // 5. Check for users associated with these organizations
      const orgsWithBookouts = Array.from(orgMap.keys());
      if (orgsWithBookouts.length > 0) {
        const users = await prisma.organizationUser.findMany({
          where: {
            organizationId: {
              in: orgsWithBookouts
            }
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            },
            organization: {
              select: {
                name: true,
                slug: true
              }
            }
          }
        });

        console.log('\n\nUsers in organizations with bookouts:');
        for (const orgUser of users) {
          console.log(`  ${orgUser.user.email} (${orgUser.user.name || 'No name'}) - ${orgUser.role} at ${orgUser.organization.name}`);
        }
      }

      // 6. Get a sample VIN that has bookouts for testing
      const vehicleWithBookout = await prisma.vehicle.findFirst({
        where: {
          bookouts: {
            some: {}
          }
        },
        include: {
          bookouts: {
            take: 1
          }
        }
      });

      if (vehicleWithBookout) {
        console.log('\n\nSample VIN for testing:');
        console.log(`  VIN: ${vehicleWithBookout.vin}`);
        console.log(`  Vehicle UUID: ${vehicleWithBookout.uuid}`);
        console.log(`  Has ${vehicleWithBookout.bookouts.length} bookout(s)`);
      }
    } else {
      console.log('\nNo bookouts found in the database.');
    }

  } catch (error) {
    console.error('Error querying bookouts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookouts();