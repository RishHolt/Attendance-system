<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminEmail = config('admin.email');
        $adminPassword = config('admin.password');
        $adminName = config('admin.name');

        $admin = User::firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => $adminName,
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
            ]
        );

        // Always update password and name to ensure they match hardcoded values
        $admin->update([
            'name' => $adminName,
            'password' => Hash::make($adminPassword),
            'role' => 'admin',
        ]);
    }
}
