<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

class MarkAbsentAttendance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:mark-absent {--date= : Specific date to check (Y-m-d format). Defaults to today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark users as absent if they have a schedule but did not check out (no time_out)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Get the date to check (default to today if run at end of day, or yesterday for morning runs)
        $dateString = $this->option('date');
        if ($dateString) {
            $date = Carbon::parse($dateString)->startOfDay();
        } else {
            // Default to today - when run at end of day (23:59), it checks today's attendance
            // If run in the morning, you can specify --date=yesterday
            $date = Carbon::today()->startOfDay();
        }

        $this->info("Checking attendance for date: {$date->format('Y-m-d')}");

        // Get all users (excluding admins)
        $users = User::where('role', '!=', 'admin')->get();

        if ($users->isEmpty()) {
            $this->warn('No users found to check.');

            return Command::SUCCESS;
        }

        $dayOfWeek = $date->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        $markedAbsent = 0;
        $markedNoTimeOut = 0;
        $skipped = 0;

        foreach ($users as $user) {
            // Check if user has a schedule for this day
            $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

            if (! $schedule) {
                // No schedule for this day, skip
                continue;
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
                        $markedAbsent++;
                        $this->line("  ✓ Marked {$user->name} (ID: {$user->id}) as Absent");
                    } else {
                        // They have time_in but forgot to time out - mark as "No Time Out"
                        $attendance->status = 'No Time Out';

                        // Auto-extend time_out to 1 hour after scheduled end time
                        $endTime = Carbon::parse($attendance->date)->setTimeFromTimeString($schedule->end_time);
                        $extendedTimeOut = $endTime->copy()->addHour(); // 1 hour after scheduled end time

                        // Only set if current time is past the extended time
                        if (Carbon::now()->greaterThan($extendedTimeOut)) {
                            $attendance->time_out = $extendedTimeOut;
                            $this->line("  ✓ Auto-set time_out for {$user->name} (ID: {$user->id}) to {$extendedTimeOut->format('H:i:s')}");
                        }

                        $attendance->save();
                        $markedNoTimeOut++;
                        $this->line("  ✓ Marked {$user->name} (ID: {$user->id}) as No Time Out");
                    }
                } else {
                    // They have time_out, so they completed their work day - skip
                    $skipped++;
                }
            } else {
                // No attendance record exists - create absent record
                Attendance::create([
                    'user_id' => $user->id,
                    'date' => $date->format('Y-m-d'),
                    'time_in' => null,
                    'time_out' => null,
                    'status' => 'Absent',
                ]);
                $markedAbsent++;
                $this->line("  ✓ Created Absent record for {$user->name} (ID: {$user->id})");
            }
        }

        $this->info("\nSummary:");
        $this->info("  - Marked as Absent: {$markedAbsent}");
        $this->info("  - Marked as No Time Out: {$markedNoTimeOut}");
        $this->info("  - Already completed (skipped): {$skipped}");
        $this->info("\nCompleted successfully!");

        return Command::SUCCESS;
    }
}
