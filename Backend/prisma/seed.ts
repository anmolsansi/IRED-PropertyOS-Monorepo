import {
  PrismaClient,
  UserRole,
  TaskType,
  TaskStatus,
  DealStatus,
  SiteVisitStatus,
  Priority,
} from '../src/generated/prisma';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OD' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' },
];

const MAJOR_CITIES: Record<string, string[]> = {
  AP: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
  AR: ['Itanagar', 'Tawang', 'Pasighat'],
  AS: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat'],
  BR: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
  CG: ['Raipur', 'Bhilai', 'Bilaspur'],
  GA: ['Panaji', 'Vasco da Gama', 'Mapusa'],
  GJ: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  HR: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  HP: ['Shimla', 'Manali', 'Dharamsala'],
  JH: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  KA: ['Bengaluru', 'Mysuru', 'Hubli-Dharwad', 'Mangaluru', 'Belgaum'],
  KL: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  MP: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
  MH: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
  MN: ['Imphal'],
  ML: ['Shillong', 'Tura'],
  MZ: ['Aizawl'],
  NL: ['Kohima', 'Dimapur'],
  OD: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
  PB: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
  RJ: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  SK: ['Gangtok'],
  TN: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  TS: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad'],
  TR: ['Agartala'],
  UP: ['Lucknow', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Kanpur'],
  UK: ['Dehradun', 'Haridwar', 'Haldwani'],
  WB: ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'],
};

const PROPERTY_TYPES = [
  'Office', 'Retail', 'Warehouse', 'Industrial', 'Residential',
  'CoWorking', 'Plot', 'Farmhouse',
];

const FURNISHING_STATUSES = [
  'Unfurnished', 'Semi Furnished', 'Fully Furnished', 'Warm Shell', 'Bare Shell',
];

const AVAILABILITY_STATUSES = [
  'Available', 'Occupied', 'Under Maintenance', 'Coming Soon',
  'Not Available', 'Reserved',
];

const VERIFICATION_STATUSES = [
  'Unverified', 'Under Review', 'Verified', 'Discrepancy Found',
];

const CONTACT_ROLES = [
  'Owner', 'Landlord', 'Tenant', 'Manager', 'Agent',
  'Facility Manager', 'Security', 'Maintenance', 'Legal', 'Accountant',
];

const DOCUMENT_CATEGORIES = [
  'Lease Agreement', 'NOC Certificate', 'Sale Deed', 'Tax Receipt',
  'Occupancy Certificate', 'Building Plan', 'Insurance', 'Photograph',
  'ID Proof', 'Other',
];

const SOURCES = [
  'Manual Entry', 'Website', 'Referral', '99acres', 'MagicBricks',
  'Housing.com', 'JustDial', 'Google Maps', 'Walk-in', 'Existing Client',
];

const LOCALITIES: Record<string, string[]> = {
  Mumbai: ['Andheri', 'Bandra', 'BKC', 'Lower Parel', 'Worli', 'Nariman Point', 'Fort', 'Colaba', 'Powai', 'Goregaon', 'Malad', 'Borivali', 'Thane', 'Navi Mumbai', 'Kurla', 'Chembur'],
  Pune: ['Hinjewadi', 'Kharadi', 'Wakad', 'Baner', 'Aundh', 'Kothrud', 'Viman Nagar', 'Koregaon Park', 'Hadapsar', 'Magarpatta', 'Swargate', 'Shivajinagar'],
  Bengaluru: ['Whitefield', 'Electronic City', 'Outer Ring Road', 'Koramangala', 'Indiranagar', 'HSR Layout', 'BTM Layout', 'Marathahalli', 'Bellandur', 'Sarjapur Road', 'Hebbal', 'Yelahanka'],
  Hyderabad: ['HITEC City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Jubilee Hills', 'Banjara Hills', 'Secunderabad', 'Kukatpally', 'Financial District', 'Nanakramguda'],
  'Delhi NCR': ['Connaught Place', 'Nehru Place', 'Saket', 'Dwarka', 'Rohini', 'Gurugram DLF', 'Gurugram Cyber Hub', 'Noida Sector 62', 'Noida Sector 18', 'Faridabad', 'Ghaziabad', 'Lajpat Nagar', 'Karol Bagh', 'Janakpuri'],
  Chennai: ['T. Nagar', 'Anna Nagar', 'Adyar', 'OMR', 'Porur', 'Sholinganallur', 'Thoraipakkam', 'Velachery', 'Guindy', 'Ambattur'],
  Kolkata: ['Salt Lake', 'New Town', 'Park Street', 'BBD Bagh', 'EM Bypass', 'Sector V', 'Rajarhat', 'Howrah', 'Durgapur'],
  Ahmedabad: ['SG Highway', 'CG Road', 'Vastrapur', 'Satellite', 'Paldi', 'Ashram Road', 'Science City Road', 'Gota', 'Thaltej'],
};

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ────────────────────────────────────────
  const adminPasswordHash = await argon2.hash('Admin@123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ired.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@ired.com',
      mobileNumber: '9999999999',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      emailVerifiedAt: new Date(),
      mobileVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Admin user: ${adminUser.email}`);

  // ─── Worker User ──────────────────────────────────────
  const workerPasswordHash = await argon2.hash('Worker@123');
  const workerUser = await prisma.user.upsert({
    where: { email: 'worker@ired.com' },
    update: {},
    create: {
      fullName: 'Test Worker',
      email: 'worker@ired.com',
      mobileNumber: '8888888888',
      passwordHash: workerPasswordHash,
      role: UserRole.WORKER,
      emailVerifiedAt: new Date(),
      mobileVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ Worker user: ${workerUser.email}`);

  // ─── States ────────────────────────────────────────────
  const stateMap = new Map<string, string>();
  for (const state of INDIAN_STATES) {
    const record = await prisma.state.upsert({
      where: { code: state.code },
      update: {},
      create: { name: state.name, code: state.code },
    });
    stateMap.set(state.code, record.id);
  }
  console.log(`  ✅ ${INDIAN_STATES.length} states`);

  // ─── Cities ────────────────────────────────────────────
  const cityMap = new Map<string, string>();
  let cityCount = 0;
  for (const [stateCode, cities] of Object.entries(MAJOR_CITIES)) {
    const stateId = stateMap.get(stateCode);
    if (!stateId) continue;

    for (const cityName of cities) {
      const existing = await prisma.city.findFirst({
        where: { name: cityName, stateId },
      });
      if (!existing) {
        const created = await prisma.city.create({
          data: { name: cityName, stateId },
        });
        cityMap.set(cityName, created.id);
      } else {
        cityMap.set(cityName, existing.id);
      }
      cityCount++;
    }
  }
  console.log(`  ✅ ${cityCount} cities`);

  // ─── Localities for Major CRE Markets ─────────────────
  let localityCount = 0;
  for (const [cityName, localities] of Object.entries(LOCALITIES)) {
    const cityId = cityMap.get(cityName);
    if (!cityId) continue;

    for (const localityName of localities) {
      const existing = await prisma.locality.findFirst({
        where: { name: localityName, cityId },
      });
      if (!existing) {
        await prisma.locality.create({
          data: { name: localityName, cityId },
        });
      }
      localityCount++;
    }
  }
  console.log(`  ✅ ${localityCount} localities`);

  // ─── Reference Data ────────────────────────────────────
  const upsertMany = async <T extends { name: string }>(
    model: any,
    items: T[],
  ) => {
    for (const item of items) {
      await model.upsert({
        where: { name: item.name || item },
        update: {},
        create: item,
      });
    }
  };

  await upsertMany(prisma.propertyType, PROPERTY_TYPES.map((name) => ({ name })));
  console.log(`  ✅ ${PROPERTY_TYPES.length} property types`);

  await upsertMany(prisma.furnishingStatus, FURNISHING_STATUSES.map((name) => ({ name })));
  console.log(`  ✅ ${FURNISHING_STATUSES.length} furnishing statuses`);

  await upsertMany(prisma.availabilityStatus, AVAILABILITY_STATUSES.map((name) => ({ name })));
  console.log(`  ✅ ${AVAILABILITY_STATUSES.length} availability statuses`);

  await upsertMany(prisma.verificationStatus, VERIFICATION_STATUSES.map((name) => ({ name })));
  console.log(`  ✅ ${VERIFICATION_STATUSES.length} verification statuses`);

  await upsertMany(prisma.contactRole, CONTACT_ROLES.map((name) => ({ name })));
  console.log(`  ✅ ${CONTACT_ROLES.length} contact roles`);

  await upsertMany(prisma.documentCategory, DOCUMENT_CATEGORIES.map((name) => ({ name })));
  console.log(`  ✅ ${DOCUMENT_CATEGORIES.length} document categories`);

  await upsertMany(prisma.source, SOURCES.map((name) => ({ name })));
  console.log(`  ✅ ${SOURCES.length} sources`);

  // ─── Sample Buildings ───────────────────────────────────
  const cityIds = Array.from(cityMap.values());
  const propertyTypes = await prisma.propertyType.findMany();
  const availStatuses = await prisma.availabilityStatus.findMany();
  const furnishingStatuses = await prisma.furnishingStatus.findMany();
  const verifyStatuses = await prisma.verificationStatus.findMany();
  const sources = await prisma.source.findMany();

  const availableStatus = availStatuses.find(s => s.name === 'Available');
  const occupiedStatus = availStatuses.find(s => s.name === 'Occupied');
  const verifiedStatus = verifyStatuses.find(s => s.name === 'Verified');
  const manualSource = sources.find(s => s.name === 'Manual Entry');
  const officeType = propertyTypes.find(t => t.name === 'Office');
  const retailType = propertyTypes.find(t => t.name === 'Retail');
  const warehouseType = propertyTypes.find(t => t.name === 'Warehouse');
  const semiFurnished = furnishingStatuses.find(s => s.name === 'Semi Furnished');
  const unfurnished = furnishingStatuses.find(s => s.name === 'Unfurnished');

  const BUILDING_NAMES = [
    { name: 'One BKC Tower', city: 'Mumbai', locality: 'BKC', floors: 20, units: 80 },
    { name: 'Cyber Hub Tower', city: 'Delhi NCR', locality: 'Gurugram Cyber Hub', floors: 15, units: 60 },
    { name: 'Manyata Tech Park', city: 'Bengaluru', locality: 'Hebbal', floors: 12, units: 48 },
    { name: 'EcoWorld', city: 'Hyderabad', locality: 'Financial District', floors: 10, units: 40 },
    { name: 'RMZ Millenia', city: 'Bengaluru', locality: 'Outer Ring Road', floors: 18, units: 72 },
    { name: 'Palladium Mall', city: 'Mumbai', locality: 'Lower Parel', floors: 5, units: 30 },
    { name: 'World Trade Center', city: 'Pune', locality: 'Viman Nagar', floors: 22, units: 88 },
    { name: 'DLF Phase 5', city: 'Delhi NCR', locality: 'Gurugram DLF', floors: 16, units: 64 },
    { name: 'Oberoi Mall', city: 'Mumbai', locality: 'Goregaon', floors: 4, units: 24 },
    { name: 'Brigade Gateway', city: 'Bengaluru', locality: 'Rajajinagar', floors: 14, units: 56 },
  ];

  const buildingIds: string[] = [];
  for (const b of BUILDING_NAMES) {
    const cityId = cityMap.get(b.city);
    if (!cityId) continue;

    const building = await prisma.building.upsert({
      where: { buildingCode: b.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30) },
      update: {},
      create: {
        buildingCode: b.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30),
        name: b.name,
        propertyTypeId: officeType?.id,
        cityId,
        localityId: null,
        totalFloors: b.floors,
        totalUnits: b.units,
        totalBuildingArea: b.units * 1200,
        availabilityStatusId: availableStatus?.id,
        verificationStatusId: verifiedStatus?.id,
        sourceId: manualSource?.id,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
    buildingIds.push(building.id);

    // Floors
    const floorIds: string[] = [];
    for (let f = 1; f <= Math.min(b.floors, 5); f++) {
      const floor = await prisma.floor.upsert({
        where: { floorCode: `${building.id}-f${f}` },
        update: {},
        create: {
          floorCode: `${building.id}-f${f}`,
          buildingId: building.id,
          floorName: `Floor ${f}`,
          floorNumber: f,
          totalArea: b.units / b.floors * 1200,
          availabilityStatusId: availableStatus?.id,
          createdBy: adminUser.id,
        },
      });
      floorIds.push(floor.id);

      // Units per floor
      const unitsPerFloor = Math.floor(b.units / b.floors);
      for (let u = 1; u <= Math.min(unitsPerFloor, 4); u++) {
        const unitCode = `${building.id}-f${f}-u${u}`;
        const seed = f * 10 + u;
        const rent = Math.floor(40000 + (seed * 17389) % 160000);
        await prisma.unit.upsert({
          where: { unitCode },
          update: {},
          create: {
            unitCode,
            buildingId: building.id,
            floorId: floor.id,
            unitNumber: `${f}${String(u).padStart(2, '0')}`,
            propertyTypeId: officeType?.id,
            furnishingStatusId: u % 2 === 0 ? semiFurnished?.id : unfurnished?.id,
            availabilityStatusId: u % 3 === 0 ? occupiedStatus?.id : availableStatus?.id,
            carpetArea: 800 + (seed * 137) % 1200,
            builtUpArea: 1000 + (seed * 173) % 1500,
            superBuiltUpArea: 1200 + (seed * 211) % 1800,
            monthlyRent: rent,
            rentPerSqftMonth: rent / 1200,
            securityDeposit: rent * 10,
            lockInPeriodMonths: 12,
            leaseTermMonths: 36,
            gstApplicable: true,
            negotiable: true,
            createdBy: adminUser.id,
          },
        });
      }
    }
  }
  console.log(`  ✅ ${buildingIds.length} buildings with floors and units`);

  // ─── Sample Contacts ───────────────────────────────────
  const CONTACTS = [
    { name: 'Rajesh Kumar', phone: '9876543210', role: 'Owner' },
    { name: 'Priya Sharma', phone: '9876543211', role: 'Landlord' },
    { name: 'Amit Patel', phone: '9876543212', role: 'Agent' },
    { name: 'Sneha Reddy', phone: '9876543213', role: 'Manager' },
    { name: 'Vikram Singh', phone: '9876543214', role: 'Tenant' },
  ];

  const contactIds: string[] = [];
  const contactRoles = await prisma.contactRole.findMany();
  for (const c of CONTACTS) {
    const role = contactRoles.find(r => r.name === c.role);
    const contact = await prisma.contact.findFirst({
      where: { fullName: c.name, buildingId: buildingIds[0] },
    }) ?? await prisma.contact.create({
      data: {
        fullName: c.name,
        mobileNumber: c.phone,
        contactRoleId: role?.id,
        buildingId: buildingIds[0],
        createdBy: adminUser.id,
      },
    });
    contactIds.push(contact.id);
  }
  console.log(`  ✅ ${CONTACTS.length} contacts`);

  // ─── Sample Clients ────────────────────────────────────
  const CLIENTS = [
    { name: 'TechVista Solutions', company: 'TechVista Pvt Ltd', email: 'info@techvista.in', phone: '9800000001' },
    { name: 'GreenField Corp', company: 'GreenField Industries', email: 'contact@greenfield.in', phone: '9800000002' },
    { name: 'Urban Spaces', company: 'Urban Spaces LLC', email: 'hello@urbanspaces.in', phone: '9800000003' },
    { name: 'DataFlow Analytics', company: 'DataFlow Inc', email: 'ops@dataflow.in', phone: '9800000004' },
    { name: 'BrightStar Retail', company: 'BrightStar Retail Pvt Ltd', email: 'retail@brightstar.in', phone: '9800000005' },
  ];

  const clientIds: string[] = [];
  for (const c of CLIENTS) {
    const client = await prisma.client.upsert({
      where: { id: c.email },
      update: {},
      create: {
        id: c.email,
        name: c.name,
        company: c.company,
        email: c.email,
        mobileNumber: c.phone,
        createdBy: adminUser.id,
      },
    }).catch(() => prisma.client.create({
      data: {
        name: c.name,
        company: c.company,
        email: c.email,
        mobileNumber: c.phone,
        createdBy: adminUser.id,
      },
    }));
    clientIds.push(client.id);

    // Client contact
    await prisma.clientContact.findFirst({
      where: { fullName: c.name, clientId: client.id },
    }) ?? await prisma.clientContact.create({
      data: {
        clientId: client.id,
        fullName: c.name,
        mobileNumber: c.phone,
        email: c.email,
        role: 'Primary Contact',
      },
    });

    // Requirement
    await prisma.requirement.findFirst({
      where: { title: `Office space for ${c.name}`, clientId: client.id },
    }) ?? await prisma.requirement.create({
      data: {
        clientId: client.id,
        title: `Office space for ${c.name}`,
        description: `Looking for ${c.company} office space in prime location`,
        minArea: 1000,
        maxArea: 5000,
        minBudget: 50000,
        maxBudget: 200000,
        status: 'active',
        createdBy: adminUser.id,
      },
    });
  }
  console.log(`  ✅ ${CLIENTS.length} clients with contacts and requirements`);

  // ─── Sample Tasks ──────────────────────────────────────
  const TASKS = [
    { title: 'Follow up with TechVista', type: TaskType.follow_up, status: TaskStatus.open, priority: Priority.High },
    { title: 'Site inspection - One BKC', type: TaskType.site_visit, status: TaskStatus.in_progress, priority: Priority.Medium },
    { title: 'Send proposal to GreenField', type: TaskType.general, status: TaskStatus.open, priority: Priority.High },
    { title: 'Lease renewal - Urban Spaces', type: TaskType.follow_up, status: TaskStatus.open, priority: Priority.Urgent },
    { title: 'Property photoshoot - Manyata', type: TaskType.general, status: TaskStatus.completed, priority: Priority.Low },
    { title: 'Verify documents - DLF Phase 5', type: TaskType.general, status: TaskStatus.open, priority: Priority.Medium },
    { title: 'Market analysis report', type: TaskType.general, status: TaskStatus.open, priority: Priority.Medium },
    { title: 'Client meeting - DataFlow', type: TaskType.site_visit, status: TaskStatus.open, priority: Priority.High },
  ];

  for (let i = 0; i < TASKS.length; i++) {
    const t = TASKS[i];
    await prisma.task.findFirst({
      where: { title: t.title, createdBy: adminUser.id },
    }) ?? await prisma.task.create({
      data: {
        title: t.title,
        type: t.type,
        status: t.status,
        priority: t.priority,
        buildingId: buildingIds[i % buildingIds.length],
        clientId: clientIds[i % clientIds.length],
        assignedTo: workerUser.id,
        createdBy: adminUser.id,
        dueDate: new Date(Date.now() + (i + 1) * 86400000),
      },
    });
  }
  console.log(`  ✅ ${TASKS.length} tasks`);

  // ─── Sample Deals ──────────────────────────────────────
  const DEALS = [
    { title: 'TechVista Office Lease - BKC', value: 1800000, status: DealStatus.negotiation },
    { title: 'GreenField Warehouse - Whitefield', value: 960000, status: DealStatus.shortlisted },
    { title: 'Urban Spaces Renewal - Cyber Hub', value: 2400000, status: DealStatus.agreement_shared },
    { title: 'DataFlow Office - HITEC City', value: 1200000, status: DealStatus.site_visit_completed },
    { title: 'BrightStar Retail - Lower Parel', value: 3600000, status: DealStatus.closed },
    { title: 'TechVista Expansion - Manyata', value: 1440000, status: DealStatus.requirement_received },
    { title: 'GreenField Office - Ecoworld', value: 720000, status: DealStatus.lost },
  ];

  for (let i = 0; i < DEALS.length; i++) {
    const d = DEALS[i];
    await prisma.deal.findFirst({
      where: { title: d.title, clientId: clientIds[i % clientIds.length] },
    }) ?? await prisma.deal.create({
      data: {
        title: d.title,
        dealValue: d.value,
        status: d.status,
        clientId: clientIds[i % clientIds.length],
        buildingId: buildingIds[i % buildingIds.length],
        assignedTo: workerUser.id,
        createdBy: adminUser.id,
      },
    });
  }
  console.log(`  ✅ ${DEALS.length} deals`);

  // ─── Sample Site Visits ────────────────────────────────
  const SITE_VISITS = [
    { notes: 'Initial site visit for TechVista', status: SiteVisitStatus.completed },
    { notes: 'Property walkthrough for GreenField', status: SiteVisitStatus.scheduled },
    { notes: 'Final inspection - Urban Spaces', status: SiteVisitStatus.confirmed },
    { notes: 'Due diligence visit - DataFlow', status: SiteVisitStatus.scheduled },
    { notes: 'BrightStar retail location scout', status: SiteVisitStatus.completed },
  ];

  for (let i = 0; i < SITE_VISITS.length; i++) {
    const sv = SITE_VISITS[i];
    const scheduledAt = new Date(Date.now() + (i + 1) * 86400000);
    await prisma.siteVisit.findFirst({
      where: {
        clientId: clientIds[i % clientIds.length],
        buildingId: buildingIds[i % buildingIds.length],
        scheduledAt,
      },
    }) ?? await prisma.siteVisit.create({
      data: {
        clientId: clientIds[i % clientIds.length],
        buildingId: buildingIds[i % buildingIds.length],
        scheduledAt,
        status: sv.status,
        notes: sv.notes,
        assignedTo: workerUser.id,
        createdBy: adminUser.id,
      },
    });
  }
  console.log(`  ✅ ${SITE_VISITS.length} site visits`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
