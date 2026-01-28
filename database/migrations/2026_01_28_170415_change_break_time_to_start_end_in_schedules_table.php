<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn('break_time');
            $table->time('break_time_start')->nullable()->after('end_time');
            $table->time('break_time_end')->nullable()->after('break_time_start');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['break_time_start', 'break_time_end']);
            $table->time('break_time')->default('01:00:00')->after('end_time');
        });
    }
};
