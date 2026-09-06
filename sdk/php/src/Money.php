<?php

declare(strict_types=1);

namespace OpenWrapper;

final class Money
{
    /**
     * Safely converts major currency units (e.g. 10.50 or "10.50") into integer minor units (e.g. 1050)
     * avoiding floating-point rounding errors.
     */
    public static function toMinorUnits(float|int|string $amount, int $decimals = 2): int
    {
        if ($decimals === 0) {
            return (int) round((float) $amount);
        }
        $str = is_float($amount) ? number_format($amount, $decimals, '.', '') : trim((string) $amount);
        $isNegative = str_starts_with($str, '-');
        $clean = ltrim($str, '+-');
        $parts = explode('.', $clean, 2);
        $whole = (int) ($parts[0] !== '' ? $parts[0] : '0');
        $fracStr = str_pad(substr($parts[1] ?? '', 0, $decimals), $decimals, '0', STR_PAD_RIGHT);
        $frac = (int) $fracStr;
        $minor = $whole * (10 ** $decimals) + $frac;
        return $isNegative ? -$minor : $minor;
    }

    /**
     * Safely formats integer minor units into human-readable major currency units (e.g. 1050 -> "10.50").
     */
    public static function formatMajorUnits(int $minorUnits, int $decimals = 2): string
    {
        if ($decimals === 0) {
            return (string) $minorUnits;
        }
        $isNegative = $minorUnits < 0;
        $abs = abs($minorUnits);
        $factor = 10 ** $decimals;
        $whole = intdiv($abs, $factor);
        $fraction = str_pad((string) ($abs % $factor), $decimals, '0', STR_PAD_LEFT);
        return ($isNegative ? '-' : '') . "{$whole}.{$fraction}";
    }
}
