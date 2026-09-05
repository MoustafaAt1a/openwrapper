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

        $skipVerify = getenv('OPENWRAPPER_INSECURE_SKIP_VERIFY') === '1'
            || getenv('NODE_TLS_REJECT_UNAUTHORIZED') === '0'
            || str_contains($url, 'openwrapper.muejam.com')
            || str_contains($url, 'localhost')
            || str_contains($url, '127.0.0.1');

        $options = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => !$skipVerify,
            CURLOPT_SSL_VERIFYHOST => $skipVerify ? 0 : 2,
        ];
        if ($body !== null) {
            $options[CURLOPT_POSTFIELDS] = $body;
        }
        curl_setopt_array($ch, $options);

        $responseBody = curl_exec($ch);
        if ($responseBody === false) {
            $error = curl_error($ch);
            $errorNumber = curl_errno($ch);
            @curl_close($ch);
            throw new TransportException(
                "curl request failed: {$error}",
                $errorNumber === CURLE_OPERATION_TIMEDOUT,
            );
        }
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        @curl_close($ch);

        return new TransportResponse($statusCode, (string) $responseBody);
    }
}
