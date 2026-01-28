<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateQRTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'qr:generate-tokens';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate QR tokens for users that do not have one';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $usersWithoutToken = User::whereNull('qr_token')->get();

        if ($usersWithoutToken->isEmpty()) {
            $this->info('All users already have QR tokens.');

            return self::SUCCESS;
        }

        $this->info("Found {$usersWithoutToken->count()} user(s) without QR tokens.");

        $bar = $this->output->createProgressBar($usersWithoutToken->count());
        $bar->start();

        foreach ($usersWithoutToken as $user) {
            $user->qr_token = Str::random(32);
            $user->save();
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('QR tokens generated successfully!');

        return self::SUCCESS;
    }
}
