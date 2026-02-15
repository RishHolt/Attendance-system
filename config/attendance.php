<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Attendance Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for the attendance system.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Maximum Lookback Period
    |--------------------------------------------------------------------------
    |
    | The maximum number of days to look back when backfilling past attendance
    | records. This prevents the system from checking too far back in history
    | when the system was closed for an extended period.
    |
    | Default: 30 days
    |
    */

    'max_lookback_days' => env('ATTENDANCE_MAX_LOOKBACK_DAYS', 30),
];
