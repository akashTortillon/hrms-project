import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.DB_URL);
  
  // Assuming userModel.js path
  const User = (await import('./src/models/userModel.js')).default;
  
  const admin = await User.findOne({ role: 'Admin' });
  if (!admin) {
    console.log('No admin found!');
    process.exit(1);
  }
  
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  admin.password = hashedPassword;
  await admin.save();
  
  console.log(`Admin password for ${admin.email} successfully reset to: Admin@123`);
  process.exit(0);
};

run().catch(console.error);
