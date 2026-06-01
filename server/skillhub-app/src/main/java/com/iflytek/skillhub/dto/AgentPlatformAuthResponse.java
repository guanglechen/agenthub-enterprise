package com.iflytek.skillhub.dto;

public record AgentPlatformAuthResponse(
        String tokenMode,
        boolean writeRequiresToken,
        String publishMode,
        String note
) {
    public AgentPlatformAuthResponse(String tokenMode, String note) {
        this(tokenMode, true, "token-required", note);
    }
}
