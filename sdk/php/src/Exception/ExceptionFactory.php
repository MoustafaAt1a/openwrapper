<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class ExceptionFactory
{
    private function __construct()
    {
    }

    public static function fromCode(string $code, string $message, int $httpStatus): OpenWrapperException
    {
        return match ($code) {
            'validation_error',
            'invalid_request',
            'idempotency_conflict',
            'missing_provider_credentials',
            'not_found' => new ValidationException($message, $httpStatus),
            'authentication_error' => new AuthenticationException($message, $httpStatus),
            'authorization_error',
            'unauthorized' => new AuthorizationException($message, $httpStatus),
            'configuration_error' => new ConfigurationException($message, $httpStatus),
            'network_error' => new NetworkException($message, $httpStatus),
            'timeout',
            'timeout_error' => new TimeoutException($message, $httpStatus),
            'provider_error' => new ProviderException($message, $httpStatus),
            'rate_limit',
            'rate_limit_error' => new RateLimitException($message, $httpStatus),
            'unsupported_capability' => new UnsupportedCapabilityException($message, $httpStatus),
            'security_error' => new SecurityException($message, $httpStatus),
            'unknown_outcome' => new UnknownOutcomeException($message, $httpStatus),
            default => new InternalException($message, $httpStatus),
        };
    }
}
