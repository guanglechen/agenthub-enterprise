package com.iflytek.skillhub.dto;

import java.util.List;
import java.util.Map;

public record AgentPlatformProfileResponse(
        String platformName,
        String displayName,
        String description,
        Map<String, Boolean> capabilities,
        List<String> supportedAssetTypes,
        List<String> supportedStages,
        List<String> supportedTopologies,
        List<String> supportedWorkflows,
        List<AgentPlatformBundleResponse> defaultBundles,
        List<String> onboardingSteps,
        List<String> recommendedEntrypoints,
        AgentPlatformAuthResponse auth
) {}
