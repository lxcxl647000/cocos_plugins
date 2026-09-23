#!/usr/bin/env bash
#
# fetch-admob-ios-sdk.sh
#
# Downloads and unpacks the Google Mobile Ads SDK and the User Messaging
# Platform (UMP) SDK for iOS. These are NOT vendored in this repository
# (the GoogleMobileAds.xcframework payload alone is tens of megabytes) —
# run this script once before building the iOS target, or let
# BuildTaskiOS.ts's assertFrameworksPresent() remind you when it's missing.
#
# Sources are Google's own dl.google.com CDN, at the exact URLs published
# in the official CocoaPods trunk podspecs for these versions (i.e. the
# same artifacts `pod install` would fetch). Checksums below were computed
# locally with `shasum -a 256` against a real download of each archive —
# never invented.
#
# Usage:
#   bash scripts/fetch-admob-ios-sdk.sh
#
# Re-running is safe: if the destination already looks populated, you'll
# be asked before it's wiped and re-fetched.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="${SCRIPT_DIR}/../template/ios/admob"

GMA_VERSION="13.7.0"
GMA_URL="https://dl.google.com/dl/cpdc/576021167d8c9fe6/Google-Mobile-Ads-SDK-${GMA_VERSION}.tar.gz"
GMA_SHA256="ff4e62ec415f5dc03c6ca43eb245345f1d88cf4363427f4a8c7fb261849e5e69"

UMP_VERSION="3.1.0"
UMP_URL="https://dl.google.com/dl/cpdc/70c87bb94f697e08/GoogleUserMessagingPlatform-${UMP_VERSION}.tar.gz"
UMP_SHA256="c93e88291d7d27afb3abc2c79c37861d9958df8599732e893cb53f476761fd42"

GMA_FRAMEWORK_NAME="GoogleMobileAds.xcframework"
UMP_FRAMEWORK_NAME="UserMessagingPlatform.xcframework"

log() { printf '[fetch-admob-ios-sdk] %s\n' "$1"; }
die() { printf '[fetch-admob-ios-sdk] ERROR: %s\n' "$1" >&2; exit 1; }

for tool in curl shasum tar; do
    command -v "$tool" >/dev/null 2>&1 || die "required tool '$tool' not found on PATH."
done

WORK_DIR="$(mktemp -d)"
cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

if [ -d "${DEST_DIR}/${GMA_FRAMEWORK_NAME}" ] || [ -d "${DEST_DIR}/${UMP_FRAMEWORK_NAME}" ]; then
    log "Existing SDK payload found under: ${DEST_DIR}"
    read -r -p "Re-download and overwrite it? [y/N] " confirm
    case "$confirm" in
        y|Y|yes|YES) ;;
        *) log "Aborted; existing payload left untouched."; exit 0 ;;
    esac
    rm -rf "${DEST_DIR:?}/${GMA_FRAMEWORK_NAME}" "${DEST_DIR:?}/${UMP_FRAMEWORK_NAME}"
fi

mkdir -p "$DEST_DIR"

fetch_and_verify() {
    local url="$1" expected_sha256="$2" out_file="$3"
    log "Downloading $(basename "$out_file")..."
    curl --fail --location --silent --show-error -o "$out_file" "$url" \
        || die "download failed: $url"

    local actual_sha256
    actual_sha256="$(shasum -a 256 "$out_file" | awk '{print $1}')"
    if [ "$actual_sha256" != "$expected_sha256" ]; then
        die "checksum mismatch for $(basename "$out_file"): expected ${expected_sha256}, got ${actual_sha256}. Refusing to unpack a payload that doesn't match the pinned version — Google may have rotated the artifact, or the download was corrupted/tampered with."
    fi
    log "Checksum OK: $(basename "$out_file")"
}

GMA_ARCHIVE="${WORK_DIR}/gma.tar.gz"
UMP_ARCHIVE="${WORK_DIR}/ump.tar.gz"

fetch_and_verify "$GMA_URL" "$GMA_SHA256" "$GMA_ARCHIVE"
fetch_and_verify "$UMP_URL" "$UMP_SHA256" "$UMP_ARCHIVE"

GMA_EXTRACT_DIR="${WORK_DIR}/gma"
UMP_EXTRACT_DIR="${WORK_DIR}/ump"
mkdir -p "$GMA_EXTRACT_DIR" "$UMP_EXTRACT_DIR"

log "Unpacking Google Mobile Ads SDK ${GMA_VERSION}..."
tar -xzf "$GMA_ARCHIVE" -C "$GMA_EXTRACT_DIR"

log "Unpacking User Messaging Platform SDK ${UMP_VERSION}..."
tar -xzf "$UMP_ARCHIVE" -C "$UMP_EXTRACT_DIR"

GMA_XCFRAMEWORK_SRC="$(find "$GMA_EXTRACT_DIR" -maxdepth 3 -type d -name "$GMA_FRAMEWORK_NAME" | head -n 1)"
UMP_XCFRAMEWORK_SRC="$(find "$UMP_EXTRACT_DIR" -maxdepth 3 -type d -name "$UMP_FRAMEWORK_NAME" | head -n 1)"

[ -n "$GMA_XCFRAMEWORK_SRC" ] || die "could not find ${GMA_FRAMEWORK_NAME} inside the downloaded GMA archive; Google may have restructured the release."
[ -n "$UMP_XCFRAMEWORK_SRC" ] || die "could not find ${UMP_FRAMEWORK_NAME} inside the downloaded UMP archive; Google may have restructured the release."

# Copy the whole xcframework bundle wholesale (both device and simulator
# slices) — a `tar -tzf` listing of the archive confirms both slices carry a
# matching header set, so there is nothing to selectively prune here.
cp -R "$GMA_XCFRAMEWORK_SRC" "${DEST_DIR}/${GMA_FRAMEWORK_NAME}"
cp -R "$UMP_XCFRAMEWORK_SRC" "${DEST_DIR}/${UMP_FRAMEWORK_NAME}"

log "Done. Installed:"
log "  ${DEST_DIR}/${GMA_FRAMEWORK_NAME} (Google Mobile Ads SDK ${GMA_VERSION})"
log "  ${DEST_DIR}/${UMP_FRAMEWORK_NAME} (User Messaging Platform SDK ${UMP_VERSION})"
log "Both directories are .gitignore'd — they are fetched on demand, never committed."
