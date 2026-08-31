<?php

declare(strict_types=1);

// This project's composer.json declares standard PSR-4 autoloading
// (`OpenWrapper\` -> `src/`, `OpenWrapper\Tests\` -> `tests/`). This file
// is a minimal hand-rolled equivalent, used only because this sandbox has
// no network access to packagist.org to run `composer install`. It is not
// part of the SDK's public contract — a real contributor should run
// `composer install` and require the generated `vendor/autoload.php`
// instead of this file.

spl_autoload_register(static function (string $class): void {
    $prefixes = [
        'OpenWrapper\\Tests\\' => __DIR__ . '/tests/',
        'OpenWrapper\\' => __DIR__ . '/src/',
    ];
    foreach ($prefixes as $prefix => $baseDir) {
        if (str_starts_with($class, $prefix)) {
            $relative = substr($class, strlen($prefix));
            $path = $baseDir . str_replace('\\', '/', $relative) . '.php';
            if (is_file($path)) {
                require $path;
                return;
            }
        }
    }
});
