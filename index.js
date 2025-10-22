// index.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const qrcode = require('qrcode'); // <--- Import qrcode
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

// --- Mongoose Schema ---
const unitValueSchema = new mongoose.Schema({ value: Number, unit: String }, { _id: false });
const geoJsonPointSchema = new mongoose.Schema({ type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number] } }, { _id: false });
const addressSchema = new mongoose.Schema({ full_address: String, subdistrict: String, district: String, province: String, country: String, postal_code: String }, { _id: false });

const SampleSchema = new mongoose.Schema({
    sample_name: { type: String, required: true, unique: true, trim: true },
    basic_info: {
        title: { type: String, enum: ['Soil', 'Plant', 'Water', 'Insect'], required: true },
        organism: { type: String, trim: true },
        collection_date: { type: Date, default: Date.now },
        geo_loc_name: { type: String, trim: true },
        project_code: { type: String, uppercase: true, trim: true, default: 'GEN' } // เพิ่ม project_code
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
    },
    qr_code_image_base64: { type: String } // <--- เพิ่มฟิลด์สำหรับเก็บ QR Code Base64 String
}, { timestamps: true });

SampleSchema.index({ "location_info.coordinates": "2dsphere" });
const Sample = mongoose.model('Sample', SampleSchema);

// --- Helper function เพื่อสร้าง sample_name อัตโนมัติ (จากคำอธิบายก่อนหน้า) ---
async function generateSampleName(projectCode, sampleType) {
    const currentYear = new Date().getFullYear();
    const typePrefix = sampleType.toUpperCase().substring(0,4); // เช่น SOIL, PLAN, WATE, INSE
    const prefix = `${projectCode}-${typePrefix}-${currentYear}`;
    
    const lastSample = await Sample.findOne({ sample_name: { $regex: `^${prefix}-\\d{3}$` } })
                                   .sort({ sample_name: -1 })
                                   .limit(1);

    let nextNumber = 1;
    if (lastSample) {
        const lastNumberStr = lastSample.sample_name.split('-').pop();
        const lastNumber = parseInt(lastNumberStr, 10);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    const formattedNumber = String(nextNumber).padStart(3, '0');
    return `${prefix}-${formattedNumber}`;
}

// --- API Routes ---
app.get('/', (req, res) => {
    res.status(200).json({ message: "Welcome to the Sample Collection API!", status: "OK" });
});

app.post('/samples', async (req, res) => {
    try {
        let sampleData = req.body;

        // ดึง project_code และ title สำหรับสร้าง sample_name
        const projectCode = sampleData.basic_info?.project_code || 'GEN';
        const sampleType = sampleData.basic_info?.title;

        if (!sampleType) {
            return res.status(400).json({ message: 'Sample type (basic_info.title) is required.' });
        }

        // 1. สร้าง sample_name อัตโนมัติ
        const generatedSampleName = await generateSampleName(projectCode, sampleType);
        sampleData.sample_name = generatedSampleName;

        // 2. สร้าง QR Code จาก sample_name
        // qrcode.toDataURL จะคืนค่าเป็น Data URI (เช่น "data:image/png;base64,...")
        const qrCodeDataUrl = await qrcode.toDataURL(generatedSampleName, { errorCorrectionLevel: 'H', width: 200 });
        sampleData.qr_code_image_base64 = qrCodeDataUrl; // เก็บ Data URI ทั้งหมด

        // 3. สร้างและบันทึก Document
        const newSample = new Sample(sampleData);
        await newSample.save();
        res.status(201).json(newSample);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Generated sample name already exists, trying again...', error: error.message });
        }
        res.status(400).json({ message: 'Error creating sample.', error: error.message });
    }
});

// [GET] /samples - ดึงข้อมูลตัวอย่างทั้งหมด
app.get('/samples', async (req, res) => {
    try {
        const allSamples = await Sample.find();
        res.status(200).json(allSamples);
    } catch (error) {
        res.status(500).json({ message: "Failed to get samples", error: error.message });
    }
});

// [GET] /samples/:id - ดึงข้อมูลตัวอย่างตาม ID
app.get('/samples/:id', async (req, res) => {
    try {
        const sample = await Sample.findById(req.params.id);
        if (!sample) {
            return res.status(404).json({ message: 'Sample not found.' });
        }
        res.status(200).json(sample);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sample.', error: error.message });
    }
});

// [GET] /samples/by-name/:sample_name - ดึงข้อมูลตัวอย่างตาม sample_name
app.get('/samples/by-name/:sample_name', async (req, res) => {
    try {
        const sample = await Sample.findOne({ sample_name: req.params.sample_name });
        if (!sample) {
            return res.status(404).json({ message: 'Sample not found with this name.' });
        }
        res.status(200).json(sample);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sample by name.', error: error.message });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});