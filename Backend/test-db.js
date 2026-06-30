const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const delhi = await prisma.state.findFirst({ where: { name: 'Delhi' } });
  console.log('Delhi state:', delhi);
  if (delhi) {
    const cities = await prisma.city.findMany({ where: { stateId: delhi.id } });
    console.log('Cities in Delhi:', cities);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
