import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Syncing missing cities and localities from buildings...");

  const buildings = await prisma.building.findMany({
    where: {
      deletedAt: null,
    },
  });

  for (const building of buildings) {
    let updated = false;
    let cityId = building.cityId;
    let localityId = building.localityId;

    if (building.cityName && !cityId && building.stateId) {
      let city = await prisma.city.findFirst({
        where: { name: building.cityName, stateId: building.stateId },
      });
      if (!city) {
        city = await prisma.city.create({
          data: { name: building.cityName, stateId: building.stateId },
        });
        console.log(`Created missing City: ${building.cityName}`);
      }
      cityId = city.id;
      updated = true;
    }

    if (building.localityName && !localityId && cityId) {
      let locality = await prisma.locality.findFirst({
        where: { name: building.localityName, cityId: cityId },
      });
      if (!locality) {
        locality = await prisma.locality.create({
          data: { name: building.localityName, cityId: cityId },
        });
        console.log(`Created missing Locality: ${building.localityName}`);
      }
      localityId = locality.id;
      updated = true;
    }

    if (updated) {
      await prisma.building.update({
        where: { id: building.id },
        data: {
          cityId,
          localityId,
        },
      });
      console.log(`Updated building ${building.buildingCode} with references.`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
