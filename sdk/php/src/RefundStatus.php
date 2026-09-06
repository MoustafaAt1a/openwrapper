<?php

declare(strict_types=1);

namespace OpenWrapper;

enum RefundStatus: string
{
    case Succeeded = 'succeeded';
    case Pending = 'pending';
    case Failed = 'failed';
}
