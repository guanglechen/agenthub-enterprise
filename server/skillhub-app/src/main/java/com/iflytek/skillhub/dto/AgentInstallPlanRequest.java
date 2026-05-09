package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentInstallPlanRequest(
        String workspaceName,
        String language,
        String framework,
        Boolean newProject,
        String assetType,
        String domain,
        String stage,
        String topology,
        List<String> stack,
        List<String> keywords,
        String namespace
) {}
