<?php

return [
    /*
    |--------------------------------------------------------------------------
    | NativePHP Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration for NativePHP desktop application.
    | NativePHP is installed and configured for Laravel 12.
    |
    */

    'app' => [
        'name' => env('NATIVEPHP_APP_NAME', 'Attendance System'),
        'id' => env('NATIVEPHP_APP_ID', 'com.attendance.system'),
        'version' => env('NATIVEPHP_APP_VERSION', '1.0.0'),
        'description' => env('NATIVEPHP_APP_DESCRIPTION', 'Employee Attendance Management System'),
        'author' => env('NATIVEPHP_APP_AUTHOR', 'Your Company'),
        'url' => env('NATIVEPHP_APP_URL', 'https://attendance-system.com'),
    ],

    'window' => [
        'width' => env('NATIVEPHP_WINDOW_WIDTH', 1280),
        'height' => env('NATIVEPHP_WINDOW_HEIGHT', 800),
        'min_width' => env('NATIVEPHP_WINDOW_MIN_WIDTH', 1024),
        'min_height' => env('NATIVEPHP_WINDOW_MIN_HEIGHT', 600),
        'resizable' => env('NATIVEPHP_WINDOW_RESIZABLE', true),
        'title' => env('NATIVEPHP_WINDOW_TITLE', 'Attendance System'),
    ],

    'menu' => [
        'enabled' => env('NATIVEPHP_MENU_ENABLED', true),
    ],

    'updater' => [
        'enabled' => env('NATIVEPHP_UPDATER_ENABLED', false),
        'endpoint' => env('NATIVEPHP_UPDATER_ENDPOINT', ''),
        'default' => 'github',
        'providers' => [
            'github' => [
                'driver' => 'github',
                'repo' => env('GITHUB_REPO'),
                'owner' => env('GITHUB_OWNER'),
                'token' => env('GITHUB_TOKEN'),
                'vPrefixedTagName' => env('GITHUB_V_PREFIXED_TAG_NAME', true),
                'private' => env('GITHUB_PRIVATE', false),
                'channel' => env('GITHUB_CHANNEL', 'latest'),
                'releaseType' => env('GITHUB_RELEASE_TYPE', 'release'),
            ],
        ],
    ],
];
