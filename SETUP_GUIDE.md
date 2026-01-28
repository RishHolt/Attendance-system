# QR Attendance System - Setup Guide

## ✅ Completed Setup

The QR Attendance System has been fully implemented with all required features:

### Backend Features
- ✅ User authentication (Login/Register)
- ✅ QR token generation (auto-generated for new users)
- ✅ Schedule management (day of week, start/end times)
- ✅ Attendance tracking (check-in/check-out with late detection)
- ✅ Admin scanner functionality
- ✅ SQLite database configured

### Frontend Features
- ✅ React + Inertia.js pages
- ✅ QR Code scanner (html5-qrcode)
- ✅ QR Code display (qrcode.react)
- ✅ SweetAlert2 notifications
- ✅ Offline support with Dexie.js
- ✅ Schedule management form
- ✅ Attendance history view

## 🚀 Quick Start

### 1. Run Migrations (Already Done)
```bash
php artisan migrate
```

### 2. Create Admin User (Already Done)
```bash
php artisan db:seed --class=AdminUserSeeder
```

**Admin Credentials:**
- Email: `admin@example.com`
- Password: `password`

### 3. Generate QR Tokens for Existing Users
If you have existing users without QR tokens, run:
```bash
php artisan qr:generate-tokens
```

### 4. Build Frontend Assets
```bash
npm run build
# OR for development:
npm run dev
```

### 5. Start the Server
```bash
php artisan serve
```

## 📋 Next Steps

### Step 1: Test Authentication
1. Visit `http://localhost:8000/register`
2. Create a test user account
3. Login at `http://localhost:8000/login`

### Step 2: Set Up User Schedule
1. Login as a regular user
2. Go to "My Schedule" page
3. Select work days (Monday, Wednesday, etc.)
4. Set start and end times for each day
5. Save the schedule

### Step 3: View QR Code
1. Go to "My QR Code" page
2. Your unique QR code will be displayed
3. This QR code is used for attendance scanning

### Step 4: Test Admin Scanner
1. Login as admin (`admin@example.com` / `password`)
2. Go to "QR Scanner" page
3. Allow camera permissions when prompted
4. Click "Start Scanning"
5. Scan a user's QR code to test check-in/check-out

### Step 5: Test Offline Functionality
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Try scanning a QR code
4. You should see "Offline Mode" notification
5. Disable offline mode
6. Scans should auto-sync and show success notification

## 🔧 Available Commands

### Generate QR Tokens
```bash
php artisan qr:generate-tokens
```
Generates QR tokens for all users that don't have one.

### Create Admin User
```bash
php artisan db:seed --class=AdminUserSeeder
```
Creates an admin user with email `admin@example.com` and password `password`.

## 📱 User Roles

- **admin**: Can access the QR scanner to scan attendance
- **user**: Can view their QR code, manage schedule, and view attendance

## 🎯 Key Features

### Attendance Logic
- Checks if user has a schedule for the current day
- Marks as "Late" if check-in is >15 minutes after scheduled start time
- Toggles between check-in and check-out on each scan
- Prevents duplicate check-outs

### Offline Support
- Scans are stored in IndexedDB when offline
- Auto-syncs when connection is restored
- Shows notification when sync completes

### Schedule Management
- Users can select multiple work days
- Set individual start/end times for each day
- Schedule is validated before allowing attendance

## 🐛 Troubleshooting

### Camera Not Working
- Ensure you're using HTTPS or localhost
- Check browser permissions for camera access
- Try a different browser (Chrome/Firefox recommended)

### QR Code Not Displaying
- Check if user has a `qr_token` in database
- Run `php artisan qr:generate-tokens` to generate missing tokens

### Offline Sync Not Working
- Check browser console for errors
- Ensure Dexie.js is properly loaded
- Verify network connection is restored

## 📝 Notes

- All new users automatically get a QR token on creation
- Admin users can scan any user's QR code
- Regular users can only view their own data
- Attendance records are unique per user per date
