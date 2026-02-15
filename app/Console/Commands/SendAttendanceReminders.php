<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\Holiday;
use App\Models\User;
use App\Notifications\AttendanceReminderNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendAttendanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send attendance reminders for check-in and check-out';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now();
        $today = Carbon::today();
        $dayOfWeek = $today->dayOfWeek;

        // Skip if today is a holiday
        if ($this->isHoliday($today)) {
            $this->info('Today is a holiday. No reminders sent.');

            return Command::SUCCESS;
        }

        $users = User::where('role', '!=', 'admin')->get();
        $remindersSent = 0;

        foreach ($users as $user) {
            $schedule = $user->schedules()->where('day_of_week', $dayOfWeek)->first();

            if (! $schedule) {
                continue;
            }

            // Parse schedule times
            $startTime = $today->copy()->setTimeFromTimeString($schedule->start_time);
            $endTime = $today->copy()->setTimeFromTimeString($schedule->end_time);

            // Handle overnight shifts
            if ($endTime->lessThan($startTime)) {
                $endTime->addDay();
            }

            // Check today's attendance
            $attendance = Attendance::where('user_id', $user->id)
                ->whereDate('date', $today->format('Y-m-d'))
                ->first();

            // Check-in reminder: 15 minutes before scheduled start time
            $checkInReminderTime = $startTime->copy()->subMinutes(15);
            if ($now->greaterThanOrEqualTo($checkInReminderTime) && $now->lessThan($startTime)) {
                if (! $attendance || ! $attendance->time_in) {
                    $user->notify(new AttendanceReminderNotification('check_in', $startTime));
                    $remindersSent++;
                    $this->line("  ✓ Sent check-in reminder to {$user->name}");
                }
            }

            // Late check-in alert: 30 minutes after scheduled start time
            $lateCheckInTime = $startTime->copy()->addMinutes(30);
            if ($now->greaterThanOrEqualTo($lateCheckInTime) && $now->lessThan($lateCheckInTime->copy()->addMinutes(15))) {
                if (! $attendance || ! $attendance->time_in) {
                    $user->notify(new AttendanceReminderNotification('late_check_in', $startTime));
                    $remindersSent++;
                    $this->line("  ✓ Sent late check-in alert to {$user->name}");
                }
            }

            // Check-out reminder: 15 minutes before scheduled end time
            $checkOutReminderTime = $endTime->copy()->subMinutes(15);
            if ($now->greaterThanOrEqualTo($checkOutReminderTime) && $now->lessThan($endTime)) {
                if ($attendance && $attendance->time_in && ! $attendance->time_out) {
                    $user->notify(new AttendanceReminderNotification('check_out', $endTime));
                    $remindersSent++;
                    $this->line("  ✓ Sent check-out reminder to {$user->name}");
                }
            }

            // Missed check-out alert: 1 hour after scheduled end time
            $missedCheckOutTime = $endTime->copy()->addHour();
            if ($now->greaterThanOrEqualTo($missedCheckOutTime) && $now->lessThan($missedCheckOutTime->copy()->addMinutes(15))) {
                if ($attendance && $attendance->time_in && ! $attendance->time_out) {
                    $user->notify(new AttendanceReminderNotification('missed_check_out', $endTime));
                    $remindersSent++;
                    $this->line("  ✓ Sent missed check-out alert to {$user->name}");
                }
            }
        }

        if ($remindersSent > 0) {
            $this->info("\nSent {$remindersSent} reminder(s) successfully!");
        } else {
            $this->info('No reminders needed at this time.');
        }

        return Command::SUCCESS;
    }

    /**
     * Check if a date is a holiday
     */
    private function isHoliday(Carbon $date): bool
    {
        $dateString = $date->format('Y-m-d');
        $monthDay = $date->format('m-d');

        // Check for exact date match
        $exactHoliday = Holiday::whereDate('date', $dateString)->first();
        if ($exactHoliday) {
            return true;
        }

        // Check for recurring holidays
        $recurringHoliday = Holiday::where('is_recurring', true)
            ->whereRaw('DATE_FORMAT(date, "%m-%d") = ?', [$monthDay])
            ->first();
        if ($recurringHoliday) {
            return true;
        }

        return false;
    }
}
