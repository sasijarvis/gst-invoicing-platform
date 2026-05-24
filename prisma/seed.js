const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gstinvoicing.com' },
    update: {},
    create: {
      email: 'admin@gstinvoicing.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+91-9876543210',
      role: 'ADMIN',
      businessName: 'GST Invoicing Solutions',
      gstNumber: '27AAAAA0000A1Z5',
      panNumber: 'AAAAA0000A',
      businessAddress: '123 Business Street',
      businessCity: 'Mumbai',
      businessState: 'Maharashtra',
      businessPincode: '400001',
      businessCountry: 'India'
    }
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@gstinvoicing.com' },
    update: {},
    create: {
      email: 'demo@gstinvoicing.com',
      password: demoPassword,
      firstName: 'Demo',
      lastName: 'User',
      phone: '+91-9876543211',
      role: 'USER',
      businessName: 'Demo Business Pvt Ltd',
      gstNumber: '27BBBBB0000B1Z5',
      panNumber: 'BBBBB0000B',
      businessAddress: '456 Demo Avenue',
      businessCity: 'Pune',
      businessState: 'Maharashtra',
      businessPincode: '411001',
      businessCountry: 'India'
    }
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create sample customers for demo user
  const customers = [
    {
      name: 'ABC Technologies Pvt Ltd',
      email: 'contact@abctech.com',
      phone: '+91-9876543212',
      gstNumber: '27CCCCC0000C1Z5',
      panNumber: 'CCCCC0000C',
      address: '789 Tech Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
      contactPerson: 'John Doe',
      paymentTerms: 30,
      userId: demoUser.id
    },
    {
      name: 'XYZ Services Ltd',
      email: 'info@xyzservices.com',
      phone: '+91-9876543213',
      gstNumber: '29DDDDD0000D1Z5',
      panNumber: 'DDDDD0000D',
      address: '321 Service Center',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contactPerson: 'Jane Smith',
      paymentTerms: 15,
      userId: demoUser.id
    }
  ];

  for (const customerData of customers) {
    const customer = await prisma.customer.create({
      data: customerData
    });
    console.log('✅ Customer created:', customer.name);
  }

  // Create sample products for demo user
  const products = [
    {
      name: 'Web Development Service',
      description: 'Custom web application development',
      type: 'SERVICE',
      price: 50000.00,
      unit: 'Project',
      sacCode: '998314',
      taxRate: 18.0,
      category: 'IT Services',
      userId: demoUser.id
    },
    {
      name: 'Mobile App Development',
      description: 'iOS and Android app development',
      type: 'SERVICE',
      price: 75000.00,
      unit: 'Project',
      sacCode: '998314',
      taxRate: 18.0,
      category: 'IT Services',
      userId: demoUser.id
    },
    {
      name: 'Software License',
      description: 'Annual software license',
      type: 'PRODUCT',
      price: 25000.00,
      unit: 'License',
      hsnCode: '8523',
      taxRate: 18.0,
      category: 'Software',
      stockQuantity: 100,
      lowStockAlert: 10,
      userId: demoUser.id
    },
    {
      name: 'Consultation Services',
      description: 'Technical consultation and advisory',
      type: 'SERVICE',
      price: 2500.00,
      unit: 'Hour',
      sacCode: '998314',
      taxRate: 18.0,
      category: 'Consulting',
      userId: demoUser.id
    }
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData
    });
    console.log('✅ Product created:', product.name);
  }

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Demo Credentials:');
  console.log('Admin: admin@gstinvoicing.com / admin123');
  console.log('Demo User: demo@gstinvoicing.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });