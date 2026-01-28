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
        $schedules = $request->user()->schedules()->orderBy('day_of_week')->get();

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
