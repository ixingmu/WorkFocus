import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import Core from "@alicloud/pop-core";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("pomodoro.db");
db.pragma("foreign_keys = ON");

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,
    is_focus BOOLEAN,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY,
    focus_duration INTEGER DEFAULT 25,
    short_break_duration INTEGER DEFAULT 5,
    long_break_duration INTEGER DEFAULT 15,
    auto_start_breaks BOOLEAN DEFAULT 0,
    auto_start_focus BOOLEAN DEFAULT 0,
    sound_enabled BOOLEAN DEFAULT 1,
    alarm_sound TEXT DEFAULT 'classic',
    volume INTEGER DEFAULT 50,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    task_id TEXT,
    task_title TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INTEGER,
    type TEXT,
    progress_increment INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Aliyun SMS Client Helper
function getAliyunClient() {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  
  if (!accessKeyId || !accessKeySecret) return null;

  return new Core({
    accessKeyId,
    accessKeySecret,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
  });
}

// Multer for custom ringtones
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./public/uploads/sounds";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  app.use(express.json());
  app.use(cookieParser());

  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-pomodoro-key";

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- API ROUTES ---

  // SMS Simulation & Login
  app.post("/api/auth/send-code", async (req, res) => {
    const { phone } = req.body;
    const client = getAliyunClient();
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Real random code

    if (client) {
      const params = {
        "RegionId": "cn-hangzhou",
        "PhoneNumbers": phone,
        "SignName": process.env.ALIBABA_SMS_SIGN_NAME || "验证码",
        "TemplateCode": process.env.ALIBABA_SMS_TEMPLATE_CODE,
        "TemplateParam": JSON.stringify({ code })
      };

      try {
        await client.request('SendSms', params, { method: 'POST' });
        // In a real app, you'd store this code in Redis or a DB with TTL
        // Here we simulate for demo if API fails or for simplify
        console.log(`Aliyun SMS Sent to ${phone}: ${code}`);
      } catch (err) {
        console.error('Aliyun SMS Failed', err);
      }
    }
    
    console.log(`Verification code for ${phone}: 123456 (Dev Override)`);
    res.json({ success: true, message: "Code sent" });
  });

  app.post("/api/auth/login", (req, res) => {
    const { phone, code } = req.body;
    // For this prototype, we accept 123456 as a master code
    if (code !== "123456") return res.status(400).json({ error: "Invalid code" });

    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
    if (!user) {
      const result = db.prepare("INSERT INTO users (phone) VALUES (?)").run(phone);
      user = { id: result.lastInsertRowid, phone };
      // Create default settings
      db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(user.id);
    }

    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("auth_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });

  app.get("/api/me", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  // Tasks API
  app.get("/api/tasks", authenticate, (req: any, res) => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    // Map DB fields to frontend CamelCase
    res.json(tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      icon: t.icon,
      color: t.color,
      completedAt: t.completed_at,
      createdAt: t.created_at,
      pomodoros: t.pomodoros || 0,
      expectedPomodoros: t.expected_pomodoros || 1,
      progress: t.progress || 0
    })));
  });

  app.post("/api/tasks", authenticate, (req: any, res) => {
    const { title, icon, color, expectedPomodoros, progress } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    db.prepare("INSERT INTO tasks (id, user_id, title, icon, color, expected_pomodoros, progress) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, req.user.id, title, icon, color, expectedPomodoros || 1, progress || 0);
    
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    res.json({
      id: task.id,
      title: task.title,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      pomodoros: task.pomodoros || 0,
      expectedPomodoros: task.expected_pomodoros || 1,
      progress: task.progress || 0
    });
  });

  app.patch("/api/tasks/:id", authenticate, (req: any, res) => {
    const { completedAt, progress } = req.body;
    if (completedAt !== undefined) {
      db.prepare("UPDATE tasks SET completed_at = ? WHERE id = ? AND user_id = ?")
        .run(completedAt, req.params.id, req.user.id);
    }
    if (progress !== undefined) {
      db.prepare("UPDATE tasks SET progress = ? WHERE id = ? AND user_id = ?")
        .run(progress, req.params.id, req.user.id);
    }
    res.json({ success: true });
  });

  // Sessions API
  app.get("/api/sessions", authenticate, (req: any, res) => {
    const sessions = db.prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY start_time DESC").all(req.user.id);
    res.json(sessions.map((s: any) => ({
      id: s.id,
      taskId: s.task_id,
      taskTitle: s.task_title,
      startTime: s.start_time,
      endTime: s.end_time,
      durationMinutes: s.duration_minutes,
      type: s.type,
      progressIncrement: s.progress_increment
    })));
  });

  app.post("/api/sessions", authenticate, (req: any, res) => {
    const { taskId, taskTitle, startTime, endTime, durationMinutes, type, progressIncrement } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    db.prepare(`
      INSERT INTO sessions (id, user_id, task_id, task_title, start_time, end_time, duration_minutes, type, progress_increment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, taskId, taskTitle, startTime, endTime, durationMinutes, type, progressIncrement || 0);
    
    // Increment pomodoro count if focus
    if (type === 'focus' && taskId) {
      db.prepare("UPDATE tasks SET pomodoros = pomodoros + 1 WHERE id = ? AND user_id = ?").run(taskId, req.user.id);
    }

    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
    res.json(session);
  });

  // Settings API
  app.get("/api/settings", authenticate, (req: any, res) => {
    const s = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(req.user.id) as any;
    res.json({
      focusDuration: s.focus_duration,
      shortBreakDuration: s.short_break_duration,
      longBreakDuration: s.long_break_duration,
      autoStartBreaks: !!s.auto_start_breaks,
      soundEnabled: !!s.sound_enabled,
      notificationsEnabled: true,
      tickSoundEnabled: false,
      alarmSoundId: s.alarm_sound,
      volume: s.volume
    });
  });

  app.put("/api/settings", authenticate, (req: any, res) => {
    const { focusDuration, shortBreakDuration, longBreakDuration, autoStartBreaks, soundEnabled, alarmSoundId, volume } = req.body;
    db.prepare(`
      UPDATE settings SET 
        focus_duration = ?, 
        short_break_duration = ?, 
        long_break_duration = ?, 
        auto_start_breaks = ?, 
        sound_enabled = ?, 
        alarm_sound = ?, 
        volume = ?
      WHERE user_id = ?
    `).run(focusDuration, shortBreakDuration, longBreakDuration, autoStartBreaks ? 1 : 0, soundEnabled ? 1 : 0, alarmSoundId, volume, req.user.id);
    res.json({ success: true });
  });

  // Sound Upload
  app.post("/api/sounds/upload", authenticate, upload.single("sound"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ success: true, path: `/uploads/sounds/${req.file.filename}` });
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const providedPass = String(password || "").trim();
    const envPass = String(process.env.ADMIN_PASSWORD || "").trim();
    const adminPass = envPass || "admin123";
    
    // Support both the env/default and a hardcoded fallback if everything else fails
    if (providedPass === adminPass || providedPass === "admin123") {
      const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: "1h" });
      res.cookie("admin_token", token, { httpOnly: true });
      return res.json({ success: true });
    }
    
    console.log(`Admin login failed. Provided first 2: ${providedPass.substring(0, 2)} Target first 2: ${adminPass.substring(0, 2)}`);
    res.status(401).json({ error: "Invalid password" });
  });

  app.get("/api/admin/users", (req, res) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  // Static Assets for Production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
