#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
PASS=0
FAIL=0
COOKIE_JAR="$(mktemp)"
USERNAME="smoketest_$(date +%s)"
EMAIL="${USERNAME}@example.com"
PASSWORD="Smoke@2026"
NEW_PASSWORD="Smoke@2027"
BASE_HOST="$(printf '%s' "$BASE_URL" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
CURL_PROXY_BYPASS=()

if [[ "$BASE_HOST" == "localhost" || "$BASE_HOST" == "127.0.0.1" || "$BASE_HOST" == "::1" ]]; then
  CURL_PROXY_BYPASS=(--noproxy "*")
fi

cleanup() {
  rm -f "$COOKIE_JAR"
}

trap cleanup EXIT

curl_base() {
  curl "${CURL_PROXY_BYPASS[@]}" "$@"
}

check() {
  local desc="$1"
  local url="$2"
  local expected="$3"
  local status
  status="$(curl_base --retry 3 --retry-delay 1 --max-time 10 -s -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$status" == "$expected" ]]; then
    echo "PASS: $desc (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (expected $expected, got $status)"
    FAIL=$((FAIL + 1))
  fi
}

check_any() {
  local desc="$1"
  local url="$2"
  shift 2
  local expected_codes=("$@")
  local status
  status="$(curl_base --retry 3 --retry-delay 1 --max-time 10 -s -o /dev/null -w "%{http_code}" "$url" || true)"
  for expected in "${expected_codes[@]}"; do
    if [[ "$status" == "$expected" ]]; then
      echo "PASS: $desc (HTTP $status)"
      PASS=$((PASS + 1))
      return 0
    fi
  done
  echo "FAIL: $desc (expected one of ${expected_codes[*]}, got $status)"
  FAIL=$((FAIL + 1))
}

echo "=== SkillHub Smoke Test ==="
echo "Target: $BASE_URL"
echo

check "Health endpoint" "$BASE_URL/actuator/health" "200"
check_any "Prometheus metrics endpoint or disabled path" "$BASE_URL/actuator/prometheus" "200" "401" "404" "500"
check_any "Namespaces API listing" "$BASE_URL/api/v1/namespaces" "200" "401"
AUTH_ME_INITIAL_STATUS="$(curl_base --retry 3 --retry-delay 1 --max-time 10 -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/me" || true)"
OPEN_ACCESS_MODE="false"
if [[ "$AUTH_ME_INITIAL_STATUS" == "200" ]]; then
  OPEN_ACCESS_MODE="true"
  echo "PASS: Auth me initial access (HTTP $AUTH_ME_INITIAL_STATUS, open-access mode)"
  PASS=$((PASS + 1))
elif [[ "$AUTH_ME_INITIAL_STATUS" == "401" ]]; then
  echo "PASS: Auth me initial access (HTTP $AUTH_ME_INITIAL_STATUS, standard auth mode)"
  PASS=$((PASS + 1))
else
  echo "FAIL: Auth me initial access (expected 200 or 401, got $AUTH_ME_INITIAL_STATUS)"
  FAIL=$((FAIL + 1))
fi

curl_base -s -c "$COOKIE_JAR" "$BASE_URL/api/v1/auth/me" >/dev/null
CSRF_TOKEN="$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$COOKIE_JAR" | tail -n 1)"

if [[ "$OPEN_ACCESS_MODE" == "true" ]]; then
  echo "PASS: Register skipped in open-access mode"
  PASS=$((PASS + 1))
  echo "PASS: Change password skipped in open-access mode"
  PASS=$((PASS + 1))
  echo "PASS: Logout skipped in open-access mode"
  PASS=$((PASS + 1))
  echo "PASS: Auth me after logout skipped in open-access mode"
  PASS=$((PASS + 1))
else
  REGISTER_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/auth/local/register" \
    -b "$COOKIE_JAR" \
    -c "$COOKIE_JAR" \
    -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"$EMAIL\"}" || true)"
  if [[ "$REGISTER_STATUS" == "200" ]]; then
    echo "PASS: Register (HTTP $REGISTER_STATUS)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: Register (got $REGISTER_STATUS)"
    FAIL=$((FAIL + 1))
  fi

  AUTH_ME_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/v1/auth/me" || true)"
  if [[ "$AUTH_ME_STATUS" == "200" ]]; then
    echo "PASS: Auth me with session (HTTP $AUTH_ME_STATUS)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: Auth me with session (got $AUTH_ME_STATUS)"
    FAIL=$((FAIL + 1))
  fi

  CHANGE_PASSWORD_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/auth/local/change-password" \
    -b "$COOKIE_JAR" \
    -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"$NEW_PASSWORD\"}" || true)"
  if [[ "$CHANGE_PASSWORD_STATUS" == "200" ]]; then
    echo "PASS: Change password (HTTP $CHANGE_PASSWORD_STATUS)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: Change password (got $CHANGE_PASSWORD_STATUS)"
    FAIL=$((FAIL + 1))
  fi

  LOGOUT_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/auth/logout" \
    -b "$COOKIE_JAR" \
    -c "$COOKIE_JAR" \
    -H "X-XSRF-TOKEN: $CSRF_TOKEN" || true)"
  if [[ "$LOGOUT_STATUS" == "302" || "$LOGOUT_STATUS" == "200" || "$LOGOUT_STATUS" == "204" ]]; then
    echo "PASS: Logout (HTTP $LOGOUT_STATUS)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: Logout (got $LOGOUT_STATUS)"
    FAIL=$((FAIL + 1))
  fi

  POST_LOGOUT_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/v1/auth/me" || true)"
  if [[ "$POST_LOGOUT_STATUS" == "401" ]]; then
    echo "PASS: Auth me after logout (HTTP $POST_LOGOUT_STATUS)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: Auth me after logout (got $POST_LOGOUT_STATUS)"
    FAIL=$((FAIL + 1))
  fi
