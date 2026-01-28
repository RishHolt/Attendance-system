<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScheduleRequest;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $authUser = $request->user();

        // Allow admin to view any user's schedules
        if ($authUser->role === 'admin' && $request->has('user_id') && $request->user_id) {
            $userId = (int) $request->user_id;
            $user = \App\Models\User::find($userId);
            if (! $user) {
                return response()->json(['error' => 'User not found'], 404);
            }
            $schedules = $user->schedules()->orderBy('day_of_week')->get();
        } else {
            $schedules = $authUser->schedules()->orderBy('day_of_week')->get();
        }

        return response()->json($schedules);
    }

    public function store(StoreScheduleRequest $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user, $request) {
            // Delete existing schedules
            $user->schedules()->delete();

            // Create new schedules
            foreach ($request->schedules as $scheduleData) {
                Schedule::create([
                    'user_id' => $user->id,
                    'day_of_week' => $scheduleData['day_of_week'],
                    'start_time' => $scheduleData['start_time'],
                    'end_time' => $scheduleData['end_time'],
                    'break_time' => $scheduleData['break_time'] ?? null,
                    'break_time_hour' => $scheduleData['break_time_hour'] ?? 1.0,
                ]);
            }
        });

        $schedules = $user->schedules()->orderBy('day_of_week')->get();

        return response()->json([
            'success' => true,
            'message' => 'Schedule saved successfully',
            'data' => $schedules,
        ], 201);
    }
}
