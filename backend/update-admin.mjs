import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  console.log('Connecting to MongoDB...');

  const dbUrl = process.env.DB_URL;
  
  // Replace whatever db name is in the URL with user_management
  const correctedUrl = dbUrl.replace(
    /mongodb\+srv:\/\/([^/]+)\/([^?]+)/,
    'mongodb+srv://$1/user_management'
  );

  console.log('Using DB URL (masked):', correctedUrl.replace(/:([^@]+)@/, ':****@'));

  await mongoose.connect(correctedUrl);
  console.log('Connected to DB:', mongoose.connection.db.databaseName);

  const User = (await import('./src/models/userModel.js')).default;

  const email = 'admin@hrms.com';
  const hashedPassword = '$2b$10$yZfjAdpBwiGlGzNiT9E6xekZFjmRAZd.wu.lQk3Z5xTaDAyvKCuEm';

  // Try to find by email first
  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'Admin';
    
    // Ensure phone field exists (required by User model)
    if (!existing.phone) {
      existing.phone = '+971500000000';
      console.log(`   Added missing phone: ${existing.phone}`);
    }
    
    await existing.save();
    console.log(`✅ Admin user updated successfully`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${existing.phone}`);
    console.log(`   Role: ${existing.role}`);
    console.log(`   Password hash applied: ${hashedPassword.substring(0, 20)}...`);
  } else {
    // Find a unique phone number not already taken
    let phone = '+971500000000';
    let suffix = 0;
    while (await User.findOne({ phone })) {
      suffix++;
      phone = `+97150000${String(suffix).padStart(4, '0')}`;
    }

    const newUser = await User.create({
      name: 'Admin',
      email,
      phone,
      password: hashedPassword,
      role: 'Admin',
    });
    console.log(`✅ Admin user created successfully`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Password hash applied: ${hashedPassword.substring(0, 20)}...`);
  }

  // Verify the user exists
  const verifyUser = await User.findOne({ email }).select('name email phone role');
  console.log('\n🔍 Verification:');
  console.log(JSON.stringify(verifyUser, null, 2));

  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
