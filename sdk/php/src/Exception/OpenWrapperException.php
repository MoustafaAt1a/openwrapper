<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

/**
 * Base class for every exception this SDK throws. Mirrors
 * `core::error::OpenWrapperError`'s stable `code()` values (§14) — catch
 * the specific subclass (or switch on `::code()`) to branch on error
 * category; `getMessage()` is documentation-quality text for logs/humans,
 * not a contract.
 */
abstract class OpenWrapperException extends \RuntimeException
{
    public function __construct(string $message, public readonly int $httpStatus)
    {
        parent::__construct($message);
    }

    abstract public function code(): string;
}
