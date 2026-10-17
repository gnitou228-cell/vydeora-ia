const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'database.json');

// Ensure data directory exists and seed initial database on Vercel
function ensureDbInit() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (isVercel && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
      fs.copyFileSync(SEED_FILE, DB_FILE);
    }
  } catch (err) {
    console.warn('DB init warning:', err.message);
  }
}
ensureDbInit();

// Initial default schema
const defaultSchema = {
  users: [],
  profiles: [],
  preferences: [],
  entitlements: [],
  projects: [],
  notifications: [],
  activity: [],
  sessions: {}
};

let memCache = null;

function readDb() {
  try {
    if (memCache) return memCache;
    ensureDbInit();
    if (!fs.existsSync(DB_FILE)) {
      if (fs.existsSync(SEED_FILE)) {
        const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
        memCache = seedData;
        return seedData;
      }
      writeDb(defaultSchema);
      memCache = defaultSchema;
      return defaultSchema;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    memCache = JSON.parse(data);
    return memCache;
  } catch (err) {
    console.error('Error reading database file, returning default schema:', err.message);
    if (memCache) return memCache;
    return defaultSchema;
  }
}

function writeDb(data) {
  memCache = data;
  try {
    ensureDbInit();
    // Atomic write via temp file
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file (using in-memory):', err.message);
  }
}

const db = {
  // Users
  getUserByEmail(email) {
    if (!email) return null;
    const dbData = readDb();
    const cleanEmail = email.trim().toLowerCase();
    return dbData.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
  },

  getUserById(id) {
    if (!id) return null;
    const dbData = readDb();
    return dbData.users.find(u => u.id === id) || null;
  },

  createUser(userData) {
    const dbData = readDb();
    const cleanEmail = userData.email.trim().toLowerCase();
    
    // Check duplicate
    if (dbData.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      const err = new Error('Cette adresse e-mail est déjà associée à un compte.');
      err.code = 'USER_EXISTS';
      throw err;
    }

    const userId = userData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      email: cleanEmail,
      passwordHash: userData.passwordHash,
      salt: userData.salt,
      createdAt: now
    };

    const newProfile = {
      userId: userId,
      fullName: userData.fullName || 'Créateur VYDEORA',
      email: cleanEmail,
      avatarUrl: null,
      preferredLanguage: userData.preferredLanguage || 'fr',
      timeZone: userData.timeZone || 'Europe/Paris',
      onboardingStatus: 'completed',
      createdAt: now,
      updatedAt: now
    };

    const newPreferences = {
      userId: userId,
      defaultFormat: '9:16',
      preferredVoiceLang: 'Français',
      emailNotifications: true,
      productUpdates: true,
      updatedAt: now
    };

    // Default introductory entitlement: 100 free credits
    const newEntitlement = {
      userId: userId,
      plan: 'Gratuit',
      credits: 100,
      credits_balance: 100,
      totalCredits: 100,
      monthly_limit: 100,
      period: 'mensuel',
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Welcome notification
    const welcomeNotification = {
      id: `notif-${Date.now()}`,
      userId: userId,
      title: 'Bienvenue sur VYDEORA !',
      desc: 'Vos 100 crédits de démarrage sont disponibles. Créez votre première vidéo avec notre Studio IA.',
      time: 'À l\'instant',
      unread: true,
      createdAt: now
    };

    // Initial activity
    const welcomeActivity = {
      id: `act-${Date.now()}`,
      userId: userId,
      type: 'account_created',
      description: 'Création du compte et attribution de 100 crédits de démarrage.',
      timestamp: now
    };

    dbData.users.push(newUser);
    dbData.profiles.push(newProfile);
    dbData.preferences.push(newPreferences);
    dbData.entitlements.push(newEntitlement);
    dbData.notifications.push(welcomeNotification);
    dbData.activity.push(welcomeActivity);

    writeDb(dbData);

    return {
      user: newUser,
      profile: newProfile,
      entitlement: newEntitlement,
      preferences: newPreferences
    };
  },

  updatePassword(userId, passwordHash, salt) {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === userId);
    if (!user) throw new Error('Utilisateur non trouvé.');
    user.passwordHash = passwordHash;
    user.salt = salt;
    user.updatedAt = new Date().toISOString();
    writeDb(dbData);
    return true;
  },

  // Profiles
  getProfile(userId) {
    const dbData = readDb();
    return dbData.profiles.find(p => p.userId === userId) || null;
  },

  updateProfile(userId, updateData) {
    const dbData = readDb();
    let profile = dbData.profiles.find(p => p.userId === userId);
    const now = new Date().toISOString();

    if (!profile) {
      const user = dbData.users.find(u => u.id === userId);
      profile = {
        userId: userId,
        fullName: updateData.fullName || 'Créateur VYDEORA',
        email: user ? user.email : '',
        avatarUrl: null,
        preferredLanguage: 'fr',
        timeZone: 'Europe/Paris',
        onboardingStatus: 'completed',
        createdAt: now,
        updatedAt: now
      };
      dbData.profiles.push(profile);
    }

    if (updateData.fullName !== undefined) profile.fullName = updateData.fullName.trim();
    if (updateData.avatarUrl !== undefined) profile.avatarUrl = updateData.avatarUrl;
    if (updateData.preferredLanguage !== undefined) profile.preferredLanguage = updateData.preferredLanguage;
    if (updateData.timeZone !== undefined) profile.timeZone = updateData.timeZone;
    profile.updatedAt = now;

    writeDb(dbData);
    return profile;
  },

  // Preferences
  getPreferences(userId) {
    const dbData = readDb();
    let prefs = dbData.preferences.find(p => p.userId === userId);
    if (!prefs) {
      prefs = {
        userId: userId,
        defaultFormat: '9:16',
        preferredVoiceLang: 'Français',
        emailNotifications: true,
        productUpdates: true,
        updatedAt: new Date().toISOString()
      };
      dbData.preferences.push(prefs);
      writeDb(dbData);
    }
    return prefs;
  },

  updatePreferences(userId, updateData) {
    const dbData = readDb();
    let prefs = dbData.preferences.find(p => p.userId === userId);
    const now = new Date().toISOString();

    if (!prefs) {
      prefs = { userId: userId, updatedAt: now };
      dbData.preferences.push(prefs);
    }

    if (updateData.defaultFormat !== undefined) prefs.defaultFormat = updateData.defaultFormat;
    if (updateData.preferredVoiceLang !== undefined) prefs.preferredVoiceLang = updateData.preferredVoiceLang;
    if (updateData.emailNotifications !== undefined) prefs.emailNotifications = Boolean(updateData.emailNotifications);
    if (updateData.productUpdates !== undefined) prefs.productUpdates = Boolean(updateData.productUpdates);
    prefs.updatedAt = now;

    writeDb(dbData);
    return prefs;
  },

  // Entitlements (Credits & Plan)
  getEntitlement(userId) {
    const dbData = readDb();
    let ent = dbData.entitlements.find(e => e.userId === userId);
    if (!ent) {
      ent = {
        userId: userId,
        plan: 'Gratuit',
        credits: 100,
        totalCredits: 100,
        period: 'mensuel',
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      dbData.entitlements.push(ent);
      writeDb(dbData);
    }
    return ent;
  },

  deductCredits(userId, amount) {
    const dbData = readDb();
    let ent = dbData.entitlements.find(e => e.userId === userId);
    if (!ent) {
      ent = { userId: userId, plan: 'Gratuit', credits: 100, totalCredits: 100, period: 'mensuel' };
      dbData.entitlements.push(ent);
    }
    if (ent.credits < amount) {
      const err = new Error(`Crédits insuffisants. Solde actuel : ${ent.credits}, requis : ${amount}`);
      err.code = 'INSUFFICIENT_CREDITS';
      throw err;
    }
    ent.credits -= amount;
    writeDb(dbData);
    return ent;
  },

  // Projects (strictly isolated by userId)
  getProjects(userId) {
    const dbData = readDb();
    return dbData.projects.filter(p => p.userId === userId);
  },

  createProject(projectData) {
    const dbData = readDb();
    const now = new Date().toISOString();
    const newProject = {
      id: projectData.id || `proj-${Date.now()}`,
      userId: projectData.userId,
      title: projectData.title || 'Vidéo Sans Titre',
      duration: projectData.duration || '0:45',
      status: projectData.status || 'Terminée',
      statusClass: projectData.statusClass || 'badge-success',
      date: projectData.date || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
      category: projectData.category || 'TikTok | Shorts',
      thumb: projectData.thumb || 'assets/images/creator-card.jpg',
      script: projectData.script || null,
      createdAt: now
    };

    dbData.projects.unshift(newProject);

    // Record activity
    dbData.activity.unshift({
      id: `act-${Date.now()}`,
      userId: projectData.userId,
      type: 'project_created',
      description: `Création du projet "${newProject.title}".`,
      timestamp: now
    });

    writeDb(dbData);
    return newProject;
  },

  getProjectById(userId, projectId) {
    const dbData = readDb();
    return dbData.projects.find(p => p.id === projectId && p.userId === userId) || null;
  },

  updateProject(userId, projectId, updateData) {
    const dbData = readDb();
    const project = dbData.projects.find(p => p.id === projectId && p.userId === userId);
    if (!project) {
      return null;
    }

    if (updateData.title !== undefined) project.title = updateData.title.trim();
    if (updateData.duration !== undefined) project.duration = updateData.duration;
    if (updateData.status !== undefined) project.status = updateData.status;
    if (updateData.statusClass !== undefined) project.statusClass = updateData.statusClass;
    if (updateData.category !== undefined) project.category = updateData.category;
    if (updateData.thumb !== undefined) project.thumb = updateData.thumb;
    if (updateData.script !== undefined) project.script = updateData.script;
    project.updatedAt = new Date().toISOString();

    writeDb(dbData);
    return project;
  },

  deleteProject(userId, projectId) {
    const dbData = readDb();
    const index = dbData.projects.findIndex(p => p.id === projectId && p.userId === userId);
    if (index === -1) {
      return false;
    }
    dbData.projects.splice(index, 1);
    writeDb(dbData);
    return true;
  },

  // Notifications
  getNotifications(userId) {
    const dbData = readDb();
    return dbData.notifications.filter(n => n.userId === userId);
  },

  markNotificationsRead(userId) {
    const dbData = readDb();
    let updated = false;
    dbData.notifications.forEach(n => {
      if (n.userId === userId && n.unread) {
        n.unread = false;
        updated = true;
      }
    });
    if (updated) writeDb(dbData);
    return true;
  },

  // Activity
  getActivity(userId) {
    const dbData = readDb();
    return dbData.activity.filter(a => a.userId === userId);
  },

  // Sessions
  createSession(token, userId, ttlDays = 7) {
    const dbData = readDb();
    const now = Date.now();
    const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;
    
    dbData.sessions[token] = {
      userId: userId,
      createdAt: now,
      expiresAt: expiresAt
    };

    writeDb(dbData);
    return dbData.sessions[token];
  },

  getSession(token) {
    if (!token) return null;
    const dbData = readDb();
    const session = dbData.sessions[token];
    if (!session) return null;

    // Check expiry
    if (session.expiresAt < Date.now()) {
      delete dbData.sessions[token];
      writeDb(dbData);
      return null;
    }

    return session;
  },

  deleteSession(token) {
    if (!token) return false;
    const dbData = readDb();
    if (dbData.sessions[token]) {
      delete dbData.sessions[token];
      writeDb(dbData);
      return true;
    }
    return false;
  }
};

module.exports = db;
