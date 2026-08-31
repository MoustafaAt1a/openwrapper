<?php

declare(strict_types=1);

namespace OpenWrapper\Http;

/**
 * Default transport using PHP's built-in `curl` extension. Chosen over a
 * package like Guzzle per §21's dependency discipline: this SDK needs
 * "send a JSON request, read the status and body back" and nothing more —
 * `ext-curl` is a standard, widely-available PHP extension, not another
 * package with its own release cadence and transitive dependencies to
 * track.
 */
final class CurlHttpTransport implements HttpTransport
{
    public function send(string $method, string $url, array $headers, ?string $body, int $timeoutSeconds): TransportResponse
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('failed to initialize curl handle');
        }

        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = "{$name}: {$value}";
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $responseBody = curl_exec($ch);
        if ($responseBody === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException("curl request failed: {$error}");
        }
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return new TransportResponse($statusCode, (string) $responseBody);
    }
}
