<?php

use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ScheduleController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        if (auth()->user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

Route::middleware('auth')->group(function () {
    // User routes (only for non-admin users)
    Route::get('/dashboard', function () {
        if (auth()->user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/my-qr', function () {
        if (auth()->user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }
        return Inertia::render('MyQR');
    })->name('my-qr');

    Route::get('/my-schedule', function () {
        if (auth()->user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }
        return Inertia::render('MySchedule');
    })->name('my-schedule');

    Route::get('/my-attendance', function () {
        if (auth()->user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }
        return Inertia::render('MyAttendance');
    })->name('my-attendance');

    // API routes
    Route::prefix('api')->group(function () {
        Route::get('/user', function () {
            return response()->json(auth()->user());
        })->name('api.user');

        Route::get('/schedules', [ScheduleController::class, 'index'])->name('api.schedules.index');
        Route::post('/schedules', [ScheduleController::class, 'store'])->name('api.schedules.store');
        Route::get('/attendances', [AttendanceController::class, 'index'])->name('api.attendances.index');
    });

    // Admin routes (protected by middleware in controllers)
    Route::prefix('admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
        Route::get('/attendances', [AdminAttendanceController::class, 'index'])->name('admin.attendances.index');
        Route::get('/users', [UserController::class, 'index'])->name('admin.users.index');
    });

    Route::get('/scanner', function () {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }

        return Inertia::render('Scanner');
    })->name('scanner');

    Route::prefix('api/admin/users')->group(function () {
        Route::post('/', [UserController::class, 'store'])->name('api.admin.users.store');
        Route::get('/{user}', [UserController::class, 'show'])->name('api.admin.users.show');
        Route::put('/{user}', [UserController::class, 'update'])->name('api.admin.users.update');
        Route::delete('/{user}', [UserController::class, 'destroy'])->name('api.admin.users.destroy');
        Route::post('/{user}/regenerate-qr', [UserController::class, 'regenerateQrToken'])->name('api.admin.users.regenerate-qr');
        Route::get('/{user}/schedules', [UserController::class, 'getSchedules'])->name('api.admin.users.schedules');
        Route::put('/{user}/schedules', [UserController::class, 'updateSchedules'])->name('api.admin.users.update-schedules');
    });

    Route::post('/api/attendance/scan', [AttendanceController::class, 'scan'])->name('api.attendance.scan');
});
