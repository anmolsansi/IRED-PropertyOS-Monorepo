require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const b = await prisma.building.findFirst({ where: { buildingCode: 'BLD-20260630-C91FC16D' } });
  if (!b) {
    console.log("No building found");
    return;
  }
  console.log('Building cityId:', b.cityId, 'cityName:', b.cityName);
  
  if (b.cityId) {
    const c = await prisma.city.findUnique({ where: { id: b.cityId } });
    console.log('City from DB by cityId:', c);
  }
  
  const allCities = await prisma.city.findMany({ where: { stateId: b.stateId } });
  console.log('All cities for this state:', allCities.map(c => ({ id: c.id, name: c.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
