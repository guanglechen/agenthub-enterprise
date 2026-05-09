package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentInstallPlanResponse(
        AgentPlatformProfileResponse platform,
        AgentWorkspaceContextResponse workspaceContext,
        List<AgentInstallPlanSkillResponse> requiredSkills,
        List<AgentInstallPlanSkillResponse> recommendedSkills,
        List<String> nextActions
) {}
