<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class AttendanceTest extends DuskTestCase
{
    use DatabaseMigrations;

    public function test_user_can_check_in_and_check_out(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('email', 'test@example.com')
                ->type('password', 'password')
                ->press('Login')
                ->assertPathIs('/dashboard')
                ->assertSee('Welcome back');
        });
    }

    public function test_admin_can_view_attendance_logs(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('email', 'admin@example.com')
                ->type('password', 'password')
                ->press('Login')
                ->assertPathIs('/admin/dashboard')
                ->visit('/admin/attendances')
                ->assertSee('Attendance Logs');
        });
    }

    public function test_admin_can_export_pdf(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->browse(function (Browser $browser) use ($admin) {
            $browser->loginAs($admin)
                ->visit('/admin/attendances')
                ->assertSee('Export PDF');
        });
    }

    public function test_dark_mode_toggle(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->browse(function (Browser $browser) use ($user) {
            $browser->loginAs($user)
                ->visit('/dashboard')
                ->assertSee('Welcome back')
                ->click('button[title*="dark mode" i], button[title*="light mode" i]')
                ->pause(500)
                ->assertHasClass('html', 'dark');
        });
    }
}
