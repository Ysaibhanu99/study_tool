const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main HTML file at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'study_toolkit_final.html'));
});

// ── DATABASE CONNECTION ──
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_smPfQxNVj78h@ep-polished-bar-aqrw6m2n-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// ── INIT TABLES ──
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         SERIAL PRIMARY KEY,
      time_str   TEXT NOT NULL,
      label      TEXT NOT NULL,
      mins       INTEGER NOT NULL,
      goal       TEXT,
      subject    TEXT DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS deadlines (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      subject    TEXT DEFAULT '',
      due_date   DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    
    CREATE TABLE IF NOT EXISTS study_plans (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL,
      date       DATE DEFAULT CURRENT_DATE,
      is_done    BOOLEAN DEFAULT FALSE,
      color      TEXT DEFAULT '#4CAF7A',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plan_subtasks (
      id         SERIAL PRIMARY KEY,
      plan_id    INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      is_done    BOOLEAN DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Add subject column to sessions if it doesn't exist (migration)
  await pool.query(`
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';
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

app.get('/api/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sessions WHERE created_at >= NOW() - INTERVAL '24 hours' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Weekly sessions grouped by day (last 7 days)
app.get('/api/sessions/weekly', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day,
        SUM(mins) AS total_mins,
        COUNT(*) AS session_count
      FROM sessions
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
      ORDER BY day ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Streak: count consecutive days with at least 1 session
app.get('/api/sessions/streak', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day
      FROM sessions
      ORDER BY day DESC
    `);
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < result.rows.length; i++) {
      const day = new Date(result.rows[i].day);
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (day.toDateString() === expected.toDateString()) {
        streak++;
      } else break;
    }
    res.json({ streak });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Subject breakdown
app.get('/api/sessions/subjects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT subject, SUM(mins) AS total_mins, COUNT(*) AS sessions
      FROM sessions
      WHERE subject != '' AND subject IS NOT NULL
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY subject
      ORDER BY total_mins DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions', async (req, res) => {
  const { time_str, label, mins, goal, subject } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sessions (time_str, label, mins, goal, subject) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [time_str, label, mins, goal || '', subject || '']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sessions', async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// TASKS API
// ═══════════════════════════════════════

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  const { text, quad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (text, quad) VALUES ($1, $2) RETURNING *', [text, quad]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// CHECKLIST API
// ═══════════════════════════════════════

app.get('/api/checklist', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checklist_items ORDER BY section, sort_order, created_at');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checklist', async (req, res) => {
  const { section, text } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO checklist_items (section, text, is_custom, is_checked) VALUES ($1, $2, TRUE, FALSE) RETURNING *',
      [section, text]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/checklist/:id', async (req, res) => {
  const { is_checked } = req.body;
  try {
    const result = await pool.query(
      'UPDATE checklist_items SET is_checked = $1 WHERE id = $2 RETURNING *',
      [is_checked, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/checklist/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM checklist_items WHERE id = $1 AND is_custom = TRUE', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checklist/reset', async (req, res) => {
  try {
    await pool.query('UPDATE checklist_items SET is_checked = FALSE');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// DEADLINES API
// ═══════════════════════════════════════

app.get('/api/deadlines', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deadlines ORDER BY due_date ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/deadlines', async (req, res) => {
  const { title, subject, due_date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO deadlines (title, subject, due_date) VALUES ($1, $2, $3) RETURNING *',
      [title, subject || '', due_date]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/deadlines/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM deadlines WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══════════════════════════════════════
// STUDY PLANS API
// ═══════════════════════════════════════

// Get all plans with their subtasks
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await pool.query('SELECT * FROM study_plans ORDER BY date DESC, start_time ASC');
    const subtasks = await pool.query('SELECT * FROM plan_subtasks ORDER BY sort_order, created_at');
    const result = plans.rows.map(p => ({
      ...p,
      subtasks: subtasks.rows.filter(s => s.plan_id === p.id)
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/plans', async (req, res) => {
  const { title, start_time, end_time, date, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO study_plans (title, start_time, end_time, date, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, start_time, end_time, date || new Date().toISOString().split('T')[0], color || '#4CAF7A']
    );
    res.json({ ...result.rows[0], subtasks: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/plans/:id', async (req, res) => {
  const { is_done } = req.body;
  try {
    const result = await pool.query(
      'UPDATE study_plans SET is_done = $1 WHERE id = $2 RETURNING *',
      [is_done, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM study_plans WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Subtasks
app.post('/api/plans/:id/subtasks', async (req, res) => {
  const { text } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO plan_subtasks (plan_id, text) VALUES ($1, $2) RETURNING *',
      [req.params.id, text]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/subtasks/:id', async (req, res) => {
  const { is_done } = req.body;
  try {
    const result = await pool.query(
      'UPDATE plan_subtasks SET is_done = $1 WHERE id = $2 RETURNING *',
      [is_done, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/subtasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM plan_subtasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════

app.get('/api/state/:key', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM app_state WHERE key = $1', [req.params.key]);
    res.json({ value: result.rows[0]?.value ?? null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/state/:key', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query(
      'INSERT INTO app_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [req.params.key, value]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── START ──
const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🌿 Study Sanctuary API running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to database:', err.message);
  process.exit(1);
});
