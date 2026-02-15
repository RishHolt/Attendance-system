<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Admin Credentials
    |--------------------------------------------------------------------------
    |
    | Hardcoded admin credentials for the system.
    | These credentials are used to create/update the default admin user.
    |
    */

    'email' => env('ADMIN_EMAIL', 'admin@attendance.com'),
    'password' => env('ADMIN_PASSWORD', 'admin123'),
    'name' => env('ADMIN_NAME', 'System Administrator'),
];
