<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule the absent marking command to run daily at 11:59 PM
// This checks today's attendance and marks users as absent if they didn't scan
Schedule::command('attendance:mark-absent')
    ->dailyAt('23:59')
    ->timezone('UTC');