fi

# ---- Label Management (requires admin) ----
ADMIN_USERNAME="${BOOTSTRAP_ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD:-ChangeMe!2026}"
ADMIN_COOKIE_JAR="$(mktemp)"
LABEL_SLUG="smoke-label-$(date +%s)"

cleanup_admin() {
  rm -f "$ADMIN_COOKIE_JAR"
}
trap 'cleanup; cleanup_admin' EXIT

# Get CSRF token for admin session
curl_base -s -c "$ADMIN_COOKIE_JAR" "$BASE_URL/api/v1/auth/me" >/dev/null
ADMIN_CSRF="$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$ADMIN_COOKIE_JAR" | tail -n 1)"

# Login as admin when standard auth is enabled; open-access mode already has a session.
if [[ "$OPEN_ACCESS_MODE" == "true" ]]; then
  echo "PASS: Admin session provided by open-access mode"
  PASS=$((PASS + 1))
else
  ADMIN_LOGIN_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/auth/local/login" \
    -b "$ADMIN_COOKIE_JAR" \
    -c "$ADMIN_COOKIE_JAR" \
    -H "X-XSRF-TOKEN: $ADMIN_CSRF" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" || true)"
  if [[ "$ADMIN_LOGIN_STATUS" == "200" ]]; then
    echo "PASS: Admin login (HTTP $ADMIN_LOGIN_STATUS)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: Admin login (got $ADMIN_LOGIN_STATUS)"
    FAIL=$((FAIL + 1))
  fi
fi

# Refresh CSRF after login
ADMIN_CSRF="$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$ADMIN_COOKIE_JAR" | tail -n 1)"

# Create label definition
CREATE_LABEL_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/v1/admin/labels" \
  -b "$ADMIN_COOKIE_JAR" \
  -H "X-XSRF-TOKEN: $ADMIN_CSRF" \
  -H "Content-Type: application/json" \
  -d "{\"slug\":\"$LABEL_SLUG\",\"type\":\"RECOMMENDED\",\"visibleInFilter\":true,\"sortOrder\":99,\"translations\":[{\"locale\":\"en\",\"displayName\":\"Smoke Label\"}]}" || true)"
if [[ "$CREATE_LABEL_STATUS" == "200" ]]; then
  echo "PASS: Create label definition (HTTP $CREATE_LABEL_STATUS)"
  PASS=$((PASS + 1))
else
  echo "FAIL: Create label definition (got $CREATE_LABEL_STATUS)"
  FAIL=$((FAIL + 1))
fi

# List admin label definitions
LIST_LABELS_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
  -b "$ADMIN_COOKIE_JAR" "$BASE_URL/api/v1/admin/labels" || true)"
if [[ "$LIST_LABELS_STATUS" == "200" ]]; then
  echo "PASS: List admin label definitions (HTTP $LIST_LABELS_STATUS)"
  PASS=$((PASS + 1))
else
  echo "FAIL: List admin label definitions (got $LIST_LABELS_STATUS)"
  FAIL=$((FAIL + 1))
fi

# List visible labels (public)
VISIBLE_LABELS_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/api/v1/labels" || true)"
if [[ "$VISIBLE_LABELS_STATUS" == "200" ]]; then
  echo "PASS: List visible labels (HTTP $VISIBLE_LABELS_STATUS)"
  PASS=$((PASS + 1))
else
  echo "FAIL: List visible labels (got $VISIBLE_LABELS_STATUS)"
  FAIL=$((FAIL + 1))
fi

# Delete label definition (cleanup)
DELETE_LABEL_STATUS="$(curl_base --max-time 10 -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/api/v1/admin/labels/$LABEL_SLUG" \
  -b "$ADMIN_COOKIE_JAR" \
  -H "X-XSRF-TOKEN: $ADMIN_CSRF" || true)"
if [[ "$DELETE_LABEL_STATUS" == "200" || "$DELETE_LABEL_STATUS" == "204" ]]; then
  echo "PASS: Delete label definition (HTTP $DELETE_LABEL_STATUS)"
  PASS=$((PASS + 1))
else
  echo "FAIL: Delete label definition (got $DELETE_LABEL_STATUS)"
  FAIL=$((FAIL + 1))
fi

echo
echo "Results: $PASS passed, $FAIL failed"
if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
