<?php

return [
    'version' => env('NATIVEPHP_APP_VERSION', '1.0.0'),
    'app_id' => env('NATIVEPHP_APP_ID', 'com.attendance.system'),
    'app_name' => env('NATIVEPHP_APP_NAME', 'Attendance System'),
    'author' => env('NATIVEPHP_APP_AUTHOR', 'Attendance System'),
    'domain' => env('NATIVEPHP_APP_DOMAIN', 'attendance.test'),

    'updater' => [
        'enabled' => false,
        'default' => 'github',
        'providers' => [
            'github' => [
                'driver' => 'github',
                'repo' => env('GITHUB_REPO'),
                'owner' => env('GITHUB_OWNER'),
                'token' => env('GITHUB_TOKEN'),
            ],
        ],
    ],

    'hot_reload' => [
        'enabled' => env('NATIVEPHP_HOT_RELOAD', true),
        'dev_server' => [
            'host' => 'localhost',
            'port' => 3000,
        ],
    ],
    
    'provider' => \App\Providers\NativeAppServiceProvider::class,
];