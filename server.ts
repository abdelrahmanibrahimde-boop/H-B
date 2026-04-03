import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'db.json');

// Funktion, um die Datenbank sauber von Anfang an neu zu erstellen
const initDB = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    users: [
      { id: '1', username: 'admin', password: 'admin', email: '', birthdate: '' }
    ]
  }, null, 2));
};

// DB initialisieren oder reparieren, falls sie kaputt ist
if (!fs.existsSync(DB_FILE)) {
  initDB();
} else {
  try {
    JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    console.warn("Warnung: db.json war beschädigt. Wird von Anfang an neu erstellt...");
    initDB();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  // Erlaubt Anfragen von externen Domains (wie z.B. deinem lokalen PC zu Vercel)
  app.use(cors({
    origin: '*' // Erlaubt vorerst Anfragen von überall, wichtig fürs Hosting
  }));

  // API Routes
  app.post('/api/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      
      const user = db.users.find((u: any) => u.username === username && u.password === password);
      
      if (user) {
        // In a real app, generate a JWT. Here we just send back user info.
        res.json({ success: true, user: { id: user.id, username: user.username } });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (err) {
      console.error("Backend Fehler beim Login:", err);
      res.status(500).json({ success: false, message: 'Server-Fehler: Bitte überprüfe, ob die db.json Datei ein gültiges JSON-Format hat.' });
    }
  });

  app.post('/api/signup', (req, res) => {
    try {
      const { username, password } = req.body;
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      
      if (db.users.some((u: any) => u.username === username)) {
        return res.status(400).json({ success: false, message: 'Benutzername existiert bereits!' });
      }
      
      const newUser = { id: Date.now().toString(), username, password, email: '', birthdate: '' };
      db.users.push(newUser);
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      
      res.json({ success: true, user: { id: newUser.id, username: newUser.username } });
    } catch (err) {
      console.error("Backend Fehler beim Registrieren:", err);
      res.status(500).json({ success: false, message: 'Server-Fehler bei der Registrierung.' });
    }
  });

  app.put('/api/user/:id', (req, res) => {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      const userIndex = db.users.findIndex((u: any) => u.id === req.params.id);
      
      if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
      }

      if (req.body.username && req.body.username !== db.users[userIndex].username) {
        if (db.users.some((u: any) => u.username === req.body.username)) {
          return res.status(400).json({ success: false, message: 'Benutzername existiert bereits!' });
        }
      }

      db.users[userIndex] = { ...db.users[userIndex], ...req.body };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      
      res.json({ success: true, user: db.users[userIndex] });
    } catch (err) {
      console.error("Backend Fehler beim Update:", err);
      res.status(500).json({ success: false, message: 'Server-Fehler beim Speichern.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
