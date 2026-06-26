# 🗼 Beacon

> **A transparent, hyperlocal platform for citizens to report, validate, track, and resolve community infrastructure issues with AI-powered triaging and verification.**

🔗 **[Live Production Web App](https://ais-pre-cn2bunjhg3x3quta3aq7xy-235786612474.asia-southeast1.run.app)** | 🛠️ **[Development Sandbox Server](https://ais-dev-cn2bunjhg3x3quta3aq7xy-235786612474.asia-southeast1.run.app)**

Beacon bridges the gap between residents and neighborhood recovery. Built on a tactile, responsive **3D Neobrutalist UI/UX design language**, it offers an interactive map, dynamic stats dashboards, game-like community leaderboard mechanics, and intelligent automated validation.

---

## ✨ Features

- **🗺️ Interactive Map Grid**: Explore hyperlocal, pins-on-the-ground infrastructure alerts with category filtering (Utilities, Roads, Safety, Trash, and more).
- **🤖 Server-Side AI Triaging**: When citizens report an issue, an integrated AI agent analyzes description strings and image assets to automatically score **severity**, justify **validity** (filtering spam or duplicates), and categorize the report.
- **🗳️ Neighborhood Verification Mechanic**: Build collective community trust. Residents can upvote and verify active issues, earning **civic reputation points** and climbing the public neighborhood leaderboard.
- **🎨 3D Tactile Theme**: A bespoke, custom-designed Neobrutalist style system featuring heavy beveled borders, satisfying click-down button states, 3D badge tags, and high-contrast light/dark mode optimization.
- **🖼️ Full-screen Image Lightbox**: Zoom into reported issue photographic evidence directly from the details panel. Features custom smooth scale-in transitions, esc-key handlers, and clean backdrop-blur overlays.
- **🔗 Deep Linking & Web Share API**: Effortlessly mobilize neighborhood action. Share individual issues instantly using native OS social sharing prompts or click-to-copy deep link routing to directly focus on selected reports upon loading.
- **📊 Admin Control Room**: An integrated dashboard enabling authorized triagers to manage and export report lists (`.csv`), ban fraudulent accounts, and override AI recommendations.

---

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 6](https://vite.dev/)
- **Styling & Animations**: [Tailwind CSS v4](https://tailwindcss.com/) & [Motion (formerly Framer Motion)](https://motion.dev/)
- **Backend & Middleware**: [Express v4](https://expressjs.com/) with standard Vite asset pipeline middleware
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Integrations**: Server-side [@google/genai SDK](https://www.npmjs.com/package/@google/genai)
- **Production Bundling**: [esbuild](https://esbuild.github.io/) (compiling server files into unified standalone `dist/server.cjs`)

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) and [npm](https://www.npmjs.com/) installed on your machine.

### 2. Installation

Clone this repository and install the project dependencies:

```bash
# Install dependencies
npm install
```

### 3. Environment Variables Setup

Configure your environment variables. Copy the example configuration:

```bash
cp .env.example .env
```

Open `.env` and add your **Google Gemini API Key** for server-side AI triaging capability:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Running the Development Server

Start the full-stack development environment:

```bash
npm run dev
```

The app will compile instantly and serve on [http://localhost:3000](http://localhost:3000).

### 5. Production Build & Start

To build and run the application in a production-ready, highly-optimized environment:

```bash
# Compile client assets and bundle Express backend to dist/server.cjs
npm run build

# Boot up the server
npm run start
```

---

## 📂 Project Architecture

```txt
├── server.ts               # Express full-stack server with Vite middleware integration
├── package.json            # Scripts, build commands, and package definitions
├── metadata.json           # Application configurations and permissions
├── reports_db.json         # Simulated file-based persistence for local reports
├── src/
│   ├── App.tsx             # Main layout, router tabs, and state controllers
│   ├── main.tsx            # Vite core entry mount point
│   ├── types.ts            # Core TypeScript interfaces (Report, User, Comments)
│   ├── index.css           # Global stylesheets containing custom 3D design variables
│   └── components/
│       ├── InteractiveMap.tsx      # OpenStreetMap-based interactive reporting canvas
│       ├── DashboardInsights.tsx   # Visual charts, metrics, and triaging queue analysis
│       ├── Leaderboard.tsx         # Gamified citizen scoreboards and active badges
│       └── AdminDashboard.tsx      # Power-user control room with exportable analytics
```

---

## 🎨 Design Guidelines: Neobrutalist 3D System

This application bypasses traditional, flat "cookie-cutter" interfaces in favor of highly distinct structural visual cues:
- **Card Shadowing**: Styled with deep black `5px 5px 0px 0px` hard shadows (`#0f172a`), creating a floating layered feel.
- **Button Feedback**: Tactile `active:scale-95` and translating coordinate movements offset perfectly with shadow shifts during click actions to mimic physical hardware.
- **Inverted Insets**: Tables, inputs, and chart backgrounds use beveled inset shadows (`inset 3px 3px 0px 0px`) to guide hierarchy.

---

## 📄 License

This project is licensed under the MIT License - feel free to customize, share, and expand to make your neighborhood a better place!
