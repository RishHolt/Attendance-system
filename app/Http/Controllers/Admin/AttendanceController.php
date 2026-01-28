<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    private function checkAdmin(): void
    {
        if (auth()->user()->role !== 'admin') {
            abort(403);
        }
    }

    public function index(Request $request): Response
    {
        $this->checkAdmin();

        $query = Attendance::with('user:id,name,email');

        // Filter by date range
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('date', '<=', $request->end_date);
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
            ->orderBy('check_in', 'desc')
            ->paginate(50);

        // Get all users for filter dropdown
        $users = \App\Models\User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Attendances', [
            'attendances' => $attendances,
            'users' => $users,
            'filters' => $request->only(['start_date', 'end_date', 'user_id', 'status', 'search']),
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
            ->orderBy('check_in', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $attendances,
        ]);
    }
}
