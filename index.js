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
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: String,
  createdAt: { type: Date, default: Date.now }
});

// Model คือ "ตัวแทน" ของ collection ที่ใช้ในการสร้าง, อ่าน, อัปเดต, ลบข้อมูล
const Post = mongoose.model('Post', postSchema);


// 6. สร้าง API Routes (Endpoints)
// Route สำหรับทดสอบว่าเซิร์ฟเวอร์ทำงานหรือไม่
app.get('/', (req, res) => {
  res.send('API Server is running!');
});

// GET: ดึงโพสต์ทั้งหมด
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find();
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error: error });
  }
});

// POST: สร้างโพสต์ใหม่
app.post('/posts', async (req, res) => {
  // ดึงข้อมูลจาก body ของ request ที่แอป Flutter ส่งมา
  const { title, content, author } = req.body;

  const newPost = new Post({
    title: title,
    content: content,
    author: author
  });

  try {
    const savedPost = await newPost.save();
    res.status(201).json(savedPost); // status 201 หมายถึง "Created"
  } catch (error) {
    res.status(400).json({ message: 'Error creating post', error: error });
  }
});


// 7. เริ่มรันเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});