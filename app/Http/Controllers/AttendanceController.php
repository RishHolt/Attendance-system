<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            $attendance = Attendance::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'date' => $today,
                ],
                [
                    'status' => 'Present',
                ]
            );

            $now = Carbon::now();

            // Parse start time safely
            try {
                // Get the start_time value - it should be a time string like "09:00:00" or "09:00"
                $timeValue = $schedule->start_time;

                // If it's already a Carbon instance (shouldn't happen, but just in case)
                if ($timeValue instanceof Carbon) {
                    $timeValue = $timeValue->format('H:i:s');
                } elseif (! is_string($timeValue)) {
                    // Try to get raw value from database if schedule is an Eloquent model
                    if (method_exists($schedule, 'getRawOriginal')) {
                        $timeValue = $schedule->getRawOriginal('start_time') ?? '09:00:00';
                    } else {
                        $timeValue = '09:00:00';
                    }
                }

                // Clean the time value - remove any date components if present
                $timeValue = trim($timeValue);

                // Extract just the time part (HH:MM:SS or HH:MM)
                if (preg_match('/(\d{2}:\d{2}(?::\d{2})?)/', $timeValue, $matches)) {
                    $timeValue = $matches[1];
                    // If time is in H:i format, add seconds
                    if (preg_match('/^\d{2}:\d{2}$/', $timeValue)) {
                        $timeValue .= ':00';
                    }
                } else {
                    $timeValue = '09:00:00'; // Default fallback
                }

                // Create the datetime by combining today's date with the time
                $startTime = Carbon::createFromFormat('Y-m-d H:i:s', $today->format('Y-m-d').' '.$timeValue);
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
                $minutesLate = $now->diffInMinutes($startTime, false);
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
        } catch (\Exception $e) {
            Log::error('Error in attendance scan', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing the scan. Please try again.',
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

        // Search by date
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereRaw('DATE_FORMAT(date, "%Y-%m-%d") LIKE ?', ["%{$search}%"]);
        }

        $attendances = $query->orderBy('date', 'desc')->paginate(10);

        // Add total_time calculation
        $attendances->transform(function ($attendance) use ($targetUser) {
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
}
