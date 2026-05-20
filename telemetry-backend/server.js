require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const twilio = require('twilio');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

// ============ CORS CONFIGURATION ============
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://47.128.147.152',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ============ ENVIRONMENT VALIDATION ============
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable not set');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// ============ TWILIO SETUP ============
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// ============ MONGODB SETUP ============
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    await cleanupLegacyProfileIndexes();
    await ensureAdminUser();
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ============ USER SCHEMA ============
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});
const User = mongoose.model('User', userSchema);

function userPayload(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role || 'user'
  };
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME || 'admin';

  if (!email || !password) {
    console.warn('⚠️ ADMIN_EMAIL / ADMIN_PASSWORD not set — admin account not seeded');
    return;
  }

  let admin = await User.findOne({ email: email.toLowerCase() });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    admin = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin'
    });
    await ensureProfileForUser(admin);
    console.log('✅ Admin account created:', email);
    return;
  }

  if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
    console.log('✅ Promoted existing user to admin:', email);
  }
}

// ============ PROFILE SCHEMA ============
const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  deviceId: { type: String, default: '' },
  driverName: String,
  email: String,
  emergencyNumber: { type: String, default: '' },
  hasCrashed: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});
const Profile = mongoose.model('Profile', profileSchema);

async function cleanupLegacyProfileIndexes() {
  try {
    const collection = mongoose.connection.collection('profiles');
    const indexes = await collection.indexes();
    for (const index of indexes) {
      if (index.key?.deviceId === 1 && index.unique) {
        await collection.dropIndex(index.name);
        console.log(`✅ Dropped legacy unique index on deviceId: ${index.name}`);
      }
    }
    await Profile.syncIndexes();
  } catch (err) {
    console.warn('⚠️ Profile index cleanup skipped:', err.message);
  }
}

function toUserId(id) {
  return new mongoose.Types.ObjectId(id);
}

function formatProfileDoc(profile) {
  const data = profile.toObject();
  if (data.deviceId === 'UNASSIGNED') {
    data.deviceId = '';
  }
  return data;
}

async function ensureProfileForUser(user) {
  let profile = await Profile.findOne({ userId: user._id });
  if (!profile) {
    profile = await Profile.create({
      userId: user._id,
      driverName: user.username,
      email: user.email,
      deviceId: '',
      emergencyNumber: ''
    });
  }
  return profile;
}

// ============ TELEMETRY SCHEMA ============
const telemetrySchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  imu: {
    peak_g: Number,
    accel_x: Number,
    accel_y: Number,
    accel_z: Number
  },
  gps: {
    velocity_kmh: Number,
    latitude: Number,
    longitude: Number,
    altitude_m: Number,
    satellites: Number,
    fixed: Boolean
  },
  timestamp: { type: Date, default: Date.now },
  spike: {
    detected: { type: Boolean, default: false },
    delta_g: { type: Number, default: 0 },
    prev_g: { type: Number, default: 0 },
    severity: { type: String, default: 'none' }
  }
});
const Telemetry = mongoose.model('Telemetry', telemetrySchema);

// ============ PUBLIC ROUTES (NO AUTH REQUIRED) ============

