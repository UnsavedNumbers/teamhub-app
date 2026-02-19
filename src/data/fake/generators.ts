/**
 * Fake Data Generators
 *
 * Shared name pools, ID generators, and date utilities.
 * Used by fake data modules to generate realistic data at scale.
 */

// ============================================================================
// Name Pools
// ============================================================================

export const FIRST_NAMES_FEMALE = [
    'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
    'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila',
    'Luna', 'Sofia', 'Avery', 'Mila', 'Aria', 'Scarlett', 'Penelope', 'Layla',
    'Chloe', 'Victoria', 'Madison', 'Eleanor', 'Grace', 'Nora', 'Riley',
    'Zoey', 'Hannah', 'Hazel', 'Lily', 'Ellie', 'Violet', 'Lillian', 'Zoe',
    'Stella', 'Aurora', 'Natalie', 'Emilia', 'Everly', 'Leah', 'Aubrey',
    'Willow', 'Addison', 'Lucy', 'Audrey', 'Bella', 'Nova', 'Brooklyn',
    'Paisley', 'Savannah', 'Claire', 'Skylar', 'Isla', 'Genesis', 'Naomi',
    'Elena', 'Caroline', 'Eliana', 'Anna', 'Maya', 'Valentina', 'Ruby',
    'Kennedy', 'Ivy', 'Ariana', 'Aaliyah', 'Cora', 'Madelyn', 'Alice',
    'Kinsley', 'Hailey', 'Gabriella', 'Allison', 'Gianna', 'Serenity',
    'Samantha', 'Sarah', 'Autumn', 'Quinn', 'Eva', 'Piper', 'Sophie',
    'Sadie', 'Delilah', 'Josephine', 'Nevaeh', 'Adeline', 'Arya',
    'Emery', 'Lydia', 'Clara', 'Vivian', 'Madeline', 'Peyton', 'Julia',
    'Rylee', 'Aisha', 'Priya', 'Mei', 'Yuki', 'Fatima', 'Ximena',
]

export const FIRST_NAMES_MALE = [
    'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin',
    'Lucas', 'Henry', 'Alexander', 'Mason', 'Michael', 'Ethan', 'Daniel',
    'Jacob', 'Logan', 'Jackson', 'Levi', 'Sebastian', 'Mateo', 'Jack',
    'Owen', 'Theodore', 'Aiden', 'Samuel', 'Joseph', 'John', 'David',
    'Wyatt', 'Matthew', 'Luke', 'Asher', 'Carter', 'Julian', 'Grayson',
    'Leo', 'Jayden', 'Gabriel', 'Isaac', 'Lincoln', 'Anthony', 'Hudson',
    'Dylan', 'Ezra', 'Thomas', 'Charles', 'Christopher', 'Jaxon', 'Maverick',
    'Josiah', 'Isaiah', 'Andrew', 'Elias', 'Joshua', 'Nathan', 'Caleb',
    'Ryan', 'Adrian', 'Miles', 'Eli', 'Nolan', 'Christian', 'Aaron',
    'Cameron', 'Ezekiel', 'Colton', 'Luca', 'Landon', 'Hunter', 'Jonathan',
    'Santiago', 'Axel', 'Easton', 'Cooper', 'Jeremiah', 'Angel', 'Roman',
    'Connor', 'Jameson', 'Robert', 'Greyson', 'Jordan', 'Ian', 'Carson',
    'Jaxson', 'Leonardo', 'Nicholas', 'Dominic', 'Austin', 'Everett',
    'Brooks', 'Xavier', 'Kai', 'Jose', 'Parker', 'Adam', 'Jace',
    'Wesley', 'Kayden', 'Silas', 'Marcus', 'Miguel', 'Ravi', 'Kenji',
]

export const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
    'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris',
    'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan',
    'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos',
    'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez',
    'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
    'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long',
    'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
    'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales',
    'Fisher', 'Vasquez', 'Simmons', 'Griffin', 'Chen', 'Washington', 'O\'Brien',
]

// ============================================================================
// Location Pools
// ============================================================================

export const CITIES_STATES: Array<{ city: string; state: string; zip: string }> = [
    { city: 'Austin', state: 'TX', zip: '78701' },
    { city: 'Dallas', state: 'TX', zip: '75201' },
    { city: 'Houston', state: 'TX', zip: '77001' },
    { city: 'San Antonio', state: 'TX', zip: '78201' },
    { city: 'Sacramento', state: 'CA', zip: '95814' },
    { city: 'Los Angeles', state: 'CA', zip: '90001' },
    { city: 'San Diego', state: 'CA', zip: '92101' },
    { city: 'Denver', state: 'CO', zip: '80201' },
    { city: 'Phoenix', state: 'AZ', zip: '85001' },
    { city: 'Atlanta', state: 'GA', zip: '30301' },
    { city: 'Nashville', state: 'TN', zip: '37201' },
    { city: 'Charlotte', state: 'NC', zip: '28201' },
    { city: 'Orlando', state: 'FL', zip: '32801' },
    { city: 'Tampa', state: 'FL', zip: '33601' },
    { city: 'Portland', state: 'OR', zip: '97201' },
    { city: 'Seattle', state: 'WA', zip: '98101' },
    { city: 'Minneapolis', state: 'MN', zip: '55401' },
    { city: 'Chicago', state: 'IL', zip: '60601' },
    { city: 'Round Rock', state: 'TX', zip: '78664' },
    { city: 'Plano', state: 'TX', zip: '75023' },
]

