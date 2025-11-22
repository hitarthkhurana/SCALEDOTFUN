/**
 * Parse Self Protocol Verification Data
 * 
 * This helper extracts age, country, and other data from Self Protocol's
 * verification output (from smart contract or webhook)
 */

/**
 * Calculate age from birthdate
 * Handles both formats: "YYYY-MM-DD" and "DD-MM-YY"
 */
function calculateAge(birthdate: string): number {
  if (!birthdate) return 0;
  
  let birth: Date;
  
  // Check if format is DD-MM-YY (from Self Protocol)
  if (birthdate.match(/^\d{2}-\d{2}-\d{2}$/)) {
    const [day, month, year] = birthdate.split('-');
    // Convert YY to YYYY (assume 1900s if > current year, else 2000s)
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    birth = new Date(`${fullYear}-${month}-${day}`);
  } else {
    // Assume YYYY-MM-DD or other standard format
    birth = new Date(birthdate);
  }
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Get age range label
 */
function getAgeRange(age: number): string {
  if (age >= 18 && age < 25) return "18-24";
  if (age >= 25 && age < 35) return "25-34";
  if (age >= 35 && age < 50) return "35-49";
  if (age >= 50) return "50+";
  return "Under 18";
}

/**
 * Get country name from country code
 */
function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    "ARG": "Argentina",
    "USA": "United States",
    "BRA": "Brazil",
    "MEX": "Mexico",
    "CHL": "Chile",
    "COL": "Colombia",
    "PER": "Peru",
    "VEN": "Venezuela",
    "ECU": "Ecuador",
    "URY": "Uruguay",
    "PRY": "Paraguay",
    "BOL": "Bolivia",
    "IND": "India",
    "THA": "Thailand",
    "VNM": "Vietnam",
    "PHL": "Philippines",
    "IDN": "Indonesia",
    "MYS": "Malaysia",
    "SGP": "Singapore",
    "HKG": "Hong Kong",
    "TWN": "Taiwan",
    "NGA": "Nigeria",
    "KEN": "Kenya",
    "ZAF": "South Africa",
    "EGY": "Egypt",
    "GHA": "Ghana",
    "ETH": "Ethiopia",
    "NLD": "Netherlands",
    "BEL": "Belgium",
    "FRA": "France",
    // Add more as needed
  };
  
  return countries[countryCode] || countryCode;
}

/**
 * Determine task pool based on country
 */
function getTaskPool(countryCode: string): string {
  const latamCountries = ["ARG", "BRA", "MEX", "CHL", "COL", "PER", "VEN", "ECU", "URY", "PRY", "BOL"];
  const asiaCountries = ["CHN", "JPN", "KOR", "IND", "THA", "VNM", "PHL", "IDN"];
  const africaCountries = ["NGA", "KEN", "ZAF", "EGY", "GHA", "ETH"];
  const europeCountries = ["GBR", "DEU", "FRA", "ESP", "ITA", "POL", "NLD"];
  
  if (latamCountries.includes(countryCode)) return "LATAM Task Pool";
  if (asiaCountries.includes(countryCode)) return "Asia Task Pool";
  if (africaCountries.includes(countryCode)) return "Africa Task Pool";
  if (europeCountries.includes(countryCode)) return "Europe Task Pool";
  
  return "Global Task Pool";
}

/**
 * Parse verification data from Self Protocol contract output
 * 
 * Example input (from contract):
 * {
 *   userIdentifier: "0x7a8b9c...",
 *   minimumAge: 18,
 *   nationality: "ARG",
 *   dateOfBirth: "2003-01-15"
 * }
 */
export interface SelfVerificationData {
  userIdentifier: string;
  minimumAge?: number;
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
  issuingState?: string;
}

export interface ParsedVerificationResult {
  status: "Unique Human" | "Bot Detected";
  age: number | null;
  ageRange: string;
  country: string;
  countryCode: string;
  countryName: string;
  matchedPool: string;
  userHash: string;
  dateOfBirth?: string;
  gender?: string;
}

export function parseSelfVerification(
  data: SelfVerificationData
): ParsedVerificationResult {
  // Calculate exact age from birthdate
  const age = data.dateOfBirth ? calculateAge(data.dateOfBirth) : null;
  const ageRange = age ? getAgeRange(age) : (data.minimumAge ? `${data.minimumAge}+` : "Unknown");
  
  // Get country info
  const countryCode = data.nationality || "UNKNOWN";
  const countryName = getCountryName(countryCode);
  const matchedPool = getTaskPool(countryCode);
  
  return {
    status: "Unique Human",
    age,
    ageRange,
    country: countryName,
    countryCode,
    countryName,
    matchedPool,
    userHash: data.userIdentifier,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
  };
}

/**
 * Example usage:
 * 
 * // After user verifies with Self Protocol:
 * const contractData = {
 *   userIdentifier: "0x7a8b9c...",
 *   minimumAge: 18,
 *   nationality: "ARG",
 *   dateOfBirth: "2003-01-15"
 * };
 * 
 * const result = parseSelfVerification(contractData);
 * 
 * console.log(result);
 * // {
 * //   status: "Unique Human",
 * //   age: 21,
 * //   ageRange: "18-24",
 * //   country: "Argentina",
 * //   countryCode: "ARG",
 * //   countryName: "Argentina",
 * //   matchedPool: "LATAM Task Pool",
 * //   userHash: "0x7a8b9c...",
 * //   dateOfBirth: "2003-01-15"
 * // }
 */

