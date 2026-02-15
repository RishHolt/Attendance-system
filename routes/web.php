<?php

use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\HolidayController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ScheduleController;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        if (Auth::user()?->role === 'admin') {
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
        if (Auth::user()?->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/my-qr', function () {
        if (Auth::user()?->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('MyQR');
    })->name('my-qr');

    Route::get('/my-schedule', function () {
        if (Auth::user()?->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('MySchedule');
    })->name('my-schedule');

    Route::get('/my-attendance', function () {
        if (Auth::user()?->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('MyAttendance');
    })->name('my-attendance');

    Route::get('/calendar', function () {
        $users = [];
        if (Auth::user()?->role === 'admin') {
            $users = \App\Models\User::where('role', '!=', 'admin')
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get();
        }

        // Fetch all holidays (including recurring ones)
        $holidays = \App\Models\Holiday::orderBy('date', 'asc')->get();

        return Inertia::render('Calendar', [
            'users' => $users,
            'holidays' => $holidays,
        ]);
    })->name('calendar');

    // API routes
    Route::prefix('api')->group(function () {
        Route::get('/user', function () {
            return response()->json(Auth::user());
        })->name('api.user');

        Route::get('/schedules', [ScheduleController::class, 'index'])->name('api.schedules.index');
        Route::post('/schedules', [ScheduleController::class, 'store'])->name('api.schedules.store');
        Route::get('/attendances', [AttendanceController::class, 'index'])->name('api.attendances.index');
        Route::get('/attendances/export/pdf', [AttendanceController::class, 'exportPdf'])->name('api.attendances.export-pdf');
    });

    // Admin routes (protected by middleware in controllers)
    Route::prefix('admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
        Route::get('/attendances', [AdminAttendanceController::class, 'index'])->name('admin.attendances.index');
        Route::get('/users', [UserController::class, 'index'])->name('admin.users.index');
        Route::get('/holidays', [\App\Http\Controllers\Admin\HolidayController::class, 'index'])->name('admin.holidays.index');
    });

    Route::get('/scanner', function () {
        if (Auth::user()?->role !== 'admin') {
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

    Route::prefix('api/admin/attendances')->group(function () {
        Route::post('/', [AdminAttendanceController::class, 'store'])->name('api.admin.attendances.store');
        Route::put('/{attendance}', [AdminAttendanceController::class, 'update'])->name('api.admin.attendances.update');
        Route::put('/{attendance}/notes', [AdminAttendanceController::class, 'updateNotes'])->name('api.admin.attendances.update-notes');
        Route::get('/export/pdf', [AdminAttendanceController::class, 'exportPdf'])->name('api.admin.attendances.export-pdf');
        Route::get('/view/pdf', [AdminAttendanceController::class, 'viewPdf'])->name('api.admin.attendances.view-pdf');
        Route::get('/export/csv', [AdminAttendanceController::class, 'bulkExport'])->name('api.admin.attendances.export-csv');
        Route::post('/import', [AdminAttendanceController::class, 'bulkImport'])->name('api.admin.attendances.import');
    });

    Route::prefix('api/admin/holidays')->group(function () {
        Route::post('/', [HolidayController::class, 'store'])->name('api.admin.holidays.store');
        Route::put('/{holiday}', [HolidayController::class, 'update'])->name('api.admin.holidays.update');
        Route::delete('/{holiday}', [HolidayController::class, 'destroy'])->name('api.admin.holidays.destroy');
    });

    Route::prefix('api/admin/saved-filters')->group(function () {
        Route::post('/', [AdminAttendanceController::class, 'saveFilter'])->name('api.admin.saved-filters.store');
        Route::delete('/{savedFilter}', [AdminAttendanceController::class, 'deleteFilter'])->name('api.admin.saved-filters.destroy');
    });

    Route::post('/api/attendance/scan', [AttendanceController::class, 'scan'])->name('api.attendance.scan');
});
