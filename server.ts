import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database (Simulating Cloudflare D1)
const db = new Database("poker.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    chips INTEGER DEFAULT 10000,
    status TEXT DEFAULT 'active',
    current_card TEXT
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT,
    pot INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting'
  );

  CREATE TABLE IF NOT EXISTS user_finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'deposit', 'withdrawal'
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    balance INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS partner_finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER,
    type TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    difficulty TEXT,  -- easy / normal / hard
    style TEXT,        -- tight / aggressive / bluff
    chips INTEGER DEFAULT 50000,
    status TEXT DEFAULT 'idle'
  );

  CREATE TABLE IF NOT EXISTS bot_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER,
    game_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT,
    winner TEXT,
    pot INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed data if empty
const adminCount = db.prepare("SELECT count(*) as count FROM admins").get() as { count: number };
if (adminCount.count === 0) {
  db.prepare("INSERT INTO admins (username, password) VALUES (?, ?)").run("admin", "qkralscjf");
  db.prepare("INSERT INTO users (username, password, chips) VALUES (?, ?, ?)").run("player1", "pass123", 50000);
  db.prepare("INSERT INTO users (username, password, chips) VALUES (?, ?, ?)").run("player2", "pass123", 25000);
  db.prepare("INSERT INTO games (table_name, pot, status) VALUES (?, ?, ?)").run("High Stakes Table", 15000, "active");
  db.prepare("INSERT INTO games (table_name, pot, status) VALUES (?, ?, ?)").run("Beginner Table", 2000, "active");
  
  // Seed new tables
  db.prepare("INSERT INTO partners (name, balance) VALUES (?, ?)").run("Partner A", 1000000);
  db.prepare("INSERT INTO bots (name, difficulty, style, chips, status) VALUES (?, ?, ?, ?, ?)").run("Bot_Alpha", "normal", "balanced", 50000, "idle");
  db.prepare("INSERT INTO bots (name, difficulty, style, chips, status) VALUES (?, ?, ?, ?, ?)").run("Bot_Beta", "hard", "aggressive", 100000, "idle");
  db.prepare("INSERT INTO bots (name, difficulty, style, chips, status) VALUES (?, ?, ?, ?, ?)").run("Bot_Gamma", "easy", "tight", 20000, "idle");
  db.prepare("INSERT INTO notices (title, content) VALUES (?, ?)").run("Welcome", "Welcome to Poker Admin System");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("site_name", "PokerHub Admin");
  db.prepare("INSERT INTO user_finance (user_id, type, amount, status) VALUES (?, ?, ?, ?)").run(1, "deposit", 10000, "completed");
  db.prepare("INSERT INTO game_history (table_name, winner, pot) VALUES (?, ?, ?)").run("High Stakes Table", "player1", 5000);
} else {
  // Ensure the admin password is updated if it already exists
  db.prepare("UPDATE admins SET password = ? WHERE username = ?").run("qkralscjf", "admin");
  console.log("Admin password updated to qkralscjf");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes (Simulating Cloudflare Workers)
  
  // Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for ${username}`);
    const admin = db.prepare("SELECT * FROM admins WHERE username = ? AND password = ?").get(username, password);
    
    if (admin) {
      res.json({ success: true, token: btoa(username + ":" + password) });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Get Users
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  // Get User Finance
  app.get("/api/admin/user-finance", (req, res) => {
    const finance = db.prepare(`
      SELECT uf.*, u.username 
      FROM user_finance uf 
      JOIN users u ON uf.user_id = u.id
      ORDER BY uf.created_at DESC
    `).all();
    res.json(finance);
  });

  // Get Partners
  app.get("/api/admin/partners", (req, res) => {
    const partners = db.prepare("SELECT * FROM partners").all();
    res.json(partners);
  });

  // Get Partner Finance
  app.get("/api/admin/partner-finance", (req, res) => {
    const finance = db.prepare(`
      SELECT pf.*, p.name as partner_name 
      FROM partner_finance pf 
      JOIN partners p ON pf.partner_id = p.id
      ORDER BY pf.created_at DESC
    `).all();
    res.json(finance);
  });

  // Get Bots
  app.get("/api/admin/bots", (req, res) => {
    const bots = db.prepare(`
      SELECT b.*, g.table_name as assigned_room 
      FROM bots b
      LEFT JOIN bot_assignments ba ON b.id = ba.bot_id AND ba.status = 'active'
      LEFT JOIN games g ON ba.game_id = g.id
    `).all();
    res.json(bots);
  });

  // Assign Bot to Room
  app.post("/api/admin/bot/assign", (req, res) => {
    const { botId, gameId } = req.body;
    
    // Deactivate previous assignments for this bot
    db.prepare("UPDATE bot_assignments SET status = 'inactive' WHERE bot_id = ?").run(botId);
    
    // Create new assignment
    db.prepare("INSERT INTO bot_assignments (bot_id, game_id, status) VALUES (?, ?, 'active')").run(botId, gameId);
    
    // Update bot status
    db.prepare("UPDATE bots SET status = 'playing' WHERE id = ?").run(botId);
    
    res.json({ success: true });
  });

  // Remove Bot from Room
  app.post("/api/admin/bot/remove", (req, res) => {
    const { botId } = req.body;
    db.prepare("UPDATE bot_assignments SET status = 'inactive' WHERE bot_id = ?").run(botId);
    db.prepare("UPDATE bots SET status = 'idle' WHERE id = ?").run(botId);
    res.json({ success: true });
  });

  // Get Game History
  app.get("/api/admin/history", (req, res) => {
    const history = db.prepare("SELECT * FROM game_history ORDER BY created_at DESC").all();
    res.json(history);
  });

  // Get Notices
  app.get("/api/admin/notices", (req, res) => {
    const notices = db.prepare("SELECT * FROM notices ORDER BY created_at DESC").all();
    res.json(notices);
  });

  // Get Settings
  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  // Kick User
  app.post("/api/admin/kick", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE users SET status = 'kicked' WHERE id = ?").run(userId);
    res.json({ success: true });
  });

  // Change Card
  app.post("/api/admin/game/change-card", (req, res) => {
    const { userId, newCard } = req.body;
    console.log(`Changing card for user ${userId} to ${newCard}`);
    db.prepare("UPDATE users SET current_card = ? WHERE id = ?").run(newCard, userId);
    res.json({ success: true });
  });

  // Get Games
  app.get("/api/admin/games", (req, res) => {
    const games = db.prepare("SELECT * FROM games").all();
    res.json(games);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Advanced Poker AI Logic
  function evaluateHand(cards: any) {
    // Simple hand strength evaluator (0 to 1)
    return Math.random();
  }

  function simulateGame(hand: any) {
    // Random result for simulation
    return Math.random() > 0.5 ? "win" : "lose";
  }

  function monteCarloWinRate(hand: any, iterations = 100) {
    let wins = 0;
    for (let i = 0; i < iterations; i++) {
      if (simulateGame(hand) === "win") wins++;
    }
    return wins / iterations;
  }

  class GTOBotLogic {
    decide(state: { winRate: number, pot: number, callAmount: number, style: string }) {
      const equity = state.winRate;
      const potOdds = state.callAmount / (state.pot + state.callAmount || 1);

      // Adjust threshold based on style
      let threshold = 0.5;
      if (state.style === "aggressive") threshold = 0.4;
      if (state.style === "tight") threshold = 0.6;

      if (equity > 0.75) return "RAISE";
      if (equity > threshold || equity > potOdds) return "CALL";
      
      // Bluffing
      if (Math.random() < 0.05) return "RAISE";
      
      return "FOLD";
    }
  }

  const gtoLogic = new GTOBotLogic();

  // Simple Bot Simulation Loop with AI
  setInterval(() => {
    const activeAssignments = db.prepare("SELECT * FROM bot_assignments WHERE status = 'active'").all() as any[];
    
    activeAssignments.forEach(assignment => {
      const bot = db.prepare("SELECT * FROM bots WHERE id = ?").get(assignment.bot_id) as any;
      const game = db.prepare("SELECT * FROM games WHERE id = ?").get(assignment.game_id) as any;
      
      if (bot && game) {
        const winRate = monteCarloWinRate([]);
        const action = gtoLogic.decide({
          winRate,
          pot: game.pot,
          callAmount: 100, // Simulated call amount
          style: bot.style
        });

        const amount = action === "RAISE" ? Math.floor(Math.random() * 500) + 100 : 0;
        
        console.log(`[AI BOT] ${bot.name} (${bot.style}) in ${game.table_name} decided: ${action} ${amount > 0 ? `($${amount})` : ""} (WinRate: ${(winRate * 100).toFixed(1)}%)`);
        
        if (action === "RAISE") {
          db.prepare("UPDATE games SET pot = pot + ? WHERE id = ?").run(amount, game.id);
        } else if (action === "FOLD") {
          // In a real game, the bot would leave or sit out. 
          // For simulation, we just log it.
        }
      }
    });
  }, 5000); // Faster simulation for demo
}

startServer();
