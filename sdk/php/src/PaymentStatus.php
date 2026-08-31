<?php

declare(strict_types=1);

namespace OpenWrapper;

/**
 * The four payment states OpenWrapper models — see docs/STATE_MACHINE.md.
 * `Unknown` is a first-class outcome, not an error: a timeout or other
 * ambiguous provider result is represented here rather than guessed into
 * `Failed` (invariant I5).
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Unknown = 'unknown';
}
