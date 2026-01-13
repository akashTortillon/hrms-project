import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date }
});

const notificationSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String },
    enabled: { type: Boolean, default: true }
});

const systemSettingsSchema = new mongoose.Schema({
    currency: { type: String, default: 'AED' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Asia/Dubai' },
    fiscalYearStart: { type: String, default: 'January' },
    holidays: [holidaySchema],
    notifications: [notificationSchema]
}, { timestamps: true });

export default mongoose.model('SystemSettings', systemSettingsSchema);
