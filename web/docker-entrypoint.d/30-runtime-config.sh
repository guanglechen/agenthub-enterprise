#!/bin/sh
set -eu

: "${SKILLHUB_WEB_API_BASE_URL:=}"
: "${SKILLHUB_PUBLIC_BASE_URL:=}"
: "${SKILLHUB_WEB_AUTH_OPEN_ACCESS_ENABLED:=false}"
: "${SKILLHUB_WEB_AUTH_DIRECT_ENABLED:=false}"
: "${SKILLHUB_WEB_AUTH_DIRECT_PROVIDER:=}"
: "${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_ENABLED:=false}"
: "${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_PROVIDER:=}"
: "${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_AUTO:=false}"
: "${SKILLHUB_WEB_BRAND_NAME:=HIKVISION AgentHub}"
: "${SKILLHUB_WEB_BRAND_ORG_NAME:=海康威视}"
: "${SKILLHUB_WEB_BRAND_LOGO_URL:=}"
: "${SKILLHUB_WEB_BRAND_TAGLINE:=内部研发资产分发平台}"
: "${SKILLHUB_WEB_BRAND_PRIMARY_COLOR:=#D7000F}"
: "${SKILLHUB_WEB_BRAND_ACCENT_COLOR:=#8F0E15}"

# Generate runtime-config.js
envsubst '${SKILLHUB_WEB_API_BASE_URL} ${SKILLHUB_PUBLIC_BASE_URL} ${SKILLHUB_WEB_AUTH_OPEN_ACCESS_ENABLED} ${SKILLHUB_WEB_AUTH_DIRECT_ENABLED} ${SKILLHUB_WEB_AUTH_DIRECT_PROVIDER} ${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_ENABLED} ${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_PROVIDER} ${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_AUTO} ${SKILLHUB_WEB_BRAND_NAME} ${SKILLHUB_WEB_BRAND_ORG_NAME} ${SKILLHUB_WEB_BRAND_LOGO_URL} ${SKILLHUB_WEB_BRAND_TAGLINE} ${SKILLHUB_WEB_BRAND_PRIMARY_COLOR} ${SKILLHUB_WEB_BRAND_ACCENT_COLOR}' \
  < /usr/share/nginx/html/runtime-config.js.template \
  > /usr/share/nginx/html/runtime-config.js

# Generate registry/skill.md with actual public URL
envsubst '${SKILLHUB_PUBLIC_BASE_URL}' \
  < /usr/share/nginx/html/registry/skill.md.template \
  > /usr/share/nginx/html/registry/skill.md

# Generate registry/claude-marketplace.json with actual public URL
envsubst '${SKILLHUB_PUBLIC_BASE_URL}' \
  < /usr/share/nginx/html/registry/claude-marketplace.json.template \
  > /usr/share/nginx/html/registry/claude-marketplace.json

# Generate llms.txt with actual public URL for AI Agent discovery
envsubst '${SKILLHUB_PUBLIC_BASE_URL}' \
  < /usr/share/nginx/html/llms.txt.template \
  > /usr/share/nginx/html/llms.txt
