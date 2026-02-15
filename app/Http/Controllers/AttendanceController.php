<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    public function scan(Request $request): JsonResponse
    {
        try {
            // Validate request
            $validated = $request->validate([
                'qr_token' => ['required', 'string', 'min:1'],
            ]);

            $qrToken = trim($validated['qr_token']);

            // Check admin authorization
            $authUser = $request->user();
            if (! $authUser || $authUser->role !== 'admin') {
                Log::warning('Non-admin user attempted to scan QR', [
                    'user_id' => $authUser?->id,
                    'role' => $authUser?->role,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            // Find user by QR token
            $user = User::where('qr_token', $qrToken)->first();

            if (! $user) {
                Log::warning('QR token not found', [
                    'qr_token_length' => strlen($qrToken),
                    'qr_token_preview' => substr($qrToken, 0, 10).'...',
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Invalid QR Code',
                ], 400);
            }

            $today = Carbon::today();
            $dayOfWeek = $today->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            // Check if user has a schedule for today
            $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

            if (! $schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'No Schedule for Today',
                ], 400);
            }

            // Get or create today's attendance
            // Use database transaction to handle race conditions atomically
            $attendance = DB::transaction(function () use ($user, $today) {
                // Try to get existing record first
                $attendance = Attendance::where('user_id', $user->id)
                    ->where('date', $today->format('Y-m-d'))
                    ->first();

                // If not found, create it
                if (! $attendance) {
                    try {
                        $attendance = Attendance::create([
                            'user_id' => $user->id,
                            'date' => $today->format('Y-m-d'),
                            'status' => 'Present',
                        ]);
                    } catch (\Illuminate\Database\QueryException $e) {
                        // Handle race condition: another request created it between our check and create
                        $errorInfo = $e->errorInfo ?? [];
                        $errorCode = $e->getCode();
                        $errorMessage = $e->getMessage();
                        $sqlState = $errorInfo[0] ?? null;

                        // Check for unique constraint violation (SQLite: 19, MySQL: 23000)
                        $isUniqueConstraint = $errorCode === 19 ||
                                             $errorCode === '23000' ||
                                             $sqlState === '23000' ||
                                             str_contains($errorMessage, 'UNIQUE constraint') ||
                                             str_contains($errorMessage, 'Integrity constraint violation') ||
                                             str_contains($errorMessage, 'constraint failed');

                        if ($isUniqueConstraint) {
                            // Fetch the record that was just created
                            $attendance = Attendance::where('user_id', $user->id)
                                ->where('date', $today->format('Y-m-d'))
                                ->first();

                            if (! $attendance) {
                                // Still not found, throw original exception
                                throw $e;
                            }
                        } else {
                            // Different error, re-throw
                            throw $e;
                        }
                    }
                }

                return $attendance;
            });

            $localTimezone = 'Asia/Manila';
            $nowLocal = Carbon::now($localTimezone);

            // Create datetime with local time components, stored in UTC
            // This preserves the actual local clock time (e.g., 10:00 AM local stays as 10:00 AM)
            $now = Carbon::create(
                $nowLocal->year,
                $nowLocal->month,
                $nowLocal->day,
                $nowLocal->hour,
                $nowLocal->minute,
                $nowLocal->second,
                'UTC'
            );

            // Parse start time safely using setTimeFromTimeString (more reliable)
            try {
                // Use setTimeFromTimeString which handles time strings directly
                // $schedule->start_time should be in format "HH:MM:SS" or "HH:MM"
                $startTime = $today->copy()->setTimeFromTimeString($schedule->start_time);
            } catch (\Exception $e) {
                $rawStartTime = 'N/A';
                if (method_exists($schedule, 'getRawOriginal')) {
                    $rawStartTime = $schedule->getRawOriginal('start_time') ?? 'N/A';
                }

                Log::error('Error parsing start time', [
                    'schedule_id' => $schedule->id,
                    'start_time' => $schedule->start_time,
                    'start_time_type' => gettype($schedule->start_time),
                    'raw_start_time' => $rawStartTime,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                // Default fallback - use 9 AM
                $startTime = $today->copy()->setTime(9, 0, 0);
            }

            // Check if time in or out
            if ($attendance->time_in === null) {
                // Time in
                $attendance->time_in = $now;

                // Check if late (more than 15 minutes after start_time)
                // Ensure both times are in the same timezone for accurate comparison
                $nowLocal = $now->copy();
                $startTimeLocal = $startTime->copy();

                // diffInMinutes returns negative if calling object is after parameter
                // So we reverse the order: startTime->diffInMinutes(now) gives positive when now is after startTime
                $minutesLate = $startTimeLocal->diffInMinutes($nowLocal, false);

                // Only mark as late if they clocked in AFTER the start time (positive difference) and more than 15 minutes late
                if ($minutesLate > 15) {
                    $attendance->status = 'Late';
                } else {
                    $attendance->status = 'Present';
                }

                $attendance->save();

                return response()->json([
                    'success' => true,
                    'message' => $attendance->status === 'Late' ? 'You are Late' : 'Time In Successful',
                    'data' => [
                        'action' => 'time_in',
                        'status' => $attendance->status,
                        'time' => $attendance->time_in->format('H:i:s'),
                        'user_name' => $user->name,
                    ],
                ]);
            } else {
                // Time out
                if ($attendance->time_out !== null) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Already Timed Out',
                    ], 400);
                }

                $attendance->time_out = $now;
                $attendance->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Timed Out',
                    'data' => [
                        'action' => 'time_out',
                        'time' => $attendance->time_out->format('H:i:s'),
                        'user_name' => $user->name,
                    ],
                ]);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            $errorInfo = $e->errorInfo ?? [];
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();
            $sqlState = $errorInfo[0] ?? null;

            // Check for unique constraint violation
            $isUniqueConstraint = $errorCode === 19 ||
                                 $errorCode === '23000' ||
                                 $sqlState === '23000' ||
                                 str_contains($errorMessage, 'UNIQUE constraint') ||
                                 str_contains($errorMessage, 'Integrity constraint violation') ||
                                 str_contains($errorMessage, 'constraint failed');

            if ($isUniqueConstraint) {
                // This should rarely happen now due to transaction handling, but provide friendly message
                Log::warning('Unique constraint violation in attendance scan (should be handled by transaction)', [
                    'error' => $e->getMessage(),
                    'request' => $request->all(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Attendance record already exists for today. Please try scanning again.',
                ], 409);
            }

            // Log other database errors with full details
            Log::error('Database error in attendance scan', [
                'error' => $e->getMessage(),
                'error_code' => $errorCode,
                'sql_state' => $sqlState,
                'error_info' => $errorInfo,
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'A database error occurred while processing your request. Please try again.',
            ], 500);
        } catch (\Exception $e) {
            Log::error('Unexpected error in attendance scan', [
                'error' => $e->getMessage(),
                'error_type' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred. Please try again.',
            ], 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $authUser = $request->user();

        if (! $authUser) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Allow admin to view any user's attendance, otherwise use authenticated user
        if ($authUser->role === 'admin' && $request->has('user_id') && $request->user_id) {
            $userId = (int) $request->user_id;
            $query = Attendance::where('user_id', $userId);
            $targetUser = \App\Models\User::find($userId);
        } else {
            $query = Attendance::where('user_id', $authUser->id);
            $targetUser = $authUser;
        }

        // Filter by week
        if ($request->has('week') && $request->week) {
            $week = Carbon::parse($request->week);
            $startOfWeek = $week->copy()->startOfWeek(Carbon::SUNDAY);
            $endOfWeek = $week->copy()->endOfWeek(Carbon::SATURDAY);
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

        // Search by date
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereRaw('DATE_FORMAT(date, "%Y-%m-%d") LIKE ?', ["%{$search}%"]);
        }

        $attendances = $request->has('month') || $request->has('week')
            ? $query->orderBy('date', 'desc')->get()
            : $query->orderBy('date', 'desc')->paginate(10);

        $collection = $attendances instanceof \Illuminate\Pagination\LengthAwarePaginator
            ? $attendances->getCollection()
            : $attendances;

        // Add total_time calculation
        $collection->transform(function ($attendance) use ($targetUser) {
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
                $schedule = $targetUser->schedules()->where('day_of_week', $dayOfWeek)->first();
                if (! $schedule) {
                    $schedule = $targetUser->schedules()->first();
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

        // Return paginated response
        return response()->json($attendances);
    }

    public function exportPdf(Request $request)
    {
        $authUser = $request->user();

        if (! $authUser) {
            abort(401);
        }

        $validated = $request->validate([
            'period' => ['required', 'in:week,month,year'],
            'date' => ['required', 'string'],
        ]);

        $period = $validated['period'];
        $dateInput = $validated['date'];
        $user = $authUser;

        // Calculate date range based on period
        $date = Carbon::parse($dateInput);
        $startDate = null;
        $endDate = null;
        $periodLabel = '';

        switch ($period) {
            case 'week':
                // Set week to start on Sunday (0) instead of Monday (1)
                $startDate = $date->copy()->startOfWeek(Carbon::SUNDAY);
                $endDate = $date->copy()->endOfWeek(Carbon::SATURDAY);
                $periodLabel = $startDate->format('M d').' - '.$endDate->format('M d, Y');
                break;
            case 'month':
                $startDate = $date->copy()->startOfMonth();
                $endDate = $date->copy()->endOfMonth();
                $periodLabel = $date->format('F Y');
                break;
            case 'year':
                $startDate = $date->copy()->startOfYear();
                $endDate = $date->copy()->endOfYear();
                $periodLabel = $date->format('Y');
                break;
        }

        // Get attendances for the period
        $query = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->orderBy('date', 'asc')
            ->orderBy('time_in', 'asc');

        $attendances = $query->get();

        // Calculate total_time for each attendance
        $attendances->transform(function ($attendance) use ($user) {
            return $this->calculateAttendanceTime($attendance, $user);
        });

        // Calculate summary statistics
        $summary = [
            'total_days' => $attendances->count(),
            'present' => $attendances->where('status', 'Present')->count(),
            'late' => $attendances->where('status', 'Late')->count(),
            'absent' => $attendances->where('status', 'Absent')->count(),
            'no_time_out' => $attendances->where('status', 'No Time Out')->count(),
            'total_hours' => 0,
            'overtime_hours' => 0,
        ];

        // Calculate total hours and overtime
        foreach ($attendances as $attendance) {
            if ($attendance->time_in && $attendance->time_out && $attendance->total_time) {
                // Extract hours from total_time string
                if (preg_match('/(\d+\.?\d*)\s*Hours/', $attendance->total_time, $matches)) {
                    $summary['total_hours'] += (float) $matches[1];
                }
                if (preg_match('/Overtime:\s*\+(\d+\.?\d*)\s*Hours/', $attendance->total_time, $matches)) {
                    $summary['overtime_hours'] += (float) $matches[1];
                }
            }
        }

        $summary['total_hours'] = round($summary['total_hours'], 1);
        $summary['overtime_hours'] = round($summary['overtime_hours'], 1);

        // Generate PDF
        $pdf = Pdf::loadView('attendance.pdf-report', [
            'user' => $user,
            'attendances' => $attendances,
            'summary' => $summary,
            'periodLabel' => $periodLabel,
        ]);

        $filename = 'my-attendance-'.strtolower($period).'-'.$date->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    /**
     * Calculate total time for an attendance record
     */
    private function calculateAttendanceTime($attendance, $user): Attendance
    {
        $totalTime = null;
        $isOvertime = false;

        if ($attendance->time_in && $attendance->time_out) {
            $timeIn = Carbon::parse($attendance->time_in);
            $timeOut = Carbon::parse($attendance->time_out);

            // Handle case where time out is on the next day
            $timeOutOriginal = $timeOut->copy();
            if ($timeOut->format('Y-m-d') === $timeIn->format('Y-m-d') && $timeOut->format('H:i') < $timeIn->format('H:i')) {
                $timeOut->addDay();
            }

            $totalMinutes = $timeIn->diffInMinutes($timeOut);

            // Get schedule for this day
            $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeek;
            $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();
            if (! $schedule) {
                $schedule = $user->schedules()->first();
            }

            // Calculate break time
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

            // Calculate scheduled hours
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

        $attendance->total_time = $totalTime;
        $attendance->is_overtime = $isOvertime;

        return $attendance;
    }
}
