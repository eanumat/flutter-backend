// index.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. Import cors
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors()); // 2. Enable CORS for all routes
app.use(express.json());

// --- Environment Variables ---
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined.');
    process.exit(1);
}

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

// --- Mongoose Schema (ตามที่ออกแบบไว้) ---
const unitValueSchema = new mongoose.Schema({ value: Number, unit: String }, { _id: false });
const geoJsonPointSchema = new mongoose.Schema({ type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number] } }, { _id: false });
const addressSchema = new mongoose.Schema({ full_address: String, subdistrict: String, district: String, province: String, country: String, postal_code: String }, { _id: false });

const SampleSchema = new mongoose.Schema({
    sample_name: { type: String, required: true, unique: true, trim: true },
    basic_info: {
        title: { type: String, enum: ['Soil', 'Plant', 'Water', 'Insect'], required: true },
        organism: { type: String, trim: true },
        collection_date: { type: Date, default: Date.now },
        geo_loc_name: { type: String, trim: true }
    },
    location_info: {
        coordinates: geoJsonPointSchema,
        address: addressSchema,
        depth: unitValueSchema,
        elevation: unitValueSchema,
        environment_broad_scale: String,
        environment_local_scale: String,
        environment_medium: String
    },
    environmental_properties: {
        ph: Number,
        total_organic_carbon: unitValueSchema,
        total_nitrogen: unitValueSchema,
        soil_type: String,
        drainage_class: String,
        water_content: unitValueSchema
    },
    additional_info: {
        description: String,
        collection_method: String,
        isolation_source: String,
        samp_collect_device: String,
        store_cond: String
    }
}, { timestamps: true });

SampleSchema.index({ "location_info.coordinates": "2dsphere" });
const Sample = mongoose.model('Sample', SampleSchema);

// --- API Routes ---
app.get('/', (req, res) => {
    res.status(200).json({ message: "Welcome to the Sample Collection API!", status: "OK" });
});

app.post('/samples', async (req, res) => {
    try {
        const newSample = new Sample(req.body);
        await newSample.save();
        res.status(201).json(newSample);
    } catch (error) {
        res.status(400).json({ message: "Failed to create sample", error: error.message });
    }
});

app.get('/samples', async (req, res) => {
    try {
        const allSamples = await Sample.find();
        res.status(200).json(allSamples);
    } catch (error) {
        res.status(500).json({ message: "Failed to get samples", error: error.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
