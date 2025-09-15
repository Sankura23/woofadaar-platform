// Shared persistent storage for demo data across all working APIs
// This ensures data consistency between different API endpoints
import { promises as fs } from 'fs';
import path from 'path';

// Storage paths
const STORAGE_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(STORAGE_DIR, 'demo-users.json');
const DOGS_FILE = path.join(STORAGE_DIR, 'demo-dogs.json');
const APPOINTMENTS_FILE = path.join(STORAGE_DIR, 'demo-appointments.json');
const PARTNERS_FILE = path.join(STORAGE_DIR, 'demo-partners.json');
const HEALTH_LOGS_FILE = path.join(STORAGE_DIR, 'demo-health-logs.json');

// In-memory storage (loaded from files)
export let demoDogsStorage: Record<string, any[]> = {};
export let demoAppointmentsStorage: Record<string, any[]> = {};
export let demoUsersStorage: Record<string, any> = {};
export let demoPartnersStorage: Record<string, any> = {};
export let demoHealthLogsStorage: Record<string, any[]> = {};

// Flag to track if data has been initialized
let isInitialized = false;

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

// Load data from files
async function loadFromFile(filePath: string, defaultValue: any) {
  try {
    await ensureStorageDir();
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

// Save data to file
async function saveToFile(filePath: string, data: any) {
  try {
    await ensureStorageDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving to file:', error);
  }
}

// Initialize demo data for existing users - only initialize once
export async function initializeDemoData() {
  if (!isInitialized) {
    try {
      // Load existing data from files
      demoUsersStorage = await loadFromFile(USERS_FILE, {});
      demoDogsStorage = await loadFromFile(DOGS_FILE, {});
      demoAppointmentsStorage = await loadFromFile(APPOINTMENTS_FILE, {});
      demoPartnersStorage = await loadFromFile(PARTNERS_FILE, {});
      demoHealthLogsStorage = await loadFromFile(HEALTH_LOGS_FILE, {});
      
      isInitialized = true;
      console.log('Demo data initialized: Loaded persistent data from files');
    } catch (error) {
      console.error('Error initializing demo data:', error);
      // Fall back to empty storage
      demoUsersStorage = {};
      demoDogsStorage = {};
      demoAppointmentsStorage = {};
      demoPartnersStorage = {};
      demoHealthLogsStorage = {};
      isInitialized = true;
    }
  }
}

// Initialize synchronously for module loading
let initPromise: Promise<void> | null = null;
export function ensureInitialized() {
  if (!initPromise) {
    initPromise = initializeDemoData();
  }
  return initPromise;
}

// Function to clear all storage data (for reset)
export async function clearAllData() {
  demoDogsStorage = {};
  demoAppointmentsStorage = {};
  demoUsersStorage = {};
  demoPartnersStorage = {};
  demoHealthLogsStorage = {};
  isInitialized = false;
  
  // Also clear the files
  await Promise.all([
    saveToFile(USERS_FILE, {}),
    saveToFile(DOGS_FILE, {}),
    saveToFile(APPOINTMENTS_FILE, {}),
    saveToFile(PARTNERS_FILE, {}),
    saveToFile(HEALTH_LOGS_FILE, {})
  ]);
  
  console.log('All demo data cleared - storage and files reset');
}

// Function to clear user sessions/login tokens without clearing demo data
export function clearUserSessions() {
  // This would clear browser localStorage/sessionStorage and cookies
  // The demo data remains intact for website functionality
  console.log('User login sessions cleared - demo data preserved');
}

// Function to clear all data except specified user
export async function clearAllDataExceptUser(keepUserEmail: string) {
  await ensureInitialized();
  
  // Find the user to keep
  let userToKeep = null;
  let userIdToKeep = null;
  for (const userId in demoUsersStorage) {
    const user = demoUsersStorage[userId];
    if (user.email === keepUserEmail) {
      userToKeep = user;
      userIdToKeep = userId;
      break;
    }
  }
  
  // Clear all storage
  demoDogsStorage = {};
  demoAppointmentsStorage = {};
  demoUsersStorage = {};
  demoPartnersStorage = {};
  
  // Restore only the user we want to keep
  if (userToKeep && userIdToKeep) {
    demoUsersStorage[userIdToKeep] = userToKeep;
    // Initialize empty arrays for the kept user
    demoDogsStorage[userIdToKeep] = [];
    demoAppointmentsStorage[userIdToKeep] = [];
  }
  
  // Save to files
  await Promise.all([
    saveToFile(USERS_FILE, demoUsersStorage),
    saveToFile(DOGS_FILE, demoDogsStorage),
    saveToFile(APPOINTMENTS_FILE, demoAppointmentsStorage),
    saveToFile(PARTNERS_FILE, demoPartnersStorage)
  ]);
  
  console.log(`Cleared all data except user: ${keepUserEmail}`);
}

// Helper functions to manage storage
export async function addDogToStorage(userId: string, dog: any) {
  await ensureInitialized();
  if (!demoDogsStorage[userId]) {
    demoDogsStorage[userId] = [];
  }
  demoDogsStorage[userId].push(dog);
  
  // Save to file immediately
  await saveToFile(DOGS_FILE, demoDogsStorage);
  
  console.log(`Added dog "${dog.name}" for user ${userId}. Total dogs: ${demoDogsStorage[userId].length}`);
}

export async function updateDogInStorage(userId: string, dogId: string, updatedDog: any) {
  await ensureInitialized();
  if (!demoDogsStorage[userId]) {
    return false;
  }
  
  const dogIndex = demoDogsStorage[userId].findIndex(dog => dog.id === dogId);
  if (dogIndex === -1) {
    return false;
  }
  
  demoDogsStorage[userId][dogIndex] = updatedDog;
  
  // Save to file immediately
  await saveToFile(DOGS_FILE, demoDogsStorage);
  
  console.log(`Updated dog "${updatedDog.name}" for user ${userId}`);
  return true;
}

export async function getDogsForUser(userId: string) {
  await ensureInitialized();
  return demoDogsStorage[userId] || [];
}

export async function getDogById(userId: string, dogId: string) {
  const userDogs = await getDogsForUser(userId);
  return userDogs.find(dog => dog.id === dogId) || null;
}

export async function deleteDogFromStorage(userId: string, dogId: string) {
  await ensureInitialized();
  if (!demoDogsStorage[userId]) {
    return false;
  }
  
  const dogIndex = demoDogsStorage[userId].findIndex(dog => dog.id === dogId);
  if (dogIndex === -1) {
    return false;
  }
  
  const deletedDog = demoDogsStorage[userId][dogIndex];
  demoDogsStorage[userId].splice(dogIndex, 1);
  
  // Save to file immediately
  await saveToFile(DOGS_FILE, demoDogsStorage);
  
  console.log(`Deleted dog "${deletedDog.name}" for user ${userId}. Remaining dogs: ${demoDogsStorage[userId].length}`);
  return true;
}

// User management functions
export async function addUserToStorage(user: any) {
  await ensureInitialized();
  demoUsersStorage[user.id] = user;
  
  // Save to file immediately
  await saveToFile(USERS_FILE, demoUsersStorage);
  
  console.log(`Added user "${user.name}" (${user.email}) to storage`);
}

export async function registerNewUser(email: string, password: string, name: string) {
  await ensureInitialized();
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newUser = {
    id: userId,
    name: name || email.split('@')[0],
    email: email,
    password: password,
    barkPoints: 100,
    reputation: 10,
    createdAt: new Date().toISOString()
  };
  
  demoUsersStorage[userId] = newUser;
  demoDogsStorage[userId] = []; // Initialize empty dogs array for new user
  demoAppointmentsStorage[userId] = []; // Initialize empty appointments array for new user
  
  // Save all data to files immediately
  await Promise.all([
    saveToFile(USERS_FILE, demoUsersStorage),
    saveToFile(DOGS_FILE, demoDogsStorage),
    saveToFile(APPOINTMENTS_FILE, demoAppointmentsStorage)
  ]);
  
  console.log(`Registered new user "${newUser.name}" (${email}) with ID: ${userId}`);
  return newUser;
}

export async function getUserFromStorage(userId: string) {
  await ensureInitialized();
  return demoUsersStorage[userId] || null;
}

export async function getUserByEmail(email: string) {
  await ensureInitialized();
  for (const userId in demoUsersStorage) {
    const user = demoUsersStorage[userId];
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

export async function updateUserInStorage(userId: string, updatedUser: any) {
  await ensureInitialized();
  if (demoUsersStorage[userId]) {
    demoUsersStorage[userId] = { ...demoUsersStorage[userId], ...updatedUser };
    
    // Save to file immediately
    await saveToFile(USERS_FILE, demoUsersStorage);
    
    console.log(`Updated user ${userId} in storage`);
    return true;
  }
  return false;
}

// Partner management functions
export async function registerNewPartner(partnerData: any) {
  await ensureInitialized();
  const partnerId = `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newPartner = {
    id: partnerId,
    name: partnerData.name,
    email: partnerData.email,
    password: partnerData.password,
    partner_type: partnerData.partner_type,
    business_name: partnerData.business_name,
    location: partnerData.location,
    phone: partnerData.phone,
    website: partnerData.website,
    bio: partnerData.bio,
    services_offered: partnerData.services_offered,
    consultation_fee: partnerData.consultation_fee || '500',
    availability_hours: partnerData.availability_hours,
    languages_spoken: partnerData.languages_spoken || 'English, Hindi',
    certifications: partnerData.certifications,
    status: 'pending',
    verified: false,
    health_id_access: false,
    dog_id_access_level: 'full',
    emergency_access_enabled: true,
    partnership_tier: 'premium',
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString()
  };
  
  demoPartnersStorage[partnerId] = newPartner;
  
  // Save to file immediately
  await saveToFile(PARTNERS_FILE, demoPartnersStorage);
  
  console.log(`Registered new partner "${newPartner.name}" (${newPartner.email}) with ID: ${partnerId}`);
  return newPartner;
}

export async function getPartnerByEmail(email: string) {
  await ensureInitialized();
  for (const partnerId in demoPartnersStorage) {
    const partner = demoPartnersStorage[partnerId];
    if (partner.email === email) {
      return partner;
    }
  }
  return null;
}

export async function getPartnerById(partnerId: string) {
  await ensureInitialized();
  return demoPartnersStorage[partnerId] || null;
}

export async function getAllPartners() {
  await ensureInitialized();
  return Object.values(demoPartnersStorage);
}

export async function updatePartnerInStorage(partnerId: string, updatedPartner: any) {
  await ensureInitialized();
  if (demoPartnersStorage[partnerId]) {
    demoPartnersStorage[partnerId] = { ...demoPartnersStorage[partnerId], ...updatedPartner };
    
    // Save to file immediately
    await saveToFile(PARTNERS_FILE, demoPartnersStorage);
    
    console.log(`Updated partner ${partnerId} in storage`);
    return demoPartnersStorage[partnerId];
  }
  return null;
}

// Appointment management functions
export async function addAppointmentToStorage(appointment: any) {
  await ensureInitialized();
  if (!demoAppointmentsStorage[appointment.user_id]) {
    demoAppointmentsStorage[appointment.user_id] = [];
  }
  
  // Generate unique ID for appointment
  const appointmentId = `apt-${Date.now()}-${appointment.user_id}-${Math.random().toString(36).substr(2, 9)}`;
  const newAppointment = {
    ...appointment,
    id: appointmentId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: appointment.status || 'scheduled'
  };
  
  demoAppointmentsStorage[appointment.user_id].push(newAppointment);
  
  // Save to file immediately
  await saveToFile(APPOINTMENTS_FILE, demoAppointmentsStorage);
  
  console.log(`Added appointment ${appointmentId} for user ${appointment.user_id} with partner ${appointment.partner_id}`);
  return newAppointment;
}

export async function getAppointmentsForUser(userId: string) {
  await ensureInitialized();
  return demoAppointmentsStorage[userId] || [];
}

export async function getAppointmentsForPartner(partnerId: string) {
  await ensureInitialized();
  const partnerAppointments: any[] = [];
  
  // Search through all users' appointments to find those with this partner
  for (const userId in demoAppointmentsStorage) {
    const userAppointments = demoAppointmentsStorage[userId] || [];
    const partnerSpecificAppointments = userAppointments.filter(apt => apt.partner_id === partnerId);
    partnerAppointments.push(...partnerSpecificAppointments);
  }
  
  // Sort by appointment date (most recent first)
  return partnerAppointments.sort((a, b) => 
    new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
  );
}

export async function updateAppointmentInStorage(appointmentId: string, updatedAppointment: any) {
  await ensureInitialized();
  
  // Search through all users' appointments to find the one to update
  for (const userId in demoAppointmentsStorage) {
    const userAppointments = demoAppointmentsStorage[userId] || [];
    const appointmentIndex = userAppointments.findIndex(apt => apt.id === appointmentId);
    
    if (appointmentIndex !== -1) {
      demoAppointmentsStorage[userId][appointmentIndex] = {
        ...demoAppointmentsStorage[userId][appointmentIndex],
        ...updatedAppointment,
        updated_at: new Date().toISOString()
      };
      
      // Save to file immediately
      await saveToFile(APPOINTMENTS_FILE, demoAppointmentsStorage);
      
      console.log(`Updated appointment ${appointmentId} for user ${userId}`);
      return demoAppointmentsStorage[userId][appointmentIndex];
    }
  }
  
  return null;
}

// Health log management functions
export async function addHealthLogToStorage(userId: string, healthLog: any) {
  await ensureInitialized();
  if (!demoHealthLogsStorage[userId]) {
    demoHealthLogsStorage[userId] = [];
  }
  
  // Generate unique ID for health log
  const logId = `health-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newHealthLog = {
    ...healthLog,
    id: logId,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  demoHealthLogsStorage[userId].push(newHealthLog);
  
  // Save to file immediately
  await saveToFile(HEALTH_LOGS_FILE, demoHealthLogsStorage);
  
  console.log(`Added health log for user ${userId}, dog ${healthLog.dog_id} on ${healthLog.log_date}`);
  return newHealthLog;
}

export async function updateHealthLogInStorage(userId: string, logId: string, updatedHealthLog: any) {
  await ensureInitialized();
  if (!demoHealthLogsStorage[userId]) {
    return null;
  }
  
  const logIndex = demoHealthLogsStorage[userId].findIndex(log => log.id === logId);
  if (logIndex === -1) {
    return null;
  }
  
  demoHealthLogsStorage[userId][logIndex] = {
    ...demoHealthLogsStorage[userId][logIndex],
    ...updatedHealthLog,
    updated_at: new Date().toISOString()
  };
  
  // Save to file immediately
  await saveToFile(HEALTH_LOGS_FILE, demoHealthLogsStorage);
  
  console.log(`Updated health log ${logId} for user ${userId}`);
  return demoHealthLogsStorage[userId][logIndex];
}

export async function getHealthLogsForUser(userId: string) {
  await ensureInitialized();
  return demoHealthLogsStorage[userId] || [];
}

export async function getHealthLogByDogAndDate(userId: string, dogId: string, logDate: string) {
  const userHealthLogs = await getHealthLogsForUser(userId);
  return userHealthLogs.find(log => 
    log.dog_id === dogId && 
    log.log_date === logDate
  ) || null;
}

export async function upsertHealthLogInStorage(userId: string, dogId: string, logDate: string, healthLogData: any) {
  await ensureInitialized();
  
  // Try to find existing log for this dog and date
  const existingLog = await getHealthLogByDogAndDate(userId, dogId, logDate);
  
  if (existingLog) {
    // Update existing log
    return await updateHealthLogInStorage(userId, existingLog.id, healthLogData);
  } else {
    // Create new log
    return await addHealthLogToStorage(userId, {
      ...healthLogData,
      dog_id: dogId,
      log_date: logDate
    });
  }
}