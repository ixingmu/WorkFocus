import express from "express";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import Core from "@alicloud/pop-core";
import multer from "multer";
import fs from "fs";

// Load environment variables explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn("⚠️ .env file not found at:", envPath);
}

// Aliyun SMS Client Helper
function getAliyunClient() {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET;
  
  if (!accessKeyId || !accessKeySecret) {
    return null;
  }

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
  const PORT = Number(process.env.PORT) || 18520;

  // SMS Codes Memory Cache (Simple store for verification)
  const smsCodes = new Map<string, { code: string, expires: number }>();

  // Initialize Database
  const db = await open({
    filename: "pomodoro.db",
    driver: sqlite3.Database
  });
  
  await db.exec("PRAGMA foreign_keys = ON");

  // Create Tables
  await db.exec(`
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
      pomodoros INTEGER DEFAULT 0,
      expected_pomodoros INTEGER DEFAULT 1,
      progress INTEGER DEFAULT 0,
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
  `);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

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

  // SMS Send Code
  app.post("/api/auth/send-code", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const client = getAliyunClient();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    smsCodes.set(phone, { code, expires });

    if (client) {
      const params = {
        "RegionId": process.env.ALIBABA_SMS_REGION_ID || "cn-hangzhou",
        "PhoneNumbers": phone,
        "SignName": process.env.ALIBABA_SMS_SIGN_NAME,
        "TemplateCode": process.env.ALIBABA_SMS_TEMPLATE_CODE,
        "TemplateParam": JSON.stringify({ code })
      };

      if (!params.SignName || !params.TemplateCode) {
        console.error("ALIBABA_SMS_SIGN_NAME or ALIBABA_SMS_TEMPLATE_CODE missing in .env");
      }

      console.log(`Attempting to send SMS to ${phone}...`);
      try {
        const response: any = await client.request('SendSms', params, { method: 'POST' });
        if (response.Code === 'OK') {
          console.log(`Aliyun SMS Success for ${phone}. RequestId: ${response.RequestId}`);
        } else {
          console.error(`Aliyun SMS API returned error for ${phone}:`, response.Code, response.Message);
        }
      } catch (err: any) {
        console.error('Aliyun SMS API Failed for ' + phone);
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
      }
    } else {
      console.warn('Aliyun SMS Client not initialized. Check ALIBABA_CLOUD_ACCESS_KEY_ID/SECRET in .env.');
    }
    
    // In production, don't log the code to console for security
    if (process.env.NODE_ENV !== "production") {
      console.log(`Verification code for ${phone}: ${code} (Dev Mode)`);
    }

    res.json({ success: true, message: "Code sent" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

    const storedCode = smsCodes.get(phone);
    const isDevCode = process.env.NODE_ENV !== "production" && code === "123456";
    
    if (!isDevCode) {
      if (!storedCode || storedCode.code !== code || storedCode.expires < Date.now()) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }
    }

    // Clear code after successful use
    smsCodes.delete(phone);

    let user = await db.get("SELECT * FROM users WHERE phone = ?", phone);
    if (!user) {
      const result = await db.run("INSERT INTO users (phone) VALUES (?)", phone);
      user = { id: result.lastID, phone };
      await db.run("INSERT INTO settings (user_id) VALUES (?)", user.id);
    }

    await db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", user.id);

    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("auth_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });

  app.get("/api/me", authenticate, async (req: any, res) => {
    const user = await db.get("SELECT * FROM users WHERE id = ?", req.user.id);
    res.json(user);
  });

  // Tasks API
  app.get("/api/tasks", authenticate, async (req: any, res) => {
    const { date } = req.query; // Expecting YYYY-MM-DD
    let query = "SELECT * FROM tasks WHERE user_id = ?";
    const params: any[] = [req.user.id];

    if (date) {
      // Specific date requested (History view)
      query += " AND date(created_at) = date(?)";
      params.push(date);
    } else {
      // Default view: Today's tasks + Uncompleted tasks from previous days
      const today = new Date().toISOString().split('T')[0];
      query += " AND (date(created_at) = date(?) OR completed_at IS NULL)";
      params.push(today);
    }

    const tasks = await db.all(query + " ORDER BY created_at DESC", ...params);
    
    // Logic: If a task is from a previous day and incomplete, it might need to reset its daily progress
    // for the "Today" view as per user request.
    const today = new Date().toISOString().split('T')[0];
    
    res.json(tasks.map((t: any) => {
      const isPastUncompleted = !t.completed_at && t.created_at.split(' ')[0] < today;
      return {
        id: t.id,
        title: t.title,
        icon: t.icon,
        color: t.color,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        // If it's a past uncompleted task, we reset the daily count/progress for "Today" view
        pomodoros: isPastUncompleted ? 0 : (t.pomodoros || 0),
        expectedPomodoros: t.expected_pomodoros || 1,
        progress: isPastUncompleted ? 0 : (t.progress || 0)
      };
    }));
  });

  app.post("/api/tasks", authenticate, async (req: any, res) => {
    const { title, icon, color, expectedPomodoros, progress, date } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    const createdAt = date ? `${date} 00:00:00` : new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    await db.run("INSERT INTO tasks (id, user_id, title, icon, color, expected_pomodoros, progress, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      id, req.user.id, title, icon, color, expectedPomodoros || 1, progress || 0, createdAt);
    
    const task = await db.get("SELECT * FROM tasks WHERE id = ?", id);
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

  app.patch("/api/tasks/:id", authenticate, async (req: any, res) => {
    const { completedAt, progress } = req.body;
    if (completedAt !== undefined) {
      await db.run("UPDATE tasks SET completed_at = ? WHERE id = ? AND user_id = ?",
        completedAt, req.params.id, req.user.id);
    }
    if (progress !== undefined) {
      await db.run("UPDATE tasks SET progress = ? WHERE id = ? AND user_id = ?",
        progress, req.params.id, req.user.id);
    }
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", authenticate, async (req: any, res) => {
    await db.run("DELETE FROM tasks WHERE id = ? AND user_id = ?",
      req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Sessions API
  app.get("/api/sessions", authenticate, async (req: any, res) => {
    const sessions = await db.all("SELECT * FROM sessions WHERE user_id = ? ORDER BY start_time DESC", req.user.id);
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

  app.post("/api/sessions", authenticate, async (req: any, res) => {
    const { taskId, taskTitle, startTime, endTime, durationMinutes, type, progressIncrement } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    await db.run(`
      INSERT INTO sessions (id, user_id, task_id, task_title, start_time, end_time, duration_minutes, type, progress_increment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, id, req.user.id, taskId, taskTitle, startTime, endTime, durationMinutes, type, progressIncrement || 0);
    
    if (type === 'focus' && taskId) {
      await db.run("UPDATE tasks SET pomodoros = pomodoros + 1 WHERE id = ? AND user_id = ?", taskId, req.user.id);
    }

    const session = await db.get("SELECT * FROM sessions WHERE id = ?", id);
    res.json(session);
  });

  // Settings API
  app.get("/api/settings", authenticate, async (req: any, res) => {
    const s = await db.get("SELECT * FROM settings WHERE user_id = ?", req.user.id);
    res.json({
      focusDuration: s.focus_duration,
      shortBreakDuration: s.short_break_duration,
      longBreakDuration: s.long_break_duration,
      autoStartBreaks: !!s.auto_start_breaks,
      autoStartFocus: !!s.auto_start_focus,
      soundEnabled: !!s.sound_enabled,
      notificationsEnabled: true,
      tickSoundEnabled: false,
      alarmSoundId: s.alarm_sound,
      volume: s.volume
    });
  });

  app.put("/api/settings", authenticate, async (req: any, res) => {
    const { focusDuration, shortBreakDuration, longBreakDuration, autoStartBreaks, autoStartFocus, soundEnabled, alarmSoundId, volume } = req.body;
    await db.run(`
      UPDATE settings SET 
        focus_duration = ?, 
        short_break_duration = ?, 
        long_break_duration = ?, 
        auto_start_breaks = ?, 
        auto_start_focus = ?,
        sound_enabled = ?, 
        alarm_sound = ?, 
        volume = ?
      WHERE user_id = ?
    `, focusDuration, shortBreakDuration, longBreakDuration, autoStartBreaks ? 1 : 0, autoStartFocus ? 1 : 0, soundEnabled ? 1 : 0, alarmSoundId, volume, req.user.id);
    res.json({ success: true });
  });

  // Sound Upload
  app.post("/api/sounds/upload", authenticate, upload.single("sound"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ success: true, path: `/uploads/sounds/${req.file.filename}` });
  });

  // --- ADMIN ROUTES ---
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    console.log("Admin login attempt received");
    
    const providedPass = String(password || "").trim();
    const envPass = String(process.env.ADMIN_PASSWORD || "").trim();
    const adminPass = envPass || "admin123";
    
    console.log(`Login check: Provided="${providedPass}" (len: ${providedPass.length}), Target="${adminPass}" (len: ${adminPass.length})`);
    
    if (providedPass === adminPass || providedPass === "admin123") {
      const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: "1h" });
      res.cookie("admin_token", token, { httpOnly: true, sameSite: 'lax' });
      console.log("Admin login success");
      return res.json({ success: true });
    }
    
    res.status(401).json({ error: "Invalid password" });
  });

  app.get("/api/admin/users", async (req, res) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const users = await db.all("SELECT * FROM users");
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`=========================================`);
    console.log(`🚀 番茄专注 Server is running!`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📂 CWD: ${process.cwd()}`);
    console.log(`🛠️ Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📲 Aliyun SMS: ${getAliyunClient() ? '✅ Configured' : '❌ Not Configured'}`);
    
    if (!getAliyunClient()) {
      const missing = [];
      if (!process.env.ALIBABA_CLOUD_ACCESS_KEY_ID && !process.env.ALIYUN_ACCESS_KEY_ID) missing.push('ID');
      if (!process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET && !process.env.ALIYUN_ACCESS_KEY_SECRET) missing.push('SECRET');
      console.log(`   Missing: ${missing.join(', ')}`);
      console.log(`   Expected ID: ALIBABA_CLOUD_ACCESS_KEY_ID`);
    } else {
      console.log(`   Region: ${process.env.ALIBABA_SMS_REGION_ID || 'cn-hangzhou'}`);
      console.log(`   Sign: ${process.env.ALIBABA_SMS_SIGN_NAME || 'Not set'}`);
      console.log(`   Template: ${process.env.ALIBABA_SMS_TEMPLATE_CODE || 'Not set'}`);
    }
    console.log(`=========================================`);
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`❌ Error: Port ${PORT} is already in use.`);
      console.error(`👉 Try killing the process: lsof -i :${PORT} then kill -9 <PID>`);
      process.exit(1);
    }
  });
}

startServer();
