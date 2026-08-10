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

const allowanceTypeSchema = new mongoose.Schema({
    name: { type: String, required: true }
});

const systemSettingsSchema = new mongoose.Schema({
    currency: { type: String, default: 'AED' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Asia/Dubai' },
    fiscalYearStart: { type: String, default: 'January' },
    // Company-wide fallback for Employee.weekOffDay - lets HR set a default (e.g. for a
    // retail division) without editing every employee; a per-employee weekOffDay, once
    // set, always wins over this. 0=Sunday ... 6=Saturday.
    defaultWeekOffDay: { type: Number, min: 0, max: 6, default: 0 },
    holidays: [holidaySchema],
    notifications: [notificationSchema],
    allowanceTypes: [allowanceTypeSchema]
}, { timestamps: true });

export default mongoose.model('SystemSettings', systemSettingsSchema);
