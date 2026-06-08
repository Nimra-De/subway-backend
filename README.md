# 🚇 Subway Surfers Tournament — Backend

Full Node.js + Express + MongoDB backend for the tournament website.

---

## 📁 Folder Structure

```
subway-backend/
├── server.js              ← Main entry point
├── package.json
├── .env.example           ← Copy to .env and fill in your values
├── .gitignore
│
├── models/
│   ├── User.js            ← Player accounts (with hashed passwords)
│   ├── Tournament.js      ← Tournament + match brackets
│   └── Score.js           ← Individual run scores
│
├── routes/
│   ├── auth.js            ← POST /signup, POST /login, GET /me
│   ├── players.js         ← GET /players, GET /players/:id
│   ├── leaderboard.js     ← GET /leaderboard, POST /submit
│   └── tournaments.js     ← GET/POST tournaments, join, results
│
├── middleware/
│   └── auth.js            ← JWT protect + adminOnly middleware
│
└── public/                ← Your HTML/CSS/JS files go here
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── api.js             ← Shared API helper (include in every page)
    └── style.css
```

---

## ⚙️ Step 1 — Set Up MongoDB Atlas (free database)

1. Go to https://www.mongodb.com/atlas and create a free account
2. Create a **free cluster** (M0 tier — always free)
3. Click **Connect** → **Connect your application**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/subway_tournament
   ```
5. Replace `<password>` with your actual password in the string

---

## ⚙️ Step 2 — Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env

# 3. Edit .env and paste your MongoDB URI + a secret key
#    MONGO_URI=mongodb+srv://...
#    JWT_SECRET=anyrandomstring123abc

# 4. Start the server
npm run dev      ← auto-restarts when you save files
# or
npm start        ← just runs once
```

Server runs at: **http://localhost:5000**

---

## 📡 API Endpoints

### Auth
| Method | Route | Description | Auth? |
|--------|-------|-------------|-------|
| POST | /api/auth/signup | Create account | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Get my profile | ✅ Yes |
| PUT | /api/auth/me | Update my profile | ✅ Yes |

### Players
| Method | Route | Description | Auth? |
|--------|-------|-------------|-------|
| GET | /api/players | List all players | No |
| GET | /api/players?search=name | Search players | No |
| GET | /api/players/:id | Get one player | No |
| DELETE | /api/players/:id | Delete player | Admin |

### Leaderboard
| Method | Route | Description | Auth? |
|--------|-------|-------------|-------|
| GET | /api/leaderboard | Top 50 players | No |
| POST | /api/leaderboard/submit | Submit a score | ✅ Yes |
| GET | /api/leaderboard/my-scores | My score history | ✅ Yes |

### Tournaments
| Method | Route | Description | Auth? |
|--------|-------|-------------|-------|
| GET | /api/tournaments | List all tournaments | No |
| GET | /api/tournaments?status=active | Filter by status | No |
| GET | /api/tournaments/:id | Get one tournament | No |
| POST | /api/tournaments | Create tournament | Admin |
| POST | /api/tournaments/:id/join | Join tournament | ✅ Yes |
| PUT | /api/tournaments/:id/status | Change status | Admin |
| POST | /api/tournaments/:id/result | Record match | Admin |
| PUT | /api/tournaments/:id/winner | Set winner | Admin |

---

## 🛡️ Making Yourself Admin

After signing up, open MongoDB Atlas → Browse Collections → users → find your account → change `"role": "player"` to `"role": "admin"`.

---

## 🚀 Step 3 — Deploy to Render (free)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/subway-backend.git
   git push -u origin main
   ```

2. **Create Render account:** https://render.com (free)

3. **New Web Service** → Connect your GitHub repo

4. **Settings:**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: `Node`

5. **Add Environment Variables** in Render dashboard:
   - `MONGO_URI` = your MongoDB Atlas string
   - `JWT_SECRET` = your secret key

6. Click **Deploy** — Render gives you a URL like:
   `https://subway-tournament.onrender.com`

7. **Update your frontend:** Open `public/api.js` and change:
   ```js
   const API_BASE = 'https://subway-tournament.onrender.com';
   ```

---

## 🔌 Connecting Frontend Pages

Add these two lines to the `<head>` of every HTML page:
```html
<script src="api.js"></script>
```

Then use the API object anywhere:
```js
// Login example
const data = await API.login({ email, password });
localStorage.setItem('token', data.token);

// Get leaderboard
const data = await API.getLeaderboard(50);
data.leaderboard.forEach(p => console.log(p.name, p.highScore));

// Join a tournament
await API.joinTournament('tournament_id_here');
```

The `api.js` file also automatically updates the navbar — if the user is logged in, it shows their name and a logout button instead of Sign Up / Login links.

---

## ⚠️ Important Notes

- Never commit `.env` to GitHub — it's in `.gitignore` already
- Passwords are hashed with bcrypt — they cannot be read even from the database
- JWT tokens expire after 7 days — users need to log in again after that
- Render free tier spins down after 15 min of inactivity — first request may take ~30 seconds to wake up
