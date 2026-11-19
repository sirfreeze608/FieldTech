# Field Tech - Field Service Management System

A professional, real-time field service management application built with React, Vite, Tailwind CSS, and Firebase. Featuring a responsive dashboard for dispatchers and a mobile-first experience for technicians.

## 🚀 Deployment & Installation

### 1. Web Version (Desktop & Mobile Browser)

The web version is optimized for use on both desktop (Dispatchers) and mobile browsers (Technicians).

#### Prerequisites
- Node.js (v18+)
- Firebase Project

#### Setup
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd field-tech
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` for AI features and ensure `firebase-applet-config.json` contains your Firebase settings.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```
   The static files will be generated in the `dist/` directory.

---

### 2. Android Version (Native App)

The Android app is built using **Capacitor** to wrap the web application in a native container, allowing for better performance and native features like camera integration.

#### Prerequisites
- Android Studio
- Java SDK 17+
- Capacitor CLI (`npm install -g @capacitor/cli`)

#### Build Instructions
1. **Build the web project**:
   ```bash
   npm run build
   ```

2. **Sync with Android Project**:
   ```bash
   npx cap sync
   ```

3. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

4. **Build & Run**:
   - In Android Studio, select your device or emulator.
   - Click the **Run** button (green arrow).
   - To build a signed APK/Bundle, go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

#### Native Features Used
- **Camera**: Used for attaching field photos to work logs.
- **Geolocation**: Used for field mapping and technician tracking.

---

## 🛠 Features

- **Dispatcher Dashboard**: Full-width desktop layout for managing tickets, tracking technicians on maps, and organizational oversight.
- **Technician Mobile View**: Optimized for one-handed use, quick ticket updates, and photo uploads.
- **Real-time Synchronization**: Powered by Firestore snapshots for instant updates across all devices.
- **AI-Powered Analysis**: (Upcoming) Intelligent ticket categorization and suggestion system using Gemini.
- **Floor Plan Viewer**: Upload and overlay site floor plans directly onto geographic maps.

## 📱 Role-Based Access
- **Manager**: full organization control, invite codes, and settings.
- **Dispatcher**: Ticket assignment, resource tracking, and communication.
- **Technician**: Field work logging, status updates, and documentation.

## 🔒 Security
The app uses Firebase Auth for secure login and hardened Firestore Security Rules to ensure data isolation between different organizations (Multi-tenancy).
