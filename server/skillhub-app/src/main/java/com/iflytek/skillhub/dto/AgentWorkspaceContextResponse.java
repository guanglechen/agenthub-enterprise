package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentWorkspaceContextResponse(
        String workspaceName,
        String language,
        String framework,
        boolean newProject,
        String assetType,
        String domain,
        String stage,
        String topology,
        List<String> stack,
        List<String> keywords,
        String namespace
) {}
