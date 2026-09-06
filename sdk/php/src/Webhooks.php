<?php

declare(strict_types=1);

namespace OpenWrapper;

final class Webhooks
{
    public static function computeSignature(string $payload, string $secret, int $timestamp): string
    {
        return hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);
    }

    public static function verifySignature(
        string $payload,
        string $header,
        string $secret,
        int $toleranceSeconds = 300
    ): bool {
        if ($payload === '' || $header === '' || $secret === '') {
            return false;
        }

        $timestamp = null;
        $signatures = [];

        $items = explode(',', $header);
        foreach ($items as $item) {
            $parts = explode('=', trim($item), 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $val = trim($parts[1]);
                if ($key === 't' && is_numeric($val)) {
                    $timestamp = (int) $val;
                } elseif ($key === 'v1') {
                    $signatures[] = $val;
                }
            }
        }

        if ($timestamp === null || empty($signatures)) {
            return false;
        }

        if ($toleranceSeconds > 0) {
            $now = time();
            if (abs($now - $timestamp) > $toleranceSeconds) {
                return false;
            }
        }

        $expected = self::computeSignature($payload, $secret, $timestamp);

        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return true;
            }
        }

        return false;
    }
}
