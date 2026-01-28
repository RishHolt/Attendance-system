<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private function checkAdmin(): void
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }
    }

    public function index(): Response
    {
        $this->checkAdmin();

        $today = Carbon::today();
        $thisWeek = Carbon::now()->startOfWeek();
        $thisMonth = Carbon::now()->startOfMonth();

        // Total users
        $totalUsers = User::count();
        $totalAdmins = User::where('role', 'admin')->count();
        $totalRegularUsers = User::where('role', 'user')->count();

        // Today's stats
        $todayAttendances = Attendance::whereDate('date', $today)->count();
        $todayPresent = Attendance::whereDate('date', $today)->where('status', 'Present')->count();
        $todayLate = Attendance::whereDate('date', $today)->where('status', 'Late')->count();
        $todayCheckedIn = Attendance::whereDate('date', $today)->whereNotNull('check_in')->count();
        $todayCheckedOut = Attendance::whereDate('date', $today)->whereNotNull('check_out')->count();

        // This week's stats
        $weekAttendances = Attendance::where('date', '>=', $thisWeek)->count();
        $weekPresent = Attendance::where('date', '>=', $thisWeek)->where('status', 'Present')->count();
        $weekLate = Attendance::where('date', '>=', $thisWeek)->where('status', 'Late')->count();

        // This month's stats
        $monthAttendances = Attendance::where('date', '>=', $thisMonth)->count();
        $monthPresent = Attendance::where('date', '>=', $thisMonth)->where('status', 'Present')->count();
        $monthLate = Attendance::where('date', '>=', $thisMonth)->where('status', 'Late')->count();

        // Recent attendances (last 10)
        $recentAttendances = Attendance::with('user:id,name,email')
            ->orderBy('date', 'desc')
            ->orderBy('check_in', 'desc')
            ->limit(10)
            ->get();

        // Users with most attendances this month
        $topUsers = User::withCount(['attendances' => function ($query) use ($thisMonth) {
            $query->where('date', '>=', $thisMonth);
        }])
            ->orderBy('attendances_count', 'desc')
            ->limit(5)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users' => [
                    'total' => $totalUsers,
                    'admins' => $totalAdmins,
                    'regular' => $totalRegularUsers,
                ],
                'today' => [
                    'total' => $todayAttendances,
                    'present' => $todayPresent,
                    'late' => $todayLate,
                    'checked_in' => $todayCheckedIn,
                    'checked_out' => $todayCheckedOut,
                ],
                'week' => [
                    'total' => $weekAttendances,
                    'present' => $weekPresent,
                    'late' => $weekLate,
                ],
                'month' => [
                    'total' => $monthAttendances,
                    'present' => $monthPresent,
                    'late' => $monthLate,
                ],
            ],
            'recentAttendances' => $recentAttendances,
            'topUsers' => $topUsers,
        ]);
    }
}
