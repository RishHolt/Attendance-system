<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    private function checkAdmin(): void
    {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }
    }

    public function index(Request $request): Response
    {
        $this->checkAdmin();

        // Automatically check and mark absent users for today when page loads
        $this->markAbsentUsers(\Carbon\Carbon::today());

        $query = Attendance::with(['user:id,name,email', 'user.schedules']);

        // Filter by date range
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        // Filter by week
        if ($request->has('week') && $request->week) {
            $week = Carbon::parse($request->week);
            $startOfWeek = $week->copy()->startOfWeek();
            $endOfWeek = $week->copy()->endOfWeek();
            $query->whereBetween('date', [$startOfWeek, $endOfWeek]);
        }

        // Filter by month
        if ($request->has('month') && $request->month) {
            $month = Carbon::parse($request->month);
            $startOfMonth = $month->copy()->startOfMonth();
            $endOfMonth = $month->copy()->endOfMonth();
            $query->whereBetween('date', [$startOfMonth, $endOfMonth]);
        }

        // Filter by year
        if ($request->has('year') && $request->year) {
            $year = (int) $request->year;
            $query->whereYear('date', $year);
        }

        // Filter by user
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Search by user name or email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $attendances = $query->orderBy('date', 'desc')
            ->orderBy('time_in', 'desc')
            ->paginate(10);

        // Add total_time calculation
        $attendances->getCollection()->transform(function ($attendance) {
            $totalTime = null;
            $isOvertime = false;
            if ($attendance->time_in && $attendance->time_out) {
                $timeIn = Carbon::parse($attendance->time_in);
                $timeOut = Carbon::parse($attendance->time_out);

                // Handle case where time out is on the next day (e.g., time in 17:14, time out 02:24)
                // If time out time is earlier than time in time on the same date, it's the next day
                $timeOutOriginal = $timeOut->copy();
                if ($timeOut->format('Y-m-d') === $timeIn->format('Y-m-d') && $timeOut->format('H:i') < $timeIn->format('H:i')) {
                    // Same date but time out time is earlier, so it's next day
                    $timeOut->addDay();
                }

                // Step 1: Calculate total time between time in and time out (in minutes)
                // diffInMinutes calculates from the calling object to the parameter
                // We want time from timeIn to timeOut, so call it on timeIn
                $totalMinutes = $timeIn->diffInMinutes($timeOut);

                // Step 2: Get break time from schedule for this day
                // If no schedule for this specific day, use any schedule as fallback
                $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeek;
                $schedule = $attendance->user->schedules()->where('day_of_week', $dayOfWeek)->first();
                if (! $schedule) {
                    $schedule = $attendance->user->schedules()->first();
                }

                // Step 3: Subtract break time if user actually reached/took the break
                $breakMinutes = 0;
                if ($schedule && $schedule->break_time && $schedule->break_time_hour !== null && $schedule->break_time_hour > 0 && $totalMinutes > 0) {
                    // Parse break time start from schedule (format: HH:MM:SS)
                    $breakStartDateTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->break_time);

                    // Check if user reached break time
                    // If time out is on next day OR time out time is after break time on same day, they took the break
                    $reachedBreak = false;
                    if ($timeOut->format('Y-m-d') !== $timeIn->format('Y-m-d')) {
                        // Time out is on next day, so they definitely reached break time
                        $reachedBreak = true;
                    } elseif ($timeOutOriginal->greaterThanOrEqualTo($breakStartDateTime)) {
                        // Time out is on same day but after break time
                        $reachedBreak = true;
                    }

                    if ($reachedBreak) {
                        $calculatedBreakMinutes = (int) ($schedule->break_time_hour * 60);
                        // Ensure break time doesn't exceed total time
                        $breakMinutes = min($calculatedBreakMinutes, $totalMinutes);
                    }
                }

                // Step 4: Calculate worked minutes (total time minus break time)
                $workedMinutes = $totalMinutes - $breakMinutes;

                // Ensure worked minutes is not negative
                $workedMinutes = max(0, $workedMinutes);
                $workedHours = round($workedMinutes / 60, 1);

                // Calculate scheduled hours if schedule exists
                if ($schedule && $schedule->start_time && $schedule->end_time) {
                    // Parse times and create proper datetime objects for calculation
                    $startTimeStr = $schedule->start_time;
                    $endTimeStr = $schedule->end_time;

                    // Create datetime objects using the attendance date
                    $scheduleStart = Carbon::parse($attendance->date)->setTimeFromTimeString($startTimeStr);
                    $scheduleEnd = Carbon::parse($attendance->date)->setTimeFromTimeString($endTimeStr);

                    // If end time is before start time, it means it's the next day
                    if ($scheduleEnd->lessThan($scheduleStart)) {
                        $scheduleEnd->addDay();
                    }

                    $scheduledMinutes = $scheduleStart->diffInMinutes($scheduleEnd);

                    // Subtract break time from scheduled hours
                    if ($schedule->break_time_hour !== null && $schedule->break_time_hour > 0) {
                        $scheduledBreakMinutes = (int) ($schedule->break_time_hour * 60);
                        $scheduledMinutes -= $scheduledBreakMinutes;
                    }

                    $scheduledHours = round($scheduledMinutes / 60, 1);

                    // Cap total time display at scheduled hours, show overtime only if worked exceeds scheduled
                    if ($workedHours > $scheduledHours) {
                        // Worked more than scheduled: show scheduled hours + overtime
                        $overtimeHours = round($workedHours - $scheduledHours, 1);
                        $totalTime = $scheduledHours.' Hours (Overtime: +'.$overtimeHours.' Hours)';
                        $isOvertime = true;
                    } else {
                        // Worked less than or equal to scheduled: show actual worked hours (capped at scheduled)
                        $totalTime = round(min($workedHours, $scheduledHours), 1).' Hours';
                    }
                } else {
                    // No schedule, just show worked hours
                    $totalTime = $workedHours.' Hours';
                }
            }
            $attendance->total_time = $totalTime;
            $attendance->is_overtime = $isOvertime;

            return $attendance;
        });

        // Get all users for filter dropdown
        $users = \App\Models\User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Attendances', [
            'attendances' => $attendances,
            'users' => $users,
            'filters' => $request->only(['start_date', 'end_date', 'user_id', 'status', 'search', 'week', 'month', 'year']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->checkAdmin();

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'date' => ['required', 'date'],
            'time_in' => ['nullable', 'string'],
            'time_out' => ['nullable', 'string'],
        ]);

        // Check if attendance already exists for this user and date
        $date = Carbon::parse($validated['date']);
        $existingAttendance = Attendance::where('user_id', $validated['user_id'])
            ->where('date', $date->format('Y-m-d'))
            ->first();

        if ($existingAttendance) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance record already exists for this user and date. Please edit the existing record instead.',
            ], 400);
        }

        // Set time_in
        $timeIn = null;
        if ($validated['time_in'] && trim($validated['time_in']) !== '') {
            $dateTime = Carbon::parse($validated['time_in']);
            $timeIn = Carbon::parse($date->format('Y-m-d'))->setTime($dateTime->hour, $dateTime->minute, 0)->utc();
        }

        // Set time_out
        $timeOut = null;
        if ($validated['time_out'] && trim($validated['time_out']) !== '') {
            $dateTime = Carbon::parse($validated['time_out']);
            $timeOut = Carbon::parse($date->format('Y-m-d'))->setTime($dateTime->hour, $dateTime->minute, 0)->utc();

            // If time_out is before time_in on the same day, it's next day
            if ($timeIn && $timeOut->lessThan($timeIn)) {
                $timeOut->addDay();
            }
        }

        $attendance = Attendance::create([
            'user_id' => $validated['user_id'],
            'date' => $date->format('Y-m-d'),
            'time_in' => $timeIn,
            'time_out' => $timeOut,
            'status' => 'Present',
        ]);

        // Calculate status based on schedule
        if ($attendance->time_in && $attendance->date) {
            $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeek;
            $user = User::find($validated['user_id']);
            $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

            if ($schedule) {
                $startTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->start_time);
                $minutesLate = $attendance->time_in->diffInMinutes($startTime, false);

                if ($minutesLate > 15) {
                    $attendance->status = 'Late';
                } else {
                    $attendance->status = 'Present';
                }
            } else {
                $attendance->status = 'Present';
            }
        } elseif ($attendance->time_in === null && $attendance->time_out === null) {
            $attendance->status = 'Absent';
        } elseif ($attendance->time_in && $attendance->time_out === null) {
            $attendance->status = 'No Time Out';
        } else {
            $attendance->status = 'Present';
        }

        $attendance->save();

        // Recalculate total_time (similar to update method)
        $totalTime = null;
        $isOvertime = false;
        if ($attendance->time_in && $attendance->time_out) {
            $timeIn = Carbon::parse($attendance->time_in);
            $timeOut = Carbon::parse($attendance->time_out);

            $timeOutOriginal = $timeOut->copy();
            if ($timeOut->format('Y-m-d') === $timeIn->format('Y-m-d') && $timeOut->format('H:i') < $timeIn->format('H:i')) {
                $timeOut->addDay();
            }

            $totalMinutes = $timeIn->diffInMinutes($timeOut);

            $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeek;
            $user = User::find($validated['user_id']);
            $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

            $breakMinutes = 0;
            if ($schedule && $schedule->break_time && $schedule->break_time_hour !== null && $schedule->break_time_hour > 0 && $totalMinutes > 0) {
                $breakStartDateTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->break_time);
                $reachedBreak = false;
                if ($timeOut->format('Y-m-d') !== $timeIn->format('Y-m-d')) {
                    $reachedBreak = true;
                } elseif ($timeOutOriginal->greaterThanOrEqualTo($breakStartDateTime)) {
                    $reachedBreak = true;
                }

                if ($reachedBreak) {
                    $calculatedBreakMinutes = (int) ($schedule->break_time_hour * 60);
                    $breakMinutes = min($calculatedBreakMinutes, $totalMinutes);
                }
            }

            $workedMinutes = $totalMinutes - $breakMinutes;
            $workedMinutes = max(0, $workedMinutes);
            $workedHours = round($workedMinutes / 60, 1);

            if ($schedule && $schedule->start_time && $schedule->end_time) {
                $scheduleStart = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->start_time);
                $scheduleEnd = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->end_time);
                if ($scheduleEnd->lessThan($scheduleStart)) {
                    $scheduleEnd->addDay();
                }

                $scheduledMinutes = $scheduleStart->diffInMinutes($scheduleEnd);
                if ($schedule->break_time_hour !== null && $schedule->break_time_hour > 0) {
                    $scheduledBreakMinutes = (int) ($schedule->break_time_hour * 60);
                    $scheduledMinutes -= $scheduledBreakMinutes;
                }

                $scheduledHours = round($scheduledMinutes / 60, 1);

                if ($workedHours > $scheduledHours) {
                    $overtimeHours = round($workedHours - $scheduledHours, 1);
                    $totalTime = $scheduledHours.' Hours (Overtime: +'.$overtimeHours.' Hours)';
                    $isOvertime = true;
                } else {
                    $totalTime = round(min($workedHours, $scheduledHours), 1).' Hours';
                }
            } else {
                $totalTime = $workedHours.' Hours';
            }
        }

        // Note: total_time and is_overtime are calculated dynamically, not stored in database
        // They will be calculated when the attendance is retrieved in the index method

        return response()->json([
            'success' => true,
            'message' => 'Attendance recorded successfully',
            'attendance' => $attendance->load('user:id,name,email'),
        ]);
    }

    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $this->checkAdmin();

        $validated = $request->validate([
            'time_in' => ['nullable', 'string'],
            'time_out' => ['nullable', 'string'],
        ]);

        // Update time_in and time_out
        if (isset($validated['time_in'])) {
            if ($validated['time_in'] && trim($validated['time_in']) !== '') {
                // Parse datetime-local format (YYYY-MM-DDTHH:mm)
                // Extract time and combine with attendance date in UTC
                $dateTime = Carbon::parse($validated['time_in']);
                $attendance->time_in = Carbon::parse($attendance->date)->setTime($dateTime->hour, $dateTime->minute, 0)->utc();
            } else {
                $attendance->time_in = null;
            }
        }

        if (isset($validated['time_out'])) {
            if ($validated['time_out'] && trim($validated['time_out']) !== '') {
                // Parse datetime-local format (YYYY-MM-DDTHH:mm)
                // Extract time and combine with attendance date in UTC
                $dateTime = Carbon::parse($validated['time_out']);
                $attendance->time_out = Carbon::parse($attendance->date)->setTime($dateTime->hour, $dateTime->minute, 0)->utc();

                // If time_out is before time_in on the same day, it's next day
                if ($attendance->time_in && $attendance->time_out->lessThan($attendance->time_in)) {
                    $attendance->time_out->addDay();
                }
            } else {
                $attendance->time_out = null;
            }
        }

        // Recalculate status based on schedule
        if ($attendance->time_in && $attendance->date) {
            $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeek;
            $schedule = $attendance->user->schedules()->where('day_of_week', $dayOfWeek)->first();

            if ($schedule) {
                $startTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->start_time);
                $minutesLate = $attendance->time_in->diffInMinutes($startTime, false);

                if ($minutesLate > 15) {
                    $attendance->status = 'Late';
                } else {
                    $attendance->status = 'Present';
                }
            } else {
                $attendance->status = 'Present';
            }
        } elseif ($attendance->time_in === null && $attendance->time_out === null) {
            $attendance->status = 'Absent';
        } elseif ($attendance->time_in && $attendance->time_out === null) {
            $attendance->status = 'No Time Out';
        }

        $attendance->save();

        // Recalculate total_time (similar to index method)
        $totalTime = null;
        $isOvertime = false;
        if ($attendance->time_in && $attendance->time_out) {
            $timeIn = Carbon::parse($attendance->time_in);
            $timeOut = Carbon::parse($attendance->time_out);

            $timeOutOriginal = $timeOut->copy();
            if ($timeOut->format('Y-m-d') === $timeIn->format('Y-m-d') && $timeOut->format('H:i') < $timeIn->format('H:i')) {
                $timeOut->addDay();
            }

            $totalMinutes = $timeIn->diffInMinutes($timeOut);

            $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeek;
            $schedule = $attendance->user->schedules()->where('day_of_week', $dayOfWeek)->first();

            $breakMinutes = 0;
            if ($schedule && $schedule->break_time && $schedule->break_time_hour !== null && $schedule->break_time_hour > 0 && $totalMinutes > 0) {
                $breakStartDateTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->break_time);
                $reachedBreak = false;
                if ($timeOut->format('Y-m-d') !== $timeIn->format('Y-m-d')) {
                    $reachedBreak = true;
                } elseif ($timeOutOriginal->greaterThanOrEqualTo($breakStartDateTime)) {
                    $reachedBreak = true;
                }

                if ($reachedBreak) {
                    $calculatedBreakMinutes = (int) ($schedule->break_time_hour * 60);
                    $breakMinutes = min($calculatedBreakMinutes, $totalMinutes);
                }
            }

            $workedMinutes = $totalMinutes - $breakMinutes;
            $workedMinutes = max(0, $workedMinutes);
            $workedHours = round($workedMinutes / 60, 1);

            if ($schedule && $schedule->start_time && $schedule->end_time) {
                $scheduleStart = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->start_time);
                $scheduleEnd = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->end_time);
                if ($scheduleEnd->lessThan($scheduleStart)) {
                    $scheduleEnd->addDay();
                }

                $scheduledMinutes = $scheduleStart->diffInMinutes($scheduleEnd);
                if ($schedule->break_time_hour !== null && $schedule->break_time_hour > 0) {
                    $scheduledBreakMinutes = (int) ($schedule->break_time_hour * 60);
                    $scheduledMinutes -= $scheduledBreakMinutes;
                }

                $scheduledHours = round($scheduledMinutes / 60, 1);

                if ($workedHours > $scheduledHours) {
                    $overtimeHours = round($workedHours - $scheduledHours, 1);
                    $totalTime = $scheduledHours.' Hours (Overtime: +'.$overtimeHours.' Hours)';
                    $isOvertime = true;
                } else {
                    $totalTime = round(min($workedHours, $scheduledHours), 1).' Hours';
                }
            } else {
                $totalTime = $workedHours.' Hours';
            }
        }

        // Note: total_time and is_overtime are calculated dynamically, not stored in database
        // They will be calculated when the attendance is retrieved in the index method

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully',
            'attendance' => $attendance->load('user:id,name,email'),
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $this->checkAdmin();

        $query = Attendance::with('user:id,name,email');

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $attendances = $query->orderBy('date', 'desc')
            ->orderBy('time_in', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $attendances,
        ]);
    }

    /**
     * Mark users as absent if they have a schedule but didn't scan/check in
     */
    private function markAbsentUsers(\Carbon\Carbon $date): void
    {
        try {
            $users = User::where('role', '!=', 'admin')->get();
            $dayOfWeek = $date->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            foreach ($users as $user) {
                // Ensure $user is a User model instance
                if (! ($user instanceof User)) {
                    continue;
                }

                // Check if user has a schedule for this day
                $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

                if (! $schedule) {
                    // No schedule for this day, skip
                    continue;
                }

                // Check if attendance record exists
                $attendance = Attendance::where('user_id', $user->id)
                    ->where('date', $date->format('Y-m-d'))
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
            // Silently fail - don't interrupt page loading
        }
    }
}
