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

            // Check if checking in or out
            if ($attendance->check_in === null) {
                // Check-in
                $attendance->check_in = $now;

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
                    'message' => $attendance->status === 'Late' ? 'You are Late' : 'Check-in Successful',
                    'data' => [
                        'action' => 'check_in',
                        'status' => $attendance->status,
                        'time' => $attendance->check_in->format('H:i:s'),
                        'user_name' => $user->name,
                    ],
                ]);
            } else {
                // Check-out
                // Temporarily disabled for testing - allows multiple check-outs
                if ($attendance->check_out !== null) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Already Checked Out',
                    ], 400);
                }

                $attendance->check_out = $now;
                $attendance->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Checked Out',
                    'data' => [
                        'action' => 'check_out',
                        'time' => $attendance->check_out->format('H:i:s'),
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
        $user = $request->user();

        $attendances = Attendance::where('user_id', $user->id)
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(['data' => $attendances]);
    }
}
