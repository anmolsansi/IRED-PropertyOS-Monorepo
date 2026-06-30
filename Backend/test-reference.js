const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const delhi = await prisma.state.findFirst({ where: { name: 'Delhi' } });
  console.log('Delhi State:', delhi);

  if (delhi) {
    const cities = await prisma.city.findMany({ where: { stateId: delhi.id } });
    console.log('Delhi Cities:', cities);
  }
  
  await prisma.$disconnect();
}
test();
