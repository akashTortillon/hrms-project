// Dial codes for the phone country-code selector on employee forms.
// UAE first since it's the primary market; rest alphabetical by country name.
export const COUNTRY_CODES = [
    { country: "UAE", dial: "+971" },
    { country: "Afghanistan", dial: "+93" },
    { country: "Bahrain", dial: "+973" },
    { country: "Bangladesh", dial: "+880" },
    { country: "Canada", dial: "+1" },
    { country: "China", dial: "+86" },
    { country: "Egypt", dial: "+20" },
    { country: "Ethiopia", dial: "+251" },
    { country: "France", dial: "+33" },
    { country: "Germany", dial: "+49" },
    { country: "India", dial: "+91" },
    { country: "Indonesia", dial: "+62" },
    { country: "Iran", dial: "+98" },
    { country: "Iraq", dial: "+964" },
    { country: "Jordan", dial: "+962" },
    { country: "Kenya", dial: "+254" },
    { country: "Kuwait", dial: "+965" },
    { country: "Lebanon", dial: "+961" },
    { country: "Malaysia", dial: "+60" },
    { country: "Nepal", dial: "+977" },
    { country: "Nigeria", dial: "+234" },
    { country: "Oman", dial: "+968" },
    { country: "Pakistan", dial: "+92" },
    { country: "Philippines", dial: "+63" },
    { country: "Qatar", dial: "+974" },
    { country: "Russia", dial: "+7" },
    { country: "Saudi Arabia", dial: "+966" },
    { country: "South Africa", dial: "+27" },
    { country: "Sri Lanka", dial: "+94" },
    { country: "Sudan", dial: "+249" },
    { country: "Syria", dial: "+963" },
    { country: "Turkey", dial: "+90" },
    { country: "UK", dial: "+44" },
    { country: "USA", dial: "+1" },
    { country: "Yemen", dial: "+967" }
];

// Split a stored phone number ("+971501234567") into { dial, rest } for editing.
// Falls back to UAE if the number doesn't start with any known dial code.
export const splitPhone = (phone) => {
    const value = (phone || "").toString();
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
    const match = sorted.find((c) => value.startsWith(c.dial));
    if (match) return { dial: match.dial, rest: value.slice(match.dial.length) };
    return { dial: "+971", rest: value.replace(/^\+/, "") };
};
