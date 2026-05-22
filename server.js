const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ── DATABASE CONNECTION ──
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_smPfQxNVj78h@ep-polished-bar-aqrw6m2n-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// ── INIT TABLES ──
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id        SERIAL PRIMARY KEY,
      time_str  TEXT NOT NULL,
      label     TEXT NOT NULL,
      mins      INTEGER NOT NULL,
      goal      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id         SERIAL PRIMARY KEY,
      text       TEXT NOT NULL,
      quad       TEXT NOT NULL CHECK (quad IN ('do','schedule','delegate','drop')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id         SERIAL PRIMARY KEY,
      section    TEXT NOT NULL CHECK (section IN ('morning','study','evening')),
      text       TEXT NOT NULL,
      is_custom  BOOLEAN DEFAULT FALSE,
      is_checked BOOLEAN DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default checklist items if table is empty
  const { rowCount } = await pool.query('SELECT 1 FROM checklist_items LIMIT 1');
  if (rowCount === 0) {
    const defaults = [
      { section: 'morning', items: [
        "Review today's top 3 study goals",
        "Eat breakfast and drink water",
        "Put phone on do-not-disturb",
        "Clear your desk of distractions"
      ]},
      { section: 'study', items: [
        "Set a timer before starting",
        "Write down what you'll accomplish this session",
        "Close all unrelated browser tabs",
        "Take a 5-min break every 25 minutes",
        "Review what you studied before stopping"
      ]},
      { section: 'evening', items: [
        "Write tomorrow's top 3 priorities tonight",
        "Log what you actually got done today",
        "No studying 30 min before sleep",
        "Charge phone outside the bedroom"
      ]}
    ];
    for (const group of defaults) {
      for (let i = 0; i < group.items.length; i++) {
        await pool.query(
          'INSERT INTO checklist_items (section, text, is_custom, sort_order) VALUES ($1, $2, FALSE, $3)',
          [group.section, group.items[i], i]
        );
      }
    }
    console.log('✅ Default checklist items seeded');
  }

  console.log('✅ Database tables ready');
}

// ═══════════════════════════════════════
// SESSIONS API
// ═══════════════════════════════════════

// GET all sessions (today's)
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sessions WHERE created_at >= NOW() - INTERVAL '24 hours' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST new session
app.post('/api/sessions', async (req, res) => {
  const { time_str, label, mins, goal } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sessions (time_str, label, mins, goal) VALUES ($1, $2, $3, $4) RETURNING *',
      [time_str, label, mins, goal || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE all sessions (clear log)
app.delete('/api/sessions', async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// TASKS API
// ═══════════════════════════════════════

// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new task
app.post('/api/tasks', async (req, res) => {
  const { text, quad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (text, quad) VALUES ($1, $2) RETURNING *',
      [text, quad]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a task by id
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// CHECKLIST API
// ═══════════════════════════════════════

// GET all checklist items
app.get('/api/checklist', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM checklist_items ORDER BY section, sort_order, created_at'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST custom checklist item
app.post('/api/checklist', async (req, res) => {
  const { section, text } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO checklist_items (section, text, is_custom, is_checked) VALUES ($1, $2, TRUE, FALSE) RETURNING *',
      [section, text]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH checklist item (toggle checked)
app.patch('/api/checklist/:id', async (req, res) => {
  const { is_checked } = req.body;
  try {
    const result = await pool.query(
      'UPDATE checklist_items SET is_checked = $1 WHERE id = $2 RETURNING *',
      [is_checked, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE custom checklist item
app.delete('/api/checklist/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM checklist_items WHERE id = $1 AND is_custom = TRUE', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset all checks for a new day
app.post('/api/checklist/reset', async (req, res) => {
  try {
    await pool.query('UPDATE checklist_items SET is_checked = FALSE');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// APP STATE (session count / streak)
// ═══════════════════════════════════════

app.get('/api/state/:key', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM app_state WHERE key = $1', [req.params.key]);
    res.json({ value: result.rows[0]?.value ?? null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/state/:key', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query(
      'INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [req.params.key, value]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START ──
const PORT = 3001;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🌿 Study Sanctuary API running at http://localhost:${PORT}`);
    console.log(`   Open: http://localhost:${PORT}/study_toolkit_final.html`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to database:', err.message);
  process.exit(1);
});
