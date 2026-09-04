//! Maps Fawry's `orderStatus` values (documented enum: NEW, PAID,
//! CANCELED, REFUNDED, EXPIRED, PARTIAL_REFUNDED, FAILED — see
//! research/fawry.md) onto OpenWrapper's four-state `PaymentStatus`.

use openwrapper_core::PaymentStatus;

pub fn map_order_status(status: &str) -> PaymentStatus {
    match status {
        "NEW" => PaymentStatus::Pending,
        "PAID" => PaymentStatus::Succeeded,
        "CANCELED" | "EXPIRED" | "FAILED" => PaymentStatus::Failed,
        // v0.1.0 has no Refund capability (§9) and therefore no state to
        // represent "succeeded, then later refunded" distinctly. Treating
        // these as Succeeded (the charge itself did complete) rather than
        // guessing Failed is the conservative choice — see
        // docs/LIMITATIONS.md.
        "REFUNDED" | "PARTIAL_REFUNDED" => PaymentStatus::Succeeded,
        // Any value not in the documented enum: do not guess. I5 forbids
        // treating an unrecognized/ambiguous signal as Failed.
        _ => PaymentStatus::Unknown,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unrecognized_status_is_unknown_not_failed() {
        assert_eq!(
            map_order_status("SOMETHING_NEW_FAWRY_ADDS"),
            PaymentStatus::Unknown
        );
    }

    #[test]
    fn documented_terminal_states_map_correctly() {
        assert_eq!(map_order_status("PAID"), PaymentStatus::Succeeded);
        assert_eq!(map_order_status("FAILED"), PaymentStatus::Failed);
        assert_eq!(map_order_status("EXPIRED"), PaymentStatus::Failed);
        assert_eq!(map_order_status("NEW"), PaymentStatus::Pending);
    }
}
