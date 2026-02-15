<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Holiday;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private function checkAdmin(): void
    {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }
    }

    public function index(): Response
    {
        $this->checkAdmin();

        // Automatically check and mark absent users for today when dashboard loads
        $this->markAbsentUsers(Carbon::today());

        $today = Carbon::today();
        $thisWeek = Carbon::now()->startOfWeek(Carbon::SUNDAY);
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
            /** @var \Illuminate\Database\Eloquent\Collection<int, User> $users */
            $users = User::where('role', '!=', 'admin')->get();

            // First, backfill past dates for each user
            $this->backfillPastDates($users, $date);

            // Then check the specified date (today)
            $dayOfWeek = $date->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            foreach ($users as $user) {
                $this->checkAndMarkAbsentForDate($user, $date, $dayOfWeek);
            }
        } catch (\Exception $e) {
            // Silently fail - don't interrupt dashboard loading
            // Log error if needed: \Log::error('Failed to mark absent users', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Backfill past dates for users from their last attendance date
     */
    private function backfillPastDates($users, Carbon $currentDate): void
    {
        $maxLookbackDays = config('attendance.max_lookback_days', 30);
        $today = Carbon::today()->startOfDay();
        $backfillStart = $today->copy()->subDays($maxLookbackDays);

        foreach ($users as $user) {
            // Get user's last attendance date
            $lastAttendance = Attendance::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->first();

            if ($lastAttendance) {
                $lastDate = Carbon::parse($lastAttendance->date)->startOfDay();
                // Start from day after last attendance, but not before max lookback
                $startDate = max($lastDate->copy()->addDay(), $backfillStart);
            } else {
                // No previous attendance, start from max lookback days ago
                $startDate = $backfillStart;
            }

            // End date is yesterday (don't backfill today, it's handled separately)
            $endDate = $today->copy()->subDay();

            if ($startDate->greaterThan($endDate)) {
                // No dates to backfill
                continue;
            }

            // Iterate through each date
            $currentCheckDate = $startDate->copy();
            while ($currentCheckDate->lte($endDate)) {
                $dayOfWeek = $currentCheckDate->dayOfWeek;
                $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

                if ($schedule) {
                    // Skip if this date is a holiday
                    if ($this->isHoliday($currentCheckDate)) {
                        continue;
                    }

                    // Check if attendance record exists for this date
                    $attendance = Attendance::where('user_id', $user->id)
                        ->whereDate('date', $currentCheckDate->format('Y-m-d'))
                        ->first();

                    if (! $attendance) {
                        // Calculate scheduled end time for this date
                        $scheduledEndTime = $this->getScheduledEndTime($currentCheckDate, $schedule);

                        // Only mark as absent if the scheduled end time has passed
                        if (Carbon::now()->greaterThan($scheduledEndTime)) {
                            Attendance::create([
                                'user_id' => $user->id,
                                'date' => $currentCheckDate->format('Y-m-d'),
                                'time_in' => null,
                                'time_out' => null,
                                'status' => 'Absent',
                            ]);
                        }
                    }
                }

                $currentCheckDate->addDay();
            }
        }
    }

    /**
     * Check and mark absent for a specific date
     */
    private function checkAndMarkAbsentForDate(User $user, Carbon $date, int $dayOfWeek): void
    {
        // Skip if this date is a holiday
        if ($this->isHoliday($date)) {
            return;
        }

        // Check if user has a schedule for this day
        $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

        if (! $schedule) {
            // No schedule for this day, skip
            return;
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
            // No attendance record exists - check if scheduled end time has passed before marking absent
            $scheduledEndTime = $this->getScheduledEndTime($date, $schedule);

            // Only mark as absent if scheduled end time has passed
            if (Carbon::now()->greaterThan($scheduledEndTime)) {
                Attendance::create([
                    'user_id' => $user->id,
                    'date' => $date->format('Y-m-d'),
                    'time_in' => null,
                    'time_out' => null,
                    'status' => 'Absent',
                ]);
            }
        }
    }

    /**
     * Get scheduled end time for a date, handling midnight crossover
     */
    private function getScheduledEndTime(Carbon $date, $schedule): Carbon
    {
        $endTime = $date->copy()->setTimeFromTimeString($schedule->end_time);
        $startTime = $date->copy()->setTimeFromTimeString($schedule->start_time);

        // If end time is before start time, it means it's the next day (overnight shift)
        if ($endTime->lessThan($startTime)) {
            $endTime->addDay();
        }

        return $endTime;
    }

    /**
     * Check if a date is a holiday
     */
    private function isHoliday(Carbon $date): bool
    {
        $dateString = $date->format('Y-m-d');
        $monthDay = $date->format('m-d'); // For recurring holidays

        // Check for exact date match
        $exactHoliday = Holiday::whereDate('date', $dateString)->first();
        if ($exactHoliday) {
            return true;
        }

        // Check for recurring holidays (same month-day every year)
        $recurringHoliday = Holiday::where('is_recurring', true)
            ->whereRaw('DATE_FORMAT(date, "%m-%d") = ?', [$monthDay])
            ->first();
        if ($recurringHoliday) {
            return true;
        }

        return false;
    }
}
