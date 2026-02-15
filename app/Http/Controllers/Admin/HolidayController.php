<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class HolidayController extends Controller
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

        $holidays = Holiday::orderBy('date', 'asc')
            ->paginate(20);

        return Inertia::render('Admin/Holidays', [
            'holidays' => $holidays,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->checkAdmin();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'type' => ['required', 'in:public,company'],
            'is_recurring' => ['boolean'],
        ]);

        $holiday = Holiday::create([
            'name' => $validated['name'],
            'date' => $validated['date'],
            'type' => $validated['type'],
            'is_recurring' => $validated['is_recurring'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Holiday or event created successfully',
            'holiday' => $holiday,
        ]);
    }

    public function update(Request $request, Holiday $holiday): JsonResponse
    {
        $this->checkAdmin();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'type' => ['required', 'in:public,company'],
            'is_recurring' => ['boolean'],
        ]);

        $holiday->update([
            'name' => $validated['name'],
            'date' => $validated['date'],
            'type' => $validated['type'],
            'is_recurring' => $validated['is_recurring'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Holiday or event updated successfully',
            'holiday' => $holiday,
        ]);
    }

    public function destroy(Holiday $holiday): JsonResponse
    {
        $this->checkAdmin();

        $holiday->delete();

        return response()->json([
            'success' => true,
            'message' => 'Holiday or event deleted successfully',
        ]);
    }
}
