import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  console.log('Connecting to MongoDB...');

  // Force the correct database name regardless of what's in the connection string
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
  const password = 'Admin@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Try to find by email first
  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'Admin';
    await existing.save();
    console.log(`✅ Password reset — email: ${email} | password: ${password}`);
  } else {
    // Find a unique phone number not already taken
    let phone = '+971500000000';
    let suffix = 0;
    while (await User.findOne({ phone })) {
      suffix++;
      phone = `+97150000${String(suffix).padStart(4, '0')}`;
    }

    await User.create({
      name: 'Admin',
      email,
      phone,
      password: hashedPassword,
      role: 'Admin',
    });
    console.log(`✅ Admin created — email: ${email} | password: ${password} | phone: ${phone}`);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
