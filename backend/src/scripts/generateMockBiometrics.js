
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
const EMPLOYEES = ['EMP001'];

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

        // Skip Dec 25 (Holiday)
        if (day === 25) continue;

        EMPLOYEES.forEach(empCode => {
            // Mostly Present. No Absents as per request.
            // Occasional Late (20% chance)

            const isLate = Math.random() < 0.2;
            let inTime, outTime;

            if (isLate) {
                // Late: 09:16 - 09:45
                const mins = Math.floor(Math.random() * 30) + 16;
                inTime = `09:${String(mins).padStart(2, '0')}`;
            } else {
                // On Time: 08:45 - 09:15 (Grace period usually till 9:15)
                // Let's say 8:50 - 9:10
                const mins = Math.floor(Math.random() * 20) + 50; // 50-69
                let h = 8;
                let m = mins;
                if (m >= 60) { h = 9; m -= 60; }
                inTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }

            // OUT: 18:00 - 18:30
            outTime = `18:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}`;

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
console.log(`Successfully generated ${data.length} biometric logs for ${EMPLOYEES.join(', ')} from Jan ${START_DAY} to ${END_DAY}`);
