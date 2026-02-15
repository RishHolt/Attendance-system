# Desktop Application Setup

## Current Status

✅ **NativePHP is now installed and configured for Laravel 12!**

## Solution: Electron Wrapper (Ready to Use)

An Electron wrapper has been set up that works with Laravel 12. This wraps your Laravel application in a desktop window.

### Setup Instructions

1. **Install Electron dependencies:**
   ```bash
   cd electron
   npm install
   ```

2. **Run the desktop application:**
   ```bash
   npm start
   ```

3. **Build for production:**
   ```bash
   # Windows
   npm run build:win
   
   # macOS
   npm run build:mac
   
   # Linux
   npm run build:linux
   ```

### How It Works

- Electron starts a local Laravel server on `127.0.0.1:8000`
- The Electron window loads your Laravel application
- When the app closes, the PHP server is automatically stopped

### Requirements

- Node.js and npm installed
- PHP and Composer installed
- Laravel application dependencies installed (`composer install`)

## Alternative Options

### Option 1: Wait for NativePHP Laravel 12 Support
Monitor the [NativePHP repository](https://github.com/NativePHP/electron) for Laravel 12 support updates.

### Option 2: Use Tauri (Alternative)
Tauri is a modern alternative to Electron that supports Laravel applications.

## NativePHP Setup (Completed)

NativePHP has been successfully installed and configured:

1. ✅ **NativePHP installed:** `composer require nativephp/electron`
2. ✅ **Configuration published:** `php artisan native:install`
3. ✅ **Service provider registered:** `app/Providers/NativeAppServiceProvider.php`

### Building the Desktop Application

To build the desktop application:

```bash
php artisan native:build
```

This will create a distributable desktop application in the `dist` directory.

### Running in Development

You can run the application in development mode:

```bash
composer native:dev
```

Or use the native command:

```bash
php artisan native:serve
```

## Configuration Files Prepared

The following files have been prepared for when NativePHP supports Laravel 12:
- `config/nativephp.php` - NativePHP configuration
- `nativephp.json` - NativePHP build configuration


Available commands
php artisan native:build — Build the desktop application
php artisan native:build win — Build for Windows
php artisan native:build mac — Build for macOS
php artisan native:build linux — Build for Linux
composer native:dev — Run in development mode