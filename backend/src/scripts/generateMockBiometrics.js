
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const YEAR = 2025;
const MONTH = 11; // December (0-indexed)
const START_DAY = 1;
const END_DAY = 31; // Full Month
const EMPLOYEES = ['EMP001', 'EMP002', 'EMP003', 'EMP004'];

const generateLogs = () => {
    const logs = [];

    for (let day = START_DAY; day <= END_DAY; day++) {
        const dateStr = `${YEAR}-${String(MONTH + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(YEAR, MONTH, day);
        const dayOfWeek = dateObj.getDay();

        // Skip Sundays (0)
        if (dayOfWeek === 0) continue;

        // Skip Dec 25 (Holiday)
        if (day === 25) continue;

        EMPLOYEES.forEach(empCode => {
            // Random Absence (10% Chance) - Skip creating logs implies Absent in Payroll Logic
            if (day !== 25 && Math.random() < 0.10) {
                return; // Skip this employee for this day
            }

            // Late (30% Chance)
            const isLate = Math.random() < 0.3;
            let inTime, outTime;

            if (isLate) {
                // Late: 09:16 - 10:30
                const hour = Math.random() < 0.8 ? 9 : 10;
                const min = Math.floor(Math.random() * 59);
                // Ensure it's >= 09:16
                const finalMin = (hour === 9 && min < 16) ? min + 16 : min;
                inTime = `${String(hour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
            } else {
                // On Time: 08:30 - 09:15
                // 8:30 to 8:59 OR 9:00 to 9:15
                if (Math.random() < 0.7) {
                    // 8:xx
                    const min = Math.floor(Math.random() * 30) + 30; // 30-59
                    inTime = `08:${min}`;
                } else {
                    // 9:xx
                    const min = Math.floor(Math.random() * 16); // 0-15
                    inTime = `09:${String(min).padStart(2, '0')}`;
                }
            }

            // OUT: 17:30 - 19:30
            const outHour = Math.floor(Math.random() * 2) + 17; // 17 or 18. Adjust if 19 needed.
            const outMin = Math.floor(Math.random() * 60);
            outTime = `${outHour}:${String(outMin).padStart(2, '0')}`;

            // IN Punch
            logs.push({
                employeeCode: empCode,
                timestamp: `${dateStr}T${inTime}:00`,
                type: "IN"
            });

            // OUT Punch
            logs.push({
                employeeCode: empCode,
                timestamp: `${dateStr}T${outTime}:00`,
                type: "OUT"
            });

        });
    }
    return logs;
};

const data = generateLogs();
// Output to the data folder
const outputPath = path.join(__dirname, '../data/mockBiometricData.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(data, null, 4));
// console.log(`Successfully generated ${data.length} biometric logs for ${EMPLOYEES.join(', ')} from Jan ${START_DAY} to ${END_DAY}`);
