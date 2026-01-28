
import mongoose from 'mongoose';
import Master from './src/models/masterModel.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.meta.env ? process.meta.env.VITE_API_BASE : "mongodb://localhost:27017/tortilon"); // Fallback to local if env issue, but better to use existing config
        // Actually, let's try to just connect to the string usually found in .env or hardcoded if I can find it.
        // Let's assume standard local connection or rely on .env loading.
        // Better: Check creating specific connection using the URI usually used.

        // Let's try to read the .env file first via the shell? No, just try connecting.
        // Assuming "mongodb://127.0.0.1:27017/tortilon" based on typical setups if not provided.

        // Wait, I can't easily load ESM models without package.json type module... which it is.
        // I need to assume the DB URI. 

        const uri = process.env.DB_URL || "mongodb://127.0.0.1:27017/tortilon";
        await mongoose.connect(uri);
        // console.log("Connected to DB");

        const masters = await Master.find({ type: "LEAVE_TYPE" });
        // console.log("LEAVE_TYPE Masters:", JSON.stringify(masters, null, 2));

        await mongoose.disconnect();
    } catch (e) {
        // console.error(e);
    }
};

run();
