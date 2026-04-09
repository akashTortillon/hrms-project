import mongoose from "mongoose";
import User from "./src/models/userModel.js";
import Employee from "./src/models/employeeModel.js";

const run = async () => {
    await mongoose.connect('mongodb+srv://hr_admin:HrAdmin123@cluster0.4oh3f.mongodb.net/user_management?retryWrites=true&w=majority');
    
    console.log("Connected...");
    
    // Find users with no employeeId
    const usersNoEmpId = await User.find({ employeeId: { $exists: false } }).select("email role");
    console.log("Users missing employeeId field altogether:", usersNoEmpId);
    
    const usersNullEmpId = await User.find({ employeeId: null }).select("email role");
    console.log("Users with null employeeId:", usersNullEmpId);
    
    // For each user with null/missing employeeId, try to find an employee by email
    for (let u of [...usersNoEmpId, ...usersNullEmpId]) {
        const emp = await Employee.findOne({ email: new RegExp(`^${u.email}$`, 'i') });
        if (emp) {
            console.log(`User ${u.email} has a matching employee ${emp._id} but it's not linked!`);
        } else {
            console.log(`User ${u.email} DOES NOT HAVE an underlying Employee document!`);
        }
    }
    
    process.exit(0);
};

run().catch(console.error);
