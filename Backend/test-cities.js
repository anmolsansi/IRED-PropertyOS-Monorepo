const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const rajasthan = await prisma.state.findFirst({ where: { name: 'Rajasthan' } });
  console.log('Rajasthan State:', rajasthan);

  if (rajasthan) {
    const cities = await prisma.city.findMany({ where: { stateId: rajasthan.id } });
    console.log('Rajasthan Cities:', cities);
  }
  
  await prisma.$disconnect();
}
test();
