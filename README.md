# 🚀 Tic-Tac-Toe Multiplayer: Server-Authoritative Assignment

A high-performance, real-time multiplayer Tic-Tac-Toe application built for the Lila Games assignment. This project leverages **Nakama** for server-authoritative logic, ensuring fair play and robust synchronization between players.

---

## ✨ Key Features

- **🎮 Real-time Multiplayer**: Seamless gameplay powered by WebSockets.
- **⚡ Super-Fast Matchmaking**: Join a game instantly with Nakama's matchmaker.
- **🏠 Private Rooms**: Create, discover, and join manual rooms.
- **🛡️ Server-Authoritative Logic**: Every move is validated by the server to prevent cheating.
- **🔄 Graceful Disconnects**: Automatic win-by-forfeit if an opponent leaves.
- **📱 Responsive UI**: Beautifully designed with React and Vite.

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Backend**: [Nakama Runtime](https://heroiclabs.com/docs/nakama/server-framework/introduction/) (TypeScript)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Infrastructure**: [Docker Compose](https://docs.docker.com/compose/)
- **Hosting (Planned)**: [Azure Container Apps](https://azure.microsoft.com/en-us/products/container-apps/) & [Azure Static Web Apps](https://azure.microsoft.com/en-us/products/static-web-apps/)

---

## 🚀 Quick Start (Local)

### 1️⃣ Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

### 2️⃣ Clone and Install
```bash
# Install Frontend dependencies
cd frontend
npm install

# Install Backend dependencies
cd ../backend
npm install
```

### 3️⃣ Build the Backend
Nakama requires a bundled JavaScript runtime.
```bash
cd backend
npm run build
```

### 4️⃣ Spin up the Infrastructure
```bash
docker compose up -d
```

### 5️⃣ Launch the Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 🌍 Local Development URLs

| Service          | URL                                      | Notes                          |
| ---------------- | ---------------------------------------- | ------------------------------ |
| **Frontend**     | [http://localhost:5173](http://localhost:5173) | Vite Dev Server                |
| **Nakama API**   | [http://localhost:7350](http://localhost:7350) | WebSocket & REST Endpoint       |
| **Nakama Console** | [http://localhost:7351](http://localhost:7351) | Dashboard (User/Pass: `admin`) |

---

## 🏗️ Architecture Overview

- **Authoritative Match Handler**: The game state lives on the server (`backend/src/match_handler.ts`). Clients only send move requests; the server updates and broadcasts the state.
- **Device Authentication**: Uses Nakama's device-unique IDs for instant, passwordless logins.
- **WebSocket Communication**: Real-time state updates are pushed to clients via the Nakama socket.

---

- **Backend**: Containerized and deployed to **Azure App Service (Web App for Containers)** using Docker Compose.
- **Database**: **PostgreSQL** running as a containerized service alongside Nakama.
- **Frontend**: High-speed delivery via **Azure Static Web Apps**.
- **CI/CD**: Automated via **GitHub Actions** with Docker Hub integration.

---

## 🌍 Live Deployment URLs

| Service          | URL                                      |
| ---------------- | ---------------------------------------- |
| **Live Game**    | [https://victorious-wave-0a1c9e20f.6.azurestaticapps.net/](https://victorious-wave-0a1c9e20f.6.azurestaticapps.net/) |
| **Backend API**  | `https://nakama-backend-tictactoe-grb9cxgzhzgpg3bt.centralus-01.azurewebsites.net` |
| **Source Code**  | [https://github.com/rishiratanmishra/tic-tac-toe-nakama](https://github.com/rishiratanmishra/tic-tac-toe-nakama) |

---

## 📂 Project Structure

```text
├── backend          # Nakama Authoritative Logic
│   ├── src          # TypeScript source code
│   └── data         # Nakama configuration & storage
├── frontend         # React + Vite Client
│   └── src          # UI components & game logic
└── docker-compose.yml # Dev environment orchestrator
```

---


