<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if column already exists
        if (!Schema::hasColumn('users', 'user_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->unique()->nullable()->after('id');
            });
        }

        // Generate random user_id for existing users that don't have one
        $users = User::whereNull('user_id')->get();
        foreach ($users as $user) {
            do {
                $randomId = random_int(100000, 999999); // 6-digit random number
            } while (User::where('user_id', $randomId)->exists());

            DB::table('users')
                ->where('id', $user->id)
                ->update(['user_id' => $randomId]);
        }

        // Make user_id required after backfilling
        // SQLite doesn't support MODIFY, so we'll handle NOT NULL constraint in the model
        // For other databases, we can use MODIFY
        $driver = DB::getDriverName();
        if ($driver !== 'sqlite') {
            try {
                DB::statement('ALTER TABLE users MODIFY user_id BIGINT UNSIGNED NOT NULL');
            } catch (\Exception $e) {
                // Column might already be NOT NULL, ignore error
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('user_id');
        });
    }
};
