//! Architecture tests: these check properties of the *codebase*, not its
//! runtime behavior. §24: "Do not only test functionality. Test
//! architecture itself... The repository should actively resist
//! architectural drift."
//!
//! Each test below is a concrete, automatable proxy for one of the
//! invariants in docs/ARCHITECTURE.md. They are deliberately simple
//! textual/structural checks over Cargo manifests and source files rather
//! than a custom static-analysis tool — proportionate tooling for a
//! single-developer-sized codebase (§17, §32).

use std::fs;
use std::path::{Path, PathBuf};

fn workspace_root() -> PathBuf {
    // tests/architecture/tests/ -> tests/architecture -> tests -> <root>
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn read(rel: &str) -> String {
    let path = workspace_root().join(rel);
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("could not read {path:?}: {e}"))
}

/// Recursively collects every `.rs` file under `rel_dir`.
fn rust_files_under(rel_dir: &str) -> Vec<PathBuf> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if path.file_name().and_then(|n| n.to_str()) == Some("target") {
                    continue;
                }
                walk(&path, out);
            } else if path.extension().and_then(|e| e.to_str()) == Some("rs") {
                out.push(path);
            }
        }
    }
    let mut out = vec![];
    walk(&workspace_root().join(rel_dir), &mut out);
    out
}

/// I1: "Core never depends on provider implementation." Checked two ways:
/// (a) core's own manifest declares no path/crate dependency on either
/// provider crate, and (b) the resolved dependency graph in `Cargo.lock`
/// — which captures *transitive* dependencies too — agrees. (a) alone
/// could pass while a transitive dependency sneaks the coupling in; (b)
/// alone wouldn't catch it as early or as readably in a diff, so both are
/// checked.
#[test]
fn core_manifest_declares_no_provider_dependency() {
    let manifest = read("crates/core/Cargo.toml");
    for forbidden in [
        "openwrapper-provider-paymob",
        "openwrapper-provider-fawry",
        "openwrapper-provider-stripe",
    ] {
        assert!(
            !manifest.contains(forbidden),
            "core/Cargo.toml must not depend on {forbidden} (invariant I1)"
        );
    }
}

#[test]
fn resolved_dependency_graph_confirms_core_has_no_provider_dependency() {
    let lock = read("Cargo.lock");
    let core_block = extract_package_block(&lock, "openwrapper-core")
        .expect("openwrapper-core must appear in Cargo.lock");
    for forbidden in [
        "openwrapper-provider-paymob",
        "openwrapper-provider-fawry",
        "openwrapper-provider-stripe",
    ] {
        assert!(
            !core_block.contains(forbidden),
            "openwrapper-core's resolved dependency list in Cargo.lock must not include {forbidden} (invariant I1)"
        );
    }
}

/// Layering check: provider adapters sit between core and the gateway.
/// A provider depending on the gateway would be a backwards/skip-level
/// dependency and is just as much a drift signal as core depending on a
/// provider.
#[test]
fn provider_crates_do_not_depend_on_the_gateway() {
    for provider_manifest in [
        "crates/providers/paymob/Cargo.toml",
        "crates/providers/fawry/Cargo.toml",
        "crates/providers/stripe/Cargo.toml",
    ] {
        let manifest = read(provider_manifest);
        assert!(
            !manifest.contains("openwrapper-gateway"),
            "{provider_manifest} must not depend on openwrapper-gateway"
        );
    }
}

fn extract_package_block<'a>(lock: &'a str, package_name: &str) -> Option<&'a str> {
    let marker = format!("name = \"{package_name}\"");
    let start_of_name_line = lock.find(&marker)?;
    let block_start = lock[..start_of_name_line].rfind("[[package]]")?;
    let rest = &lock[start_of_name_line..];
    let block_end = rest
        .find("\n[[package]]")
        .map(|i| start_of_name_line + i)
        .unwrap_or(lock.len());
    Some(&lock[block_start..block_end])
}

