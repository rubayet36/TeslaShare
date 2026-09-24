import { PrismaClient, Role, VehicleStatus, PoolStatus, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Dhaka Tesla Pool (TeslaShare)...');

  // Clean existing records in reverse relational order
  await prisma.poolMember.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records.');

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Jashim (The Legendary Driver of "Bullet")
  const jashim = await prisma.user.create({
    data: {
      name: 'Jashim',
      phone: '+8801711000001',
      email: 'jashim@tesla-pool.dhaka',
      passwordHash: defaultPasswordHash,
      role: Role.DRIVER,
      walletPoysha: 0,
    },
  });

  // 2. Seed Jashim's Electric Tesla 3-Wheeler: "Bullet" (Capacity: 3 seats)
  const bullet = await prisma.vehicle.create({
    data: {
      name: 'Bullet',
      model: "Dhaka Electric 3-Wheeler 'Tesla' Bullet",
      licensePlate: 'DHAKA-METRO-HA-11-2026',
      capacity: 3, // Exactly 3 seats as mandated by Section 1 & 3
      status: VehicleStatus.ONLINE,
      currentZone: 'Banani',
      driverId: jashim.id,
    },
  });

  // 3. Seed Nusrat (Passenger 1: Heading from Banani to Mohakhali)
  const nusrat = await prisma.user.create({
    data: {
      name: 'Nusrat',
      phone: '+8801811000002',
      email: 'nusrat@gmail.com',
      passwordHash: defaultPasswordHash,
      role: Role.PASSENGER,
      walletPoysha: 150000, // 1500 BDT
      transactions: {
        create: [
          {
            amountPoysha: 150000,
            type: TransactionType.TOPUP,
            description: 'TeslaPay Wallet initial top-up',
          },
        ],
      },
    },
  });

  // 4. Seed Rafiq (Passenger 2: Heading from Banani to Gulshan 1)
  const rafiq = await prisma.user.create({
    data: {
      name: 'Rafiq',
      phone: '+8801911000003',
      email: 'rafiq@gmail.com',
      passwordHash: defaultPasswordHash,
      role: Role.PASSENGER,
      walletPoysha: 120000, // 1200 BDT
      transactions: {
        create: [
          {
            amountPoysha: 120000,
            type: TransactionType.TOPUP,
            description: 'TeslaPay Wallet initial top-up',
          },
        ],
      },
    },
  });

  // 5. Seed Shirin (Passenger 3: Grabbing the last seat)
  const shirin = await prisma.user.create({
    data: {
      name: 'Shirin',
      phone: '+8801611000004',
      email: 'shirin@gmail.com',
      passwordHash: defaultPasswordHash,
      role: Role.PASSENGER,
      walletPoysha: 100000, // 1000 BDT
      transactions: {
        create: [
          {
            amountPoysha: 100000,
            type: TransactionType.TOPUP,
            description: 'TeslaPay Wallet initial top-up',
          },
        ],
      },
    },
  });

  // 6. Seed Active Available Pool for Jashim & Bullet in Banani
  const initialPool = await prisma.pool.create({
    data: {
      driverId: jashim.id,
      vehicleId: bullet.id,
      status: PoolStatus.OPEN,
      totalSeats: 3,
      availableSeats: 3,
      pickupZone: 'Banani',
      currentZone: 'Banani',
    },
  });

  console.log('✅ Seed completed successfully with PRD Story Cast:');
  console.log(`   - Driver: ${jashim.name} with vehicle "${bullet.name}" (Capacity: ${bullet.capacity} seats)`);
  console.log(`   - Passengers: ${nusrat.name}, ${rafiq.name}, and ${shirin.name}`);
  console.log(`   - Active Pool ID: ${initialPool.id} (${initialPool.availableSeats}/${initialPool.totalSeats} seats available)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
