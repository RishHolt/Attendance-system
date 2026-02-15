<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\Holiday;
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

        // First, backfill past dates for each user
        $this->info("\nBackfilling past dates...");
        $this->backfillPastDates($users, $date);

        // Then check the specified date (or today)
        $this->info("\nChecking attendance for {$date->format('Y-m-d')}...");
        $dayOfWeek = $date->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        $markedAbsent = 0;
        $markedNoTimeOut = 0;
        $skipped = 0;

        foreach ($users as $user) {
            $result = $this->checkAndMarkAbsentForDate($user, $date, $dayOfWeek);
            $markedAbsent += $result['absent'];
            $markedNoTimeOut += $result['no_time_out'];
            $skipped += $result['skipped'];
        }

        $this->info("\nSummary:");
        $this->info("  - Marked as Absent: {$markedAbsent}");
        $this->info("  - Marked as No Time Out: {$markedNoTimeOut}");
        $this->info("  - Already completed (skipped): {$skipped}");
        $this->info("\nCompleted successfully!");

        return Command::SUCCESS;
    }

    /**
     * Backfill past dates for users from their last attendance date
     */
    private function backfillPastDates($users, Carbon $currentDate): void
    {
        $maxLookbackDays = config('attendance.max_lookback_days', 30);
        $today = Carbon::today()->startOfDay();
        $backfillStart = $today->copy()->subDays($maxLookbackDays);

        $totalBackfilled = 0;

        foreach ($users as $user) {
            // Get user's last attendance date
            $lastAttendance = Attendance::where('user_id', $user->id)
                ->orderBy('date', 'desc')
                ->first();

            if ($lastAttendance) {
                $lastDate = Carbon::parse($lastAttendance->date)->startOfDay();
                // Start from day after last attendance, but not before max lookback
                $startDate = max($lastDate->copy()->addDay(), $backfillStart);
            } else {
                // No previous attendance, start from max lookback days ago
                $startDate = $backfillStart;
            }

            // End date is yesterday (don't backfill today, it's handled separately)
            $endDate = $today->copy()->subDay();

            if ($startDate->greaterThan($endDate)) {
                // No dates to backfill
                continue;
            }

            // Iterate through each date
            $currentCheckDate = $startDate->copy();
            while ($currentCheckDate->lte($endDate)) {
                $dayOfWeek = $currentCheckDate->dayOfWeek;
                $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

                if ($schedule) {
                    // Skip if this date is a holiday
                    if ($this->isHoliday($currentCheckDate)) {
                        continue;
                    }

                    // Check if attendance record exists for this date
                    $attendance = Attendance::where('user_id', $user->id)
                        ->whereDate('date', $currentCheckDate->format('Y-m-d'))
                        ->first();

                    if (! $attendance) {
                        // Calculate scheduled end time for this date
                        $scheduledEndTime = $this->getScheduledEndTime($currentCheckDate, $schedule);

                        // Only mark as absent if the scheduled end time has passed
                        if (Carbon::now()->greaterThan($scheduledEndTime)) {
                            Attendance::create([
                                'user_id' => $user->id,
                                'date' => $currentCheckDate->format('Y-m-d'),
                                'time_in' => null,
                                'time_out' => null,
                                'status' => 'Absent',
                            ]);
                            $totalBackfilled++;
                            $this->line("  ✓ Backfilled Absent for {$user->name} on {$currentCheckDate->format('Y-m-d')}");
                        }
                    }
                }

                $currentCheckDate->addDay();
            }
        }

        if ($totalBackfilled > 0) {
            $this->info("  Backfilled {$totalBackfilled} absent records for past dates.");
        } else {
            $this->info('  No past dates needed backfilling.');
        }
    }

    /**
     * Check and mark absent for a specific date
     */
    private function checkAndMarkAbsentForDate(User $user, Carbon $date, int $dayOfWeek): array
    {
        $result = ['absent' => 0, 'no_time_out' => 0, 'skipped' => 0];

        // Skip if this date is a holiday
        if ($this->isHoliday($date)) {
            return $result;
        }

        // Check if user has a schedule for this day
        $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

        if (! $schedule) {
            // No schedule for this day, skip
            return $result;
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
                    $result['absent'] = 1;
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
                    $result['no_time_out'] = 1;
                    $this->line("  ✓ Marked {$user->name} (ID: {$user->id}) as No Time Out");
                }
            } else {
                // They have time_out, so they completed their work day - skip
                $result['skipped'] = 1;
            }
        } else {
            // No attendance record exists - check if scheduled end time has passed before marking absent
            $scheduledEndTime = $this->getScheduledEndTime($date, $schedule);

            // Only mark as absent if scheduled end time has passed
            if (Carbon::now()->greaterThan($scheduledEndTime)) {
                Attendance::create([
                    'user_id' => $user->id,
                    'date' => $date->format('Y-m-d'),
                    'time_in' => null,
                    'time_out' => null,
                    'status' => 'Absent',
                ]);
                $result['absent'] = 1;
                $this->line("  ✓ Created Absent record for {$user->name} (ID: {$user->id})");
            } else {
                // Scheduled end time hasn't passed yet, skip
                $result['skipped'] = 1;
                $this->line("  ⊘ Skipped {$user->name} (ID: {$user->id}) - scheduled end time not yet passed");
            }
        }

        return $result;
    }

    /**
     * Get scheduled end time for a date, handling midnight crossover
     */
    private function getScheduledEndTime(Carbon $date, $schedule): Carbon
    {
        $endTime = $date->copy()->setTimeFromTimeString($schedule->end_time);
        $startTime = $date->copy()->setTimeFromTimeString($schedule->start_time);

        // If end time is before start time, it means it's the next day (overnight shift)
        if ($endTime->lessThan($startTime)) {
            $endTime->addDay();
        }

        return $endTime;
    }

    /**
     * Check if a date is a holiday
     */
    private function isHoliday(Carbon $date): bool
    {
        $dateString = $date->format('Y-m-d');
        $monthDay = $date->format('m-d'); // For recurring holidays

        // Check for exact date match
        $exactHoliday = Holiday::whereDate('date', $dateString)->first();
        if ($exactHoliday) {
            return true;
        }

        // Check for recurring holidays (same month-day every year)
        $recurringHoliday = Holiday::where('is_recurring', true)
            ->whereRaw('DATE_FORMAT(date, "%m-%d") = ?', [$monthDay])
            ->first();
        if ($recurringHoliday) {
            return true;
        }

        return false;
    }
}
