import fs from 'fs';

const employees = ["EMP001", "EMP002", "EMP003", "EMP004"];
const data = [];

// Helper to generate random time with more variance
// Morning: 08:00 to 09:30
// Evening: 17:00 to 19:00
function getRandomCheckIn() {
    const h = 8 + (Math.random() > 0.6 ? 1 : 0); // Mostly 8, sometimes 9
    const m = Math.floor(Math.random() * 60);
    // If 9, limit minutes to 30 to avoid being consistently too late
    const finalM = (h === 9 && m > 30) ? Math.floor(Math.random() * 30) : m;
    return `${String(h).padStart(2, '0')}:${String(finalM).padStart(2, '0')}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
}

function getRandomCheckOut() {
    const h = 17 + Math.floor(Math.random() * 2); // 17 or 18
    const m = Math.floor(Math.random() * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
}

// Pre-calculate specific absent days for each employee to ensure they don't overlap 
// This strictly prevents "everyone absent on same date" complaint.
const absenceMap = {};
employees.forEach(emp => {
    absenceMap[emp] = new Set();
});

// Generate all valid working dates first
const validDates = [];
// Dec 2025
for (let d = 1; d <= 31; d++) {
    const date = new Date(2025, 11, d);
    if (date.getDay() === 0 || d === 25) continue;
    validDates.push(`2025-12-${String(d).padStart(2, '0')}`);
}
// Jan 2026
for (let d = 1; d <= 18; d++) {
    const date = new Date(2026, 0, d);
    if (date.getDay() === 0) continue;
    validDates.push(`2026-01-${String(d).padStart(2, '0')}`);
}

// Shuffle validDates to pick unique absence days
const shuffled = [...validDates].sort(() => 0.5 - Math.random());
let pointer = 0;

employees.forEach(emp => {
    // Each emp gets 3 distinct absence days from the pool
    // Because we use a single shuffled list pointer, these days are mutually exclusive across employees!
    // This GUARANTEES that if EMP1 is absent on Day X, EMP2 is NOT absent on Day X (unless we run out of days, which we won't).
    for (let k = 0; k < 3; k++) {
        if (pointer < shuffled.length) {
            absenceMap[emp].add(shuffled[pointer++]);
        }
    }
});

// Now generate data
validDates.forEach(dateStr => {
    employees.forEach(emp => {
        // Check predetermined absence
        if (absenceMap[emp].has(dateStr)) {
            // console.log(`Skipping ${emp} on ${dateStr} (Forced Absence)`);
            return;
        }

        // Random Late arrival logic
        // 15% chance of being distinctively late
        let checkIn = getRandomCheckIn();
        if (Math.random() < 0.15) {
            // Late: 09:30 to 10:30
            const lateM = Math.floor(Math.random() * 60);
            checkIn = `${Math.random() > 0.5 ? '09' : '10'}:${String(lateM).padStart(2, '0')}:00`;
        }

        data.push({
            employeeCode: emp,
            timestamp: `${dateStr}T${checkIn}`,
            type: "IN"
        });

        data.push({
            employeeCode: emp,
            timestamp: `${dateStr}T${getRandomCheckOut()}`,
            type: "OUT"
        });
    });
});

fs.writeFileSync('mockBiometricData.json', JSON.stringify(data, null, 4));
// console.log("Mock Data Generated with Distinct Randomized Absences");