export const STREET_NAMES = [
    'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Birch', 'Willow', 'Park',
    'Lake', 'River', 'Spring', 'Meadow', 'Hill', 'Valley', 'Ridge',
    'Forest', 'Garden', 'Sunset', 'Sunrise', 'Mountain', 'Highland',
    'Brookside', 'Creekview', 'Lakeshore', 'Riverview',
]

export const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way', 'Ct', 'Pl', 'Rd']

// ============================================================================
// Venue Pools
// ============================================================================

export const VENUE_TEMPLATES = [
    { name: '{city} Sports Complex', capacity: 5000 },
    { name: '{city} Community Field', capacity: 1500 },
    { name: '{name} Memorial Stadium', capacity: 12000 },
    { name: '{city} Recreation Center', capacity: 3000 },
    { name: '{name} Arena', capacity: 8000 },
    { name: '{city} Athletic Park', capacity: 4000 },
    { name: '{name} Fieldhouse', capacity: 2500 },
    { name: '{city} Indoor Sports Center', capacity: 2000 },
]

// ============================================================================
// Sport Names
// ============================================================================

export const SPORTS = [
    'Soccer', 'Basketball', 'Baseball', 'Softball', 'Football',
    'Volleyball', 'Track & Field', 'Swimming', 'Tennis', 'Lacrosse',
    'Field Hockey', 'Wrestling', 'Cheerleading', 'Gymnastics', 'Golf',
]

export const TEAM_MASCOTS = [
    'Lightning', 'Thunder', 'Hawks', 'Eagles', 'Tigers', 'Lions',
    'Wolves', 'Bears', 'Panthers', 'Falcons', 'Stallions', 'Sharks',
    'Cobras', 'Vipers', 'Warriors', 'Knights', 'Storm', 'Blaze',
    'Fury', 'United', 'Rockets', 'Comets', 'Phoenix', 'Cougars',
    'Mustangs', 'Bulldogs', 'Raptors', 'Jaguars', 'Blazers', 'Titans',
]

// ============================================================================
// ID & Random Generators
// ============================================================================

let _seededCounter = 0

export function seededId(prefix: string): string {
    _seededCounter++
    return `${prefix}-gen-${String(_seededCounter).padStart(4, '0')}`
}

export function resetIdCounter(): void {
    _seededCounter = 0
}

/**
 * Deterministic pseudo-random using a seed index.
 * Returns a value between 0 and 1.
 */
export function seededRandom(index: number): number {
    const x = Math.sin(index * 9301 + 49297) * 233280
    return x - Math.floor(x)
}

export function pick<T>(arr: T[], index: number): T {
    return arr[Math.abs(index) % arr.length]
}

export function pickN<T>(arr: T[], count: number, startIndex: number): T[] {
    const result: T[] = []
    const used = new Set<number>()
    for (let i = 0; i < count && used.size < arr.length; i++) {
        let idx = Math.abs(startIndex + i * 7) % arr.length
        while (used.has(idx)) idx = (idx + 1) % arr.length
        used.add(idx)
        result.push(arr[idx])
    }
    return result
}

// ============================================================================
// Data Generation Helpers
// ============================================================================

export function generatePhone(index: number): string {
    const area = 555
    const prefix = 100 + (index % 900)
    const suffix = String(1000 + (index * 7 % 9000)).padStart(4, '0')
    return `+1 (${area}) ${prefix}-${suffix}`
}

export function generateEmail(firstName: string, lastName: string, index: number): string {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
    const suffix = index > 20 ? index.toString() : ''
    return `${clean(firstName)}.${clean(lastName)}${suffix}@example.com`
}

export function generateStreetAddress(index: number): string {
    const num = 100 + (index * 37 % 9900)
    const street = pick(STREET_NAMES, index)
    const type = pick(STREET_TYPES, index + 3)
    return `${num} ${street} ${type}`
}

export function generateBirthdate(index: number, minAge: number, maxAge: number): string {
    const now = new Date()
    const age = minAge + (index % (maxAge - minAge + 1))
    const month = 1 + (index * 3 % 12)
    const day = 1 + (index * 7 % 28)
    return `${now.getFullYear() - age}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function generatePastDate(index: number, maxDaysAgo: number): string {
    const now = new Date()
    const daysAgo = Math.floor(seededRandom(index) * maxDaysAgo)
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    return date.toISOString()
}

export function generateFutureDate(index: number, maxDaysAhead: number): string {
    const now = new Date()
    const daysAhead = 1 + Math.floor(seededRandom(index) * maxDaysAhead)
    const date = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    return date.toISOString()
}

export function generateDateBetween(index: number, startDaysAgo: number, endDaysAhead: number): string {
    const now = new Date()
    const totalRange = startDaysAgo + endDaysAhead
    const offset = -startDaysAgo + Math.floor(seededRandom(index) * totalRange)
    const date = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    return date.toISOString()
}

/**
 * Generate a masked credit card string
 */
export function generateMaskedCard(index: number): string {
    const brands = ['Visa', 'Mastercard', 'Amex']
    const brand = pick(brands, index)
    const last4 = String(1000 + (index * 1234 % 9000))
    return `${brand} ****${last4}`
}

/**
 * Generate order number
 */
export function generateOrderNumber(index: number): string {
    return `ORD-${String(100000 + index).slice(-6)}`
}

/**
 * Generate confirmation code
 */
export function generateConfirmationCode(index: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'TKT-'
    for (let i = 0; i < 6; i++) {
        code += chars[Math.abs((index * 7 + i * 13) % chars.length)]
    }
    return code
}
