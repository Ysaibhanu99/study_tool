# Study Sanctuary 🌿

okay so i built this because i kept opening like 10 different tabs just to study — one for a timer, one for my to-do list, one for ambient sounds... it was a mess. so i just made one thing that does all of it.

its called **Study Sanctuary** and it actually helps me sit down and study without getting distracted every 5 minutes lol

---

## what it does

- **focus timer** — pomodoro style. 25 min focus, 5 min break, 50 min deep work. you can set a goal for each session so you actually know what you're supposed to be doing
- **priority matrix** — drag tasks into "do now", "schedule", "delegate", or "drop". basically eisenhower matrix stuff we learned about but actually useful
- **checklist** — morning routine, study ritual, evening wind down. you can add your own stuff too
- **ambient sounds** — rain, forest, fireplace, ocean waves, white noise, brown noise, wind. all generated in the browser, no downloads needed
- **session log** — tracks every session you complete with the time and what your goal was

everything saves to a real database so it doesn't disappear when you close the tab (learned that the hard way)

---

## stack i used

- plain HTML + CSS + JavaScript (no frameworks, kept it simple)
- Node.js + Express for the backend
- PostgreSQL on Neon (free cloud database)
- deployed on Render

---

## how to run it locally

you need Node.js installed first

```bash
git clone https://github.com/Ysaibhanu99/study_tool.git
cd study_tool
npm install
node server.js
```

then open `http://localhost:3001` in your browser

---

## live version

https://study-tool-t4h4.onrender.com

(might take like 30 seconds to load the first time because its on the free plan and it sleeps when nobody uses it)

---

## why i made this

honestly i have a really bad habit of procrastinating and i thought if i build a tool for studying maybe ill actually use it. the tips tab has some stuff that genuinely helped me like the 2 minute rule and body doubling. 

also this was a good way to learn how to connect a frontend to a real database so it was useful for that too

---

## stuff i might add later

- streak tracking
- subject tags for sessions
- dark/light mode toggle
- maybe a notes section idk

---

made by Sai 🌙
