# 🚀 DevOps Infrastructure Monitor

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-9-13aa52)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-ISC-yellow)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://monitoring-production-19a5.up.railway.app)

A comprehensive full-stack web application for monitoring infrastructure, APIs, and services with real-time status tracking, incident management, and centralized logging.

## 🌐 Live Demo
**➜ [https://monitoring-production-19a5.up.railway.app/](https://monitoring-production-19a5.up.railway.app/)**

> Try the live application deployed on Railway. Register a new account or login to test the monitoring features!

---S

## 📋 Table of Contents
- [Live Demo](#-live-demo)
- [Quick Start](#-quick-start)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)

---

## ⚡ Quick Start

### 1. **Register/Login**
- Visit [https://monitoring-production-19a5.up.railway.app/](https://monitoring-production-19a5.up.railway.app/)
- Create a new account with your details
- You'll be automatically logged in and redirected to the dashboard

### 2. **Create Your First Monitor**
- Click "Add Monitor" on the dashboard
- Enter the service details (URL, type, interval)
- Start monitoring in real-time!

### 3. **View Dashboard**
- See all monitors and their current status
- Track incidents and logs
- Monitor performance metrics

---

## 🎬 Getting Started Locally

### **Prerequisites**
- Node.js v18+
- MongoDB
- Git

### **Clone & Setup**
```bash
# Clone repository
git clone https://github.com/jatinvats123/DEVOPS-HACKATHON.git
cd DEVOPS-HACKATHON

# Backend
cd Backend
npm install
npm run dev

# Frontend (new terminal)
cd Frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the application!

---

## 🎯 Problem Statement

DevOps teams often struggle with monitoring multiple services, APIs, and infrastructure endpoints across different environments. Existing solutions are either too complex, expensive, or difficult to set up. There's a critical need for a lightweight, user-friendly monitoring platform that provides:

- ✅ Real-time status monitoring
- ✅ Incident tracking and logging
- ✅ Easy setup and deployment
- ✅ Secure authentication
- ✅ Scalable architecture

**DevOps Infrastructure Monitor** solves these challenges with an intuitive, modern platform.

---

## ✨ Key Features

### 🔐 Authentication & Security
- User registration with email verification
- Secure login/logout with JWT tokens
- Password reset and change functionality
- Bcryptjs password hashing
- Protected routes and API endpoints
- Auto-verification for development ease
- Minimal, luxury-style authentication UI

### 📊 Infrastructure Monitoring
- Create and manage multiple monitors
- Support for multiple protocols:
  - Website/HTTP(S) monitoring
  - API endpoint monitoring
  - Ping (ICMP) monitoring
  - TCP port monitoring
  - DNS resolution monitoring
- Configurable monitoring intervals (default: 60 seconds)
- Real-time status tracking (UP/DOWN)
- Automatic monitoring with cron jobs
- Custom timeout configuration
- Last checked timestamp

### 📈 Dashboard & Analytics
- Centralized monitoring dashboard
- Real-time status visualization
- Monitor management (create, view, delete)
- Incident tracking and history
- Comprehensive logging system
- Health metrics collection
- Historical data for analytics

### 🎨 User Interface
- Modern, clean design with React
- Responsive mobile-friendly layout
- Protected authenticated routes
- Real-time notifications
- Form validation and error handling
- Tailwind CSS styling
- Hot module replacement during development

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| Redux Toolkit | State management |
| React Router 7 | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS | Styling |
| React Hot Toast | Notifications |

### **Backend**
| Technology | Purpose |
|-----------|---------|
| Node.js | Runtime environment |
| Express.js 5 | Web framework |
| MongoDB 9 | Database |
| Mongoose | ODM for MongoDB |
| JWT | Authentication |
| Bcryptjs | Password hashing |
| Node-cron | Job scheduling |
| Morgan | HTTP logging |
| Helmet | Security headers |

### **DevOps & Deployment**
| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Git | Version control |
| Environment Variables | Configuration management |

---

## 🏗️ Architecture

### **System Design**
```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                       │
│         (React + Redux + React Router)                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Vite)                       │
│  - Authentication Pages (Login/Register)               │
│  - Dashboard (Monitor Status)                          │
│  - Monitor Management                                  │
│  - Protected Routes                                    │
└─────────────────────────────────────────────────────────┘
                           ↓
                    (REST API/HTTP)
                           ↓
┌─────────────────────────────────────────────────────────┐
│                Backend (Express.js)                     │
│  - Auth Routes (/api/auth/*)                           │
│  - Monitor Routes (/api/monitor/*)                     │
│  - Incident Routes (/api/incidents/*)                 │
│  - Logs Routes (/api/logs/*)                          │
│  - Health Routes (/api/health)                        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Database (MongoDB)                        │
│  - Users Collection                                    │
│  - Monitors Collection                                 │
│  - Incidents Collection                                │
│  - Logs Collection                                     │
└─────────────────────────────────────────────────────────┘
```

### **Data Flow**
1. User registers/logs in → JWT token issued
2. Token stored in localStorage & Redux store
3. Protected routes verify token & authentication state
4. User creates monitors → Stored in MongoDB
5. Backend cron jobs run scheduled checks
6. Status updates → API response → Redux state → UI update
7. Incidents logged → Dashboard displays real-time status

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js v18 or higher
- npm or yarn package manager
- MongoDB (local or Atlas)
- Git

### **Installation & Setup**

#### 1. **Clone the Repository**
```bash
git clone https://github.com/jatinvats123/DEVOPS-HACKATHON.git
cd DEVOPS-HACKATHON
```

#### 2. **Backend Setup**
```bash
cd Backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/devops-monitor
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
MAIL_HOST=smtp.gmail.com
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173
EOF

# Start backend server
npm run dev
```

Backend runs on: `http://localhost:8000`

#### 3. **Frontend Setup** (New Terminal)
```bash
cd Frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_BACKEND_URL=http://localhost:8000
VITE_REGISTER_API=/api/auth/register
VITE_LOGIN_API=/api/auth/login
VITE_GET_USER_API=/api/auth/profile
VITE_FORGOT_PASSWORD_API=/api/auth/forgot-password
VITE_CHANGE_PASSWORD_API=/api/auth/change-password
VITE_INCIDENTS_API=/api/incidents
VITE_LOGS_API=/api/logs
VITE_CREATE_MONITORING_API=/api/monitor
VITE_GET_LOGS_API=/api/logs
VITE_HEALTH_API=/api/health
EOF

# Start frontend dev server
npm run dev
```

Frontend runs on: `http://localhost:5173`

#### 4. **Docker Setup** (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

---

## 📁 Project Structure

```
DEVOPS-HACKATHON/
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.jsx                 # Main app component
│   │   │   ├── app.routes.jsx          # Route configuration
│   │   │   ├── app.store.js            # Redux store
│   │   │   └── ProtectedRoute.jsx      # Auth-protected routes
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── Login.jsx
│   │   │   │   │   └── Register.jsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth.api.js
│   │   │   │   │   └── asyncThunk.api.js
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useAuth.js
│   │   │   │   └── state/
│   │   │   │       └── authSlice.js
│   │   │   └── monitoring/
│   │   │       ├── pages/
│   │   │       ├── services/
│   │   │       ├── hooks/
│   │   │       └── state/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── AddMonitorPage.jsx
│   │   ├── lib/
│   │   │   └── api/
│   │   │       ├── axios.js            # Axios config
│   │   │       └── apiRequest.js       # API wrapper
│   │   ├── config/
│   │   │   └── env.js                  # Environment config
│   │   └── styles/
│   │       ├── auth.css
│   │       ├── dashboard.css
│   │       └── add-monitor.css
│   ├── .env.local                       # Environment variables
│   └── package.json
│
├── Backend/
│   ├── src/
│   │   ├── app.js                      # Express app setup
│   │   ├── server.js                   # Server entry point
│   │   ├── config/
│   │   │   ├── config.js              # Configuration
│   │   │   ├── database.js            # MongoDB connection
│   │   │   └── logger.js              # Logging setup
│   │   ├── controllers/
│   │   │   ├── user.controller.js
│   │   │   ├── monitor.controller.js
│   │   │   ├── incident.controller.js
│   │   │   └── logs.controller.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── monitor.model.js
│   │   │   ├── incidents.model.js
│   │   │   └── logs.model.js
│   │   ├── routes/
│   │   │   ├── user.routes.js
│   │   │   ├── monitor.route.js
│   │   │   ├── incident.route.js
│   │   │   └── health.route.js
│   │   ├── services/
│   │   │   ├── user.service.js
│   │   │   ├── monitor.service.js
│   │   │   └── incident.service.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── logger.middleware.js
│   │   ├── jobs/
│   │   │   └── monitorCron.js         # Background monitoring
│   │   ├── validators/
│   │   │   └── monitor.validator.js
│   │   └── utils/
│   │       ├── ApiError.js
│   │       ├── ApiResponse.js
│   │       └── asyncHandler.js
│   ├── .env                            # Environment variables
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 📡 API Documentation

### **Authentication Routes**

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullname": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secure_password"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  },
  "message": "User registered successfully"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secure_password"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  },
  "message": "User logged in successfully"
}
```

### **Monitor Routes** (Protected)

#### Create Monitor
```http
POST /api/monitor
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "My API Monitor",
  "description": "Monitor my production API",
  "type": "http",
  "url": "https://api.example.com/health",
  "interval": 60,
  "timeout": 5000
}

Response: 201 Created
```

#### Get All Monitors
```http
GET /api/monitor
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "My API Monitor",
      "status": "UP",
      "lastChecked": "2024-05-04T10:30:00Z",
      ...
    }
  ]
}
```

#### Delete Monitor
```http
DELETE /api/monitor/{monitorId}
Authorization: Bearer {token}

Response: 200 OK
```

### **Health Route**
```http
GET /api/health

Response: 200 OK
{
  "success": true,
  "message": "Server is running successfully"
}
```

---

## 💡 Usage Guide

### **1. Create an Account**
- Navigate to `http://localhost:5173/register`
- Enter your details (Full name, Username, Email, Password)
- Click "Create Account" → Auto-redirect to Dashboard

### **2. Login**
- Go to `http://localhost:5173/login`
- Enter your credentials
- Click "Login" → Auto-redirect to Dashboard

### **3. Create a Monitor**
- Click "Add Monitor" on the dashboard
- Fill in monitor details:
  - **Title**: Name of the service
  - **Type**: Protocol (HTTP, Ping, TCP, DNS)
  - **URL**: Endpoint to monitor
  - **Interval**: Check frequency (seconds)
  - **Timeout**: Request timeout (ms)
- Click "Create Monitor"

### **4. Monitor Dashboard**
- View all monitors with real-time status
- See last checked timestamp
- Delete monitors you no longer need
- Automatic periodic status checks

### **5. View Incidents**
- Check incident history
- Review detailed logs
- Track uptime/downtime patterns

---

## 🚀 Deployment

### **Live Deployment**
The application is deployed and running on **Railway** at:  
**➜ [https://monitoring-production-19a5.up.railway.app/](https://monitoring-production-19a5.up.railway.app/)**

### **Deployment Stack**
- **Frontend**: Deployed on Railway (Vite + React)
- **Backend**: Deployed on Railway (Node.js + Express)
- **Database**: MongoDB Atlas (Cloud)
- **Platform**: Railway.app

### **Deploy Your Own**

#### **Using Railway**
1. Fork this repository
2. Connect your GitHub account to Railway
3. Create new Railway projects for Frontend and Backend
4. Configure environment variables:
   - Backend: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`, `FRONTEND_URL`
   - Frontend: `VITE_BACKEND_URL`, `VITE_LOGIN_API`, etc.
5. Deploy from Railway dashboard

#### **Using Docker Compose (Local)**
```bash
docker-compose up --build
```

#### **Using Vercel (Frontend Only)**
```bash
# Frontend directory
vercel deploy
```

### **Environment Variables**

**Backend (.env)**
```env
PORT=8000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devops-monitor
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=7d
FRONTEND_URL=https://monitoring-production-19a5.up.railway.app
```

**Frontend (.env.production)**
```env
VITE_BACKEND_URL=https://your-backend-url.railway.app
VITE_LOGIN_API=/api/auth/login
VITE_REGISTER_API=/api/auth/register
```

---

## 🎯 Future Enhancements

### **Phase 2 Features**
- [ ] Email alerts for downtime incidents
- [ ] Slack/Discord webhook notifications
- [ ] SMS alerts for critical services
- [ ] Performance metrics dashboard
- [ ] SLA tracking and reporting
- [ ] Team collaboration features
- [ ] Advanced analytics and charts
- [ ] Custom dashboards
- [ ] API rate limiting

### **Phase 3 Features**
- [ ] Mobile app (iOS/Android)
- [ ] Machine learning for anomaly detection
- [ ] Integration with AWS CloudWatch
- [ ] Terraform automation
- [ ] Kubernetes support
- [ ] Multi-region monitoring
- [ ] Geographic heat maps

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -m 'Add improvement'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the ISC License.

---

## 👨‍💻 Developer

**Jatin Vats**
- GitHub: [@jatinvats123](https://github.com/jatinvats123)
- Repository: [DEVOPS-HACKATHON](https://github.com/jatinvats123/DEVOPS-HACKATHON)
- Live App: [https://monitoring-production-19a5.up.railway.app/](https://monitoring-production-19a5.up.railway.app/)

---

## 🙏 Acknowledgments

- Built for **DevOps Hackathon**
- Inspired by modern monitoring solutions like Uptime Robot, UptimeKuma
- Thanks to the open-source community
- Special thanks to Railway for hosting

---

## 📞 Support & Issues

For support and questions:
- 🐛 [Open an issue on GitHub](https://github.com/jatinvats123/DEVOPS-HACKATHON/issues)
- 💬 [Discussions](https://github.com/jatinvats123/DEVOPS-HACKATHON/discussions)
- 📧 Contact via GitHub Issues

---

## 🔐 Security Notice

- Never commit `.env` files to version control
- Always use strong, unique passwords
- Keep all dependencies updated regularly
- Review security advisories from npm audit
- Rotate JWT secrets in production
- Use HTTPS in production environments

---

## 📊 Project Stats

- **Language**: JavaScript (Frontend + Backend)
- **Frontend Repo**: React + Vite
- **Backend Repo**: Node.js + Express
- **Database**: MongoDB
- **Hosting**: Railway
- **Status**: ✅ Active & Maintained
- **License**: ISC

---

**Last Updated**: May 16, 2026  
**Status**: 🚀 Production Ready  
**Version**: 1.0.0  
**Deployed**: [monitoring-production-19a5.up.railway.app](https://monitoring-production-19a5.up.railway.app/)