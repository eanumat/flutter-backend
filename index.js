// 1. Import Dependencies ที่จำเป็น
require('dotenv').config(); // ทำให้เราสามารถใช้ตัวแปรในไฟล์ .env ได้
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 2. ตั้งค่า Express App
const app = express();
const PORT = process.env.PORT || 3000; // Render จะกำหนด PORT ให้เอง แต่เราตั้งค่าสำรองไว้ที่ 3000

// 3. Middlewares (ฟังก์ชันที่ทำงานก่อนที่ request จะถูกประมวลผล)
app.use(cors()); // อนุญาตการเชื่อมต่อจากทุกที่
app.use(express.json()); // ทำให้เซิร์ฟเวอร์เข้าใจข้อมูลที่ส่งมาในรูปแบบ JSON

// 4. เชื่อมต่อกับ MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// 5. สร้าง Schema และ Model (ตัวอย่าง: โพสต์)
// Schema คือ "พิมพ์เขียว" หรือโครงสร้างของข้อมูลใน collection
// สร้าง Schema สำหรับ User
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // ชื่อผู้ใช้ ห้ามซ้ำ
  email: { type: String, required: true, unique: true },    // อีเมล ห้ามซ้ำ
  fullName: String,
  registeredAt: { type: Date, default: Date.now }
});

// Model คือ "ตัวแทน" ของ collection ที่ใช้ในการสร้าง, อ่าน, อัปเดต, ลบข้อมูล
// สร้าง Model สำหรับ User
const User = mongoose.model('User', userSchema);


// 6. สร้าง API Routes (Endpoints)
// Route สำหรับทดสอบว่าเซิร์ฟเวอร์ทำงานหรือไม่
app.get('/', (req, res) => {
  res.send('API Server is running!');
});

// GET: ดึงโพสต์ทั้งหมด
// GET: ดึงผู้ใช้ทั้งหมด
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error });
  }
});

// POST: สร้างโพสต์ใหม่
  // ดึงข้อมูลจาก body ของ request ที่แอป Flutter ส่งมา
// POST: สร้างผู้ใช้ใหม่
app.post('/users', async (req, res) => {
  const { username, email, fullName } = req.body;
  const newUser = new User({ username, email, fullName });

  try {
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ message: 'Error creating user', error: error });
  }
});


// 7. เริ่มรันเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
