package com.iflytek.skillhub.dto;

public record AgentInstallPlanCommandResponse(
        String run,
        String reason,
        boolean required
) {}
