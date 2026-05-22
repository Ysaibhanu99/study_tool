# Study Sanctuary 🌿

okay so i built this because i kept opening like 10 different tabs just to study — one for a timer, one for my to-do list, one for ambient sounds... it was a mess. so i just made one thing that does all of it.

its called **Study Sanctuary** and it actually helps me sit down and study without getting distracted every 5 minutes lol

---

## what it does

- **focus timer** — pomodoro style. 25 min focus, 5 min break, 50 min deep work. plus i added a **custom timer** where you can enter hours & minutes yourself if you want a custom study session. you can set a goal for each session so you actually know what you're supposed to be doing
- **study planner** — a whole new planner tab where you can add tasks with specific start and end times, color labels, and even sub-tasks (if you're like me and need to break things down to actually do them). it has filters for today, all, pending, and completed tasks
- **priority matrix** — drag tasks into "do now", "schedule", "delegate", or "drop". basically eisenhower matrix stuff we learned about but actually useful
- **music player** — you can load a whole folder of your own mp3 songs and play them all in a row! has playlist view, shuffle, repeat, and volume/seek controls. super clean.
- **ambient sounds** — rain, forest, fireplace, ocean waves, white noise, brown noise, wind. all generated in the browser, no downloads needed
- **deadline tracker & calendar** — keep track of upcoming exams or assignments with a countdown timer so you don't forget (under the plan tab)
- **xp & leveling system** — you earn experience points (xp) for every minute you study! start as a "Seedling" and level up all the way to "Master" 
- **streak & daily goals** — tracks your study streak in days and lets you set a daily study goal (like 2 hours). there is a progress ring that fills up as you study
- **weekly stats graph** — a visual chart that shows how many minutes you studied each day of the week, so you can feel good about yourself (or guilty lol)
- **subject tags** — tag your study sessions (e.g. math, cs, history) to track where your time is going
- **themes** — 4 different aesthetics (Night Forest, Dawn, Rainy Day, Ocean) to match your vibe
- **checklist** — morning routine, study ritual, evening wind down. you can add your own stuff too
- **session log** — tracks every session you complete with the time, subject tag, and what your goal was

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

- maybe integration with google calendar idk
- a flashcard / spaced repetition helper
- pomodoro group chats / study rooms with friends

---

made by Sai 🌙