/// I8: "Sensitive secrets never enter logs." `expose_secret()` is the one
/// place a `Secret<String>`'s contents become a plain `&str` that *could*
/// be logged or displayed — so confining which files are allowed to call
/// it at all is a cheap, meaningful proxy for I8. Every current call site
/// is where a secret is legitimately used to build an outgoing
/// Authorization header or HMAC input, never inside error/webhook/log
/// code paths.
#[test]
fn secret_exposure_is_confined_to_known_call_sites() {
    let allowlist = [
        ("crates/providers/paymob/src/client.rs", 2),
        ("crates/providers/paymob/src/signature.rs", 1),
        ("crates/providers/fawry/src/signature.rs", 1),
        ("crates/providers/stripe/src/client.rs", 1),
        ("crates/providers/stripe/src/signature.rs", 1),
    ];

    for dir in [
        "crates/providers/paymob/src",
        "crates/providers/fawry/src",
        "crates/providers/stripe/src",
        "apps/gateway/src",
        "crates/core/src",
    ] {
        for file in rust_files_under(dir) {
            let contents = fs::read_to_string(&file).unwrap();
            if contents.contains("expose_secret") {
                let rel = file
                    .strip_prefix(workspace_root())
                    .unwrap()
                    .to_string_lossy()
                    .replace('\\', "/");
                let expected_count = allowlist
                    .iter()
                    .find_map(|(allowed_path, count)| (*allowed_path == rel).then_some(*count))
                    .unwrap_or_else(|| {
                        panic!(
                            "{rel} calls expose_secret() but is not in the reviewed allowlist \
                             for where secret material may be unwrapped (invariant I8). If this is \
                             a legitimate new call site, add it to the allowlist as part of the \
                             same review that introduces it."
                        )
                    });
                let actual_count = contents.matches("expose_secret()").count();
                assert_eq!(
                    actual_count, expected_count,
                    "{rel} has {actual_count} secret exposures; expected exactly {expected_count}. \
                     Review every new exposure before changing this count (invariant I8)."
                );
            }
        }
    }
}

/// I9: SDKs must not embed provider secret *configuration* in source.
/// Stateless per-request credential forwarding via HTTP headers is
/// allowed only in the reviewed client entrypoints below — see
/// docs/SECURITY.md and OpenAPI credential header documentation.
#[test]
fn sdk_sources_never_reference_provider_secret_field_names() {
    let allowlist = [
        "sdk/typescript/src/client.ts",
        "sdk/php/src/OpenWrapperClient.php",
    ];
    let forbidden = ["hmac_secret", "secure_key", "secret_key"];

    fn walk_sdk_files(dir: &Path, out: &mut Vec<PathBuf>) {
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk_sdk_files(&path, out);
            } else if path.extension().and_then(|e| e.to_str()) == Some("ts")
                || path.extension().and_then(|e| e.to_str()) == Some("php")
                || path.extension().and_then(|e| e.to_str()) == Some("cs")
            {
                out.push(path);
            }
        }
    }

    let root = workspace_root();
    let mut files = vec![];
    for sdk_dir in ["sdk/typescript/src", "sdk/php/src", "sdk/dotnet/src"] {
        walk_sdk_files(&root.join(sdk_dir), &mut files);
    }

    for path in files {
        let rel = path
            .strip_prefix(&root)
            .unwrap()
            .to_string_lossy()
            .replace('\\', "/");
        if allowlist.contains(&rel.as_str()) {
            continue;
        }
        let contents = fs::read_to_string(&path).unwrap_or_default();
        for word in forbidden {
            assert!(
                !contents.to_lowercase().contains(word),
                "{path:?} references '{word}', which should never appear outside the \
                 reviewed stateless-credential client entrypoints (invariant I9)"
            );
        }
    }
}

/// I13 proxy at the source level: `payments` table status is only ever
/// written through the small set of methods that go through
/// `validate_transition` / a documented terminal-state helper — never via
/// an ad-hoc `UPDATE payments SET status` scattered elsewhere in the
/// codebase. (The `store/` module — both the SQLite and Postgres
/// backends — is the only place allowed to touch the table at all.)
#[test]
fn only_the_store_module_issues_sql_against_the_payments_table() {
    for file in rust_files_under("apps/gateway/src") {
        let rel = file
            .strip_prefix(workspace_root())
            .unwrap()
            .to_string_lossy()
            .replace('\\', "/");
        if rel.starts_with("apps/gateway/src/store/") {
            continue;
        }
        let contents = fs::read_to_string(&file).unwrap();
        assert!(
            !contents.to_uppercase().contains("UPDATE PAYMENTS")
                && !contents.to_uppercase().contains("INSERT INTO PAYMENTS"),
            "{file:?} writes to the payments table directly — all payment state writes must \
             go through store/{{sqlite,postgres}}.rs's transition-validated methods (I13)"
        );
    }
}
