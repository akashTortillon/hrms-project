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
    // Company-wide fallback for Employee.workingDayType/weekOffDays - lets HR set a
    // default without editing every employee; a per-employee value, once set, always
    // wins over this. See employeeModel.js for what 0/2/4/8 mean.
    defaultWorkingDayType: { type: Number, enum: [0, 2, 4, 8], default: 4 },
    defaultWeekOffDays: { type: [Number], default: [0] },
    holidays: [holidaySchema],
    notifications: [notificationSchema],
    allowanceTypes: [allowanceTypeSchema]
}, { timestamps: true });

export default mongoose.model('SystemSettings', systemSettingsSchema);
