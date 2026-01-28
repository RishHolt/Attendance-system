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

        // Automatically check and mark absent users for today when dashboard loads
        $this->markAbsentUsers(Carbon::today());

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
        $todayAbsent = Attendance::whereDate('date', $today)->where('status', 'Absent')->count();
        $todayCheckedIn = Attendance::whereDate('date', $today)->whereNotNull('time_in')->count();
        $todayCheckedOut = Attendance::whereDate('date', $today)->whereNotNull('time_out')->count();

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
            ->orderBy('time_in', 'desc')
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
                    'absent' => $todayAbsent,
                    'timed_in' => $todayCheckedIn,
                    'timed_out' => $todayCheckedOut,
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

    /**
     * Mark users as absent if they have a schedule but didn't scan/check in
     */
    private function markAbsentUsers(Carbon $date): void
    {
        try {
            $users = User::where('role', '!=', 'admin')->get();
            $dayOfWeek = $date->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            foreach ($users as $user) {
                // Check if user has a schedule for this day
                $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

                if (! $schedule) {
                    // No schedule for this day, skip
                    continue;
                }

                // Check if attendance record exists
                $attendance = Attendance::where('user_id', $user->id)
                    ->whereDate('date', $date->format('Y-m-d'))
                    ->first();

                if ($attendance) {
                    // Attendance record exists
                    if ($attendance->time_out === null) {
                        if ($attendance->time_in === null) {
                            // No time_in and no time_out - mark as absent
                            $attendance->status = 'Absent';
                            $attendance->save();
                        } else {
                            // They have time_in but forgot to time out - mark as "No Time Out"
                            $attendance->status = 'No Time Out';

                            // Auto-extend time_out to 1 hour after scheduled end time
                            $endTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->end_time);
                            $extendedTimeOut = $endTime->copy()->addHour(); // 1 hour after scheduled end time

                            // Only set if current time is past the extended time
                            if (Carbon::now()->greaterThan($extendedTimeOut)) {
                                $attendance->time_out = $extendedTimeOut;
                            }

                            $attendance->save();
                        }
                    }
                    // If they have time_out, they completed their work day - skip
                } else {
                    // No attendance record exists - create absent record
                    Attendance::create([
                        'user_id' => $user->id,
                        'date' => $date->format('Y-m-d'),
                        'time_in' => null,
                        'time_out' => null,
                        'status' => 'Absent',
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Silently fail - don't interrupt dashboard loading
            // Log error if needed: \Log::error('Failed to mark absent users', ['error' => $e->getMessage()]);
        }
    }
}
