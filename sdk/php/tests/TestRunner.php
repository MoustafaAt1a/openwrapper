<?php

declare(strict_types=1);

namespace OpenWrapper\Tests;

final class TestRunner
{
    private int $passed = 0;
    private int $failed = 0;

    public function run(string $name, callable $fn): void
    {
        try {
            $fn();
            $this->passed++;
            echo "ok - {$name}\n";
        } catch (\Throwable $e) {
            $this->failed++;
            echo "NOT OK - {$name}\n";
            echo '    ' . get_class($e) . ': ' . $e->getMessage() . "\n";
        }
    }

    public function summary(): int
    {
        $total = $this->passed + $this->failed;
        echo "\n{$this->passed}/{$total} passed\n";
        return $this->failed === 0 ? 0 : 1;
    }
}

function assertSame(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        $exp = var_export($expected, true);
        $act = var_export($actual, true);
        throw new \RuntimeException("{$message}\n  expected: {$exp}\n  actual:   {$act}");
    }
}

function assertTrue(bool $condition, string $message = 'expected true'): void
{
    if (!$condition) {
        throw new \RuntimeException($message);
    }
}

function assertInstanceOf(string $class, mixed $value, string $message = ''): void
{
    if (!($value instanceof $class)) {
        $actual = is_object($value) ? get_class($value) : gettype($value);
        throw new \RuntimeException("{$message} expected instance of {$class}, got {$actual}");
    }
}
