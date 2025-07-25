import { db } from './lib/db';

async function deleteOldBookouts() {
  // Find bookouts with "Unknown Accessory" names
  const bookoutsWithBadAccessories = await db.bookout.findMany({
    where: {
      provider: 'jdpower',
      accessories: {
        some: {
          name: 'Unknown Accessory'
        }
      }
    },
    include: {
      accessories: true
    }
  });

  console.log(`Found ${bookoutsWithBadAccessories.length} bookouts with bad accessory data`);

  // Delete them
  for (const bookout of bookoutsWithBadAccessories) {
    console.log(`Deleting bookout ${bookout.id} with ${bookout.accessories.length} bad accessories`);
    await db.bookout.delete({
      where: { id: bookout.id }
    });
  }

  console.log('Done!');
  process.exit(0);
}

deleteOldBookouts().catch(console.error);