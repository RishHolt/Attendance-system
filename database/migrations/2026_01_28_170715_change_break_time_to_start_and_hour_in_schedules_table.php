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
            // Drop break_time_start and break_time_end if they exist
            if (Schema::hasColumn('schedules', 'break_time_start')) {
                $table->dropColumn('break_time_start');
            }
            if (Schema::hasColumn('schedules', 'break_time_end')) {
                $table->dropColumn('break_time_end');
            }
            // Add break_time (start time) and break_time_hour (duration in hours)
            $table->time('break_time')->nullable()->after('end_time');
            $table->decimal('break_time_hour', 3, 1)->default(1.0)->after('break_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['break_time', 'break_time_hour']);
            $table->time('break_time_start')->nullable()->after('end_time');
            $table->time('break_time_end')->nullable()->after('break_time_start');
        });
    }
};
