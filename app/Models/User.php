<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'qr_token',
        'role',
        'user_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($user) {
            if (empty($user->qr_token)) {
                $user->qr_token = Str::random(32);
            }

            // Generate random user_id if not provided
            if (empty($user->user_id)) {
                do {
                    $randomId = random_int(100000, 999999); // 6-digit random number
                } while (self::where('user_id', $randomId)->exists());

                $user->user_id = $randomId;
            }
        });

        // Ensure user_id exists when retrieving (for any edge cases)
        static::retrieved(function ($user) {
            if (empty($user->user_id)) {
                do {
                    $randomId = random_int(100000, 999999);
                } while (self::where('user_id', $randomId)->exists());

                $user->user_id = $randomId;
                $user->saveQuietly(); // Save without triggering events
            }
        });
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
