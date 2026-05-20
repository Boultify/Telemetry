require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/telemetry";

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

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB for seeding...");

  // Clear existing
  await Telemetry.deleteMany({ deviceId: 'VX-9902' });
  console.log("Cleared existing telemetry for VX-9902");

  const baseTime = Date.now();
  const data = [];

  // Generate 50 points of sample telemetry data
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(baseTime - (50 - i) * 2000); // spread across 100 seconds
    let peak_g = 1.0;
    let spike = { detected: false, delta_g: 0, prev_g: 0, severity: 'none' };

    // Create a severe spike at point 35
    if (i === 35) {
      peak_g = 8.5;
      spike = { detected: true, delta_g: 7.5, prev_g: 1.0, severity: 'severe' };
    }
    // Create a critical spike at point 45
    else if (i === 45) {
      peak_g = 16.0;
      spike = { detected: true, delta_g: 15.0, prev_g: 1.0, severity: 'critical' };
    }

    data.push({
      deviceId: 'VX-9902',
      imu: {
        peak_g,
        accel_x: 0.1,
        accel_y: 0.2,
        accel_z: peak_g
      },
      gps: {
        velocity_kmh: 45 + Math.random() * 5,
        latitude: 33.6844 + (i * 0.0001),
        longitude: 73.0479 + (i * 0.0001),
        altitude_m: 540,
        satellites: 9,
        fixed: true
      },
      timestamp,
      spike
    });
  }

  await Telemetry.insertMany(data);
  console.log("✅ Seeded 50 telemetry points for VX-9902 successfully!");
  
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
