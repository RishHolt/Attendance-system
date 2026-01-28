<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
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

        $users = User::withCount(['attendances', 'schedules'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Admin/Users', [
            'users' => $users,
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->checkAdmin();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->checkAdmin();

        $user->load(['schedules', 'attendances' => function ($query) {
            $query->orderBy('date', 'desc')->limit(10);
        }]);

        return response()->json($user);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->checkAdmin();

        $data = $request->validated();

        if (isset($data['password']) && ! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->checkAdmin();

        // Prevent deleting yourself
        if ($user->id === Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);
    }

    public function regenerateQrToken(User $user): JsonResponse
    {
        $this->checkAdmin();

        $user->qr_token = \Illuminate\Support\Str::random(32);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'QR token regenerated successfully',
            'qr_token' => $user->qr_token,
        ]);
    }

    public function getSchedules(User $user): JsonResponse
    {
        $this->checkAdmin();

        $schedules = $user->schedules()->orderBy('day_of_week')->get();

        return response()->json($schedules);
    }

    public function updateSchedules(StoreScheduleRequest $request, User $user): JsonResponse
    {
        $this->checkAdmin();

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
            'message' => 'Schedule updated successfully',
            'data' => $schedules,
        ]);
    }
}
