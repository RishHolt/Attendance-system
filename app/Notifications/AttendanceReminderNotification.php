<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AttendanceReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        private string $type,
        private Carbon $scheduledTime
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $message = match ($this->type) {
            'check_in' => (new MailMessage)
                ->subject('Reminder: Check-in Time Approaching')
                ->line('Your scheduled check-in time is in 15 minutes.')
                ->line('Scheduled time: '.$this->scheduledTime->format('H:i'))
                ->line('Please remember to check in when you arrive.'),
            'late_check_in' => (new MailMessage)
                ->subject('Alert: You Haven\'t Checked In Yet')
                ->line('You were scheduled to check in at '.$this->scheduledTime->format('H:i').'.')
                ->line('It has been 30 minutes since your scheduled start time.')
                ->line('Please check in as soon as possible.'),
            'check_out' => (new MailMessage)
                ->subject('Reminder: Check-out Time Approaching')
                ->line('Your scheduled check-out time is in 15 minutes.')
                ->line('Scheduled time: '.$this->scheduledTime->format('H:i'))
                ->line('Please remember to check out when you leave.'),
            'missed_check_out' => (new MailMessage)
                ->subject('Alert: You Haven\'t Checked Out Yet')
                ->line('You were scheduled to check out at '.$this->scheduledTime->format('H:i').'.')
                ->line('It has been 1 hour since your scheduled end time.')
                ->line('Please check out as soon as possible.'),
            default => (new MailMessage)
                ->subject('Attendance Reminder')
                ->line('This is an attendance reminder.'),
        };

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'scheduled_time' => $this->scheduledTime->format('H:i'),
            'message' => $this->getMessage(),
        ];
    }

    /**
     * Get the notification message
     */
    private function getMessage(): string
    {
        return match ($this->type) {
            'check_in' => 'Your scheduled check-in time is in 15 minutes ('.$this->scheduledTime->format('H:i').').',
            'late_check_in' => 'You haven\'t checked in yet. Your scheduled time was '.$this->scheduledTime->format('H:i').'.',
            'check_out' => 'Your scheduled check-out time is in 15 minutes ('.$this->scheduledTime->format('H:i').').',
            'missed_check_out' => 'You haven\'t checked out yet. Your scheduled time was '.$this->scheduledTime->format('H:i').'.',
            default => 'Attendance reminder.',
        };
    }
}