// PUBLIC: ESP32 sends telemetry data (NO JWT required)
app.post('/api/telemetry', async (req, res) => {
  const data = req.body;
  const now = new Date();
  const currentG = data.imu?.peak_g || 0;

  console.log(`📡 [TELEMETRY] Device ${data.device_id} | Time: ${now.toISOString()} | Peak G: ${currentG}`);

  try {
    const previousEntry = await Telemetry.findOne({ deviceId: data.device_id })
      .sort({ timestamp: -1 });

    const previousG = previousEntry?.imu?.peak_g || 0;
    const deltaG = currentG > previousG ? (currentG - previousG) : 0;
    let severity = 'none';
    let spikeDetected = false;

    if (deltaG >= 15) { severity = 'critical'; spikeDetected = true; }
    else if (deltaG >= 7) { severity = 'severe'; spikeDetected = true; }
    else if (deltaG >= 3.5) { severity = 'moderate'; spikeDetected = true; }
    else if (deltaG >= 1.5) { severity = 'minor'; spikeDetected = true; }

    const newLog = new Telemetry({
      deviceId: data.device_id,
      imu: data.imu,
      gps: data.gps,
      timestamp: now,
      spike: {
        detected: spikeDetected,
        delta_g: deltaG,
        prev_g: previousG,
        severity: severity
      }
    });
    await newLog.save();

    if (spikeDetected && deltaG >= 7 && twilioClient) {
      const profile = await Profile.findOne({ deviceId: data.device_id });
      if (profile && profile.emergencyNumber && !profile.hasCrashed) {
        console.log(`🚨 [CRASH DETECTED] Calling ${profile.emergencyNumber}...`);
        profile.hasCrashed = true;
        await profile.save();

        try {
          await twilioClient.calls.create({
            twiml: `<Response>
                      <Say voice="alice">Emergency Alert. Vehicle ${data.device_id} driven by ${profile.driverName} has experienced a sudden impact spike of ${deltaG.toFixed(1)} G change, classified as ${severity}.</Say>
                      <Say voice="alice">Last known GPS coordinates are Latitude ${data.gps.latitude}, Longitude ${data.gps.longitude}. Please dispatch help immediately.</Say>
                    </Response>`,
            to: profile.emergencyNumber,
            from: process.env.TWILIO_PHONE_NUMBER
          });
          console.log(`📞 [CALL SUCCESS] Emergency call initiated.`);
        } catch (twilioError) {
          console.error("Twilio call failed:", twilioError.message);
        }
      }
    }

    res.status(200).json({ status: "success", timestamp: now.toISOString(), spike: { detected: spikeDetected, delta_g: deltaG, severity } });

  } catch (error) {
    console.error("Telemetry Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ AUTHENTICATION MIDDLEWARE ============
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ============ AUTHENTICATION ROUTES ============

// SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'user'
    });

    await newUser.save();
    await ensureProfileForUser(newUser);

    const token = signToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: userPayload(newUser)
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (adminEmail && user.email.toLowerCase() === adminEmail && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
      console.log('✅ Enforced admin role on login for ' + user.email);
    }

    user.lastLogin = new Date();
    await user.save();
    await ensureProfileForUser(user);

    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      message: 'Login successful',
      token,
      user: userPayload(user)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// LOGOUT
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET CURRENT USER
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const freshToken = signToken(user);
    res.json({ user: userPayload(user), token: freshToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============ PROFILE ROUTES ============

app.get('/api/profile/latest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      const user = await User.findById(userId).select('username email');
      if (user) {
        profile = await ensureProfileForUser(user);
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    res.status(200).json(formatProfileDoc(profile));
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post('/api/profile', authenticateToken, async (req, res) => {
  const { deviceId, driverName, email, emergencyNumber } = req.body;
  const trimmedDeviceId = (deviceId || '').trim();
  const userId = req.user.userId;

  try {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          driverName: driverName || '',
          email: email || '',
          emergencyNumber: (emergencyNumber || '').replace(/\s+/g, ''),
          deviceId: trimmedDeviceId,
          hasCrashed: false,
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const telemetryCount = trimmedDeviceId
      ? await Telemetry.countDocuments({ deviceId: trimmedDeviceId })
      : 0;

    res.status(200).json({
      message: "Profile saved successfully!",
      profile: { ...formatProfileDoc(profile), telemetryCount }
    });
  } catch (error) {
    console.error("Mongoose Error:", error);
    res.status(500).json({ error: error.message || 'Failed to save profile' });
  }
});

// ============ PROTECTED TELEMETRY ROUTES ============

app.get('/api/telemetry/latest/:deviceId', authenticateToken, async (req, res) => {
  try {
    const latestData = await Telemetry.findOne({ deviceId: req.params.deviceId }).sort({ timestamp: -1 });
    if (latestData) {
      const response = latestData.toObject();
      response.timestampISO = response.timestamp.toISOString();
      res.status(200).json(response);
    } else {
      res.status(404).json({ message: "No hardware data found yet" });
    }
  } catch (error) {
    console.error("Error fetching telemetry:", error);
    res.status(500).json({ error: "Failed to fetch telemetry" });
  }
});

app.get('/api/telemetry/history/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 30;
    const weeks = parseInt(req.query.weeks);

    let query = { deviceId: deviceId };
    
    if (weeks) {
      const date = new Date();
      date.setDate(date.getDate() - (weeks * 7));
      query.timestamp = { $gte: date };
    }

    const maxLimit = weeks ? 1000 : limit;

    const history = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .limit(maxLimit);

    if (history && history.length > 0) {
      const formattedHistory = history.map(entry => {
        const obj = entry.toObject();
        obj.timestampISO = obj.timestamp.toISOString();
        return obj;
      });
      res.status(200).json(formattedHistory.reverse());
    } else {
      res.status(404).json({ message: "No historical data found" });
    }
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get('/api/telemetry/incidents/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const minDeltaG = parseFloat(req.query.minDelta) || 1.5;

    const incidents = await Telemetry.find({
      deviceId: deviceId,
      'spike.detected': true,
      'spike.delta_g': { $gte: minDeltaG }
    })
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

app.get('/api/telemetry/devices', authenticateToken, async (req, res) => {
  try {
    const ids = await Telemetry.distinct('deviceId');
    res.status(200).json(ids.filter((id) => id && String(id).trim()).sort());
  } catch (error) {
    console.error('Error listing telemetry devices:', error);
    res.status(500).json({ error: 'Failed to list telemetry devices' });
  }
});

// ============ ALERT / SMS ROUTE ============

app.post('/api/alert/sms', authenticateToken, async (req, res) => {
  const { deviceId, severity, deltaG, currentG, lat, lng, timestamp } = req.body;
  const userId = req.user.userId;

  try {
    const profile = await Profile.findOne({ userId });
    const toNumber = profile?.emergencyNumber;

    if (!toNumber) {
      return res.status(400).json({ error: 'No emergency number set in profile.' });
    }

    if (!twilioClient) {
      return res.status(500).json({ error: 'Twilio not configured on server.' });
    }

    // Lock to prevent multiple tabs sending duplicate SMS
    if (profile.hasCrashed) {
      console.log(`[SMS IGNORED] SMS already sent recently for ${deviceId}. Ignoring duplicate request.`);
      return res.status(200).json({ success: true, message: 'SMS already sent' });
    }
    
    // Mark as crashed to lock it
    profile.hasCrashed = true;
    await profile.save();

    const locationText = lat && lng
      ? `GPS: ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}.`
      : 'GPS unavailable.';

    const message = await twilioClient.messages.create({
      body: `🚨 CRASH ALERT: Vehicle ${deviceId || 'Unknown'} detected a ${severity?.toUpperCase() || 'SEVERE'} impact of ${parseFloat(currentG || deltaG || 0).toFixed(1)}G. ${locationText} Please check on the driver immediately.`,
      to: toNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log(`📱 [SMS SUCCESS] Sent to ${toNumber} | SID: ${message.sid}`);
    res.status(200).json({ success: true, sid: message.sid, to: toNumber });

  } catch (err) {
    console.error('SMS route error:', err.message);
    res.status(500).json({ error: 'Failed to send SMS.', details: err.message });
  }
});

// ============ ADMIN ROUTES ============

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const registeredFilter = {
      deviceId: { $exists: true, $nin: ['', 'UNASSIGNED', null] }
    };
    const rosterCount = await Profile.countDocuments(registeredFilter);

    if (!deviceId) {
      return res.status(200).json({
        deviceId: null,
        totalVehicles: rosterCount,
        minorBumps: 0,
        moderateImpacts: 0,
        heavyImpacts: 0,
        severityEvents: 0,
        totalTelemetryRecords: 0
      });
    }

    const trimmedId = String(deviceId).trim();
    const telemetryFilter = { deviceId: trimmedId };

    const minorBumps = await Telemetry.countDocuments({ ...telemetryFilter, 'spike.severity': 'minor' });
    const moderateImpacts = await Telemetry.countDocuments({ ...telemetryFilter, 'spike.severity': 'moderate' });
    const heavyImpacts = await Telemetry.countDocuments({ ...telemetryFilter, 'spike.severity': 'severe' });
    const severityEvents = await Telemetry.countDocuments({ ...telemetryFilter, 'spike.severity': 'critical' });
    const totalTelemetryRecords = await Telemetry.countDocuments(telemetryFilter);

    res.status(200).json({
      deviceId: trimmedId,
      totalVehicles: await Profile.countDocuments({ deviceId: trimmedId }),
      minorBumps,
      moderateImpacts,
      heavyImpacts,
      severityEvents,
      totalTelemetryRecords
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.get('/api/admin/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await Profile.find({
      deviceId: { $exists: true, $nin: ['', 'UNASSIGNED', null] }
    }).sort({ updatedAt: -1 });

    const enriched = await Promise.all(
      vehicles.map(async (vehicle) => {
        const doc = formatProfileDoc(vehicle);
        const telemetryCount = await Telemetry.countDocuments({ deviceId: doc.deviceId });
        const latest = await Telemetry.findOne({ deviceId: doc.deviceId }).sort({ timestamp: -1 });
        return {
          ...doc,
          telemetryCount,
          lastTelemetry: latest?.timestamp || null
        };
      })
    );

    res.status(200).json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.get('/api/admin/incidents', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(200).json([]);
    }
    const incidents = await Telemetry.find({
      'spike.detected': true,
      deviceId: String(deviceId).trim()
    })
      .sort({ timestamp: -1 })
      .limit(50);
    res.status(200).json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fleet incidents' });
  }
});



// ============ START SERVER ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Telemetry API (PUBLIC) - ESP32 can send data`);
  console.log(`🔐 All other endpoints require JWT authentication`);
});
