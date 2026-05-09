package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentPlatformProfileResponse(
        String platformName,
        String displayName,
        String description,
        List<String> supportedAssetTypes,
        List<String> supportedStages,
        List<String> supportedTopologies,
        List<String> supportedWorkflows,
        List<AgentPlatformBundleResponse> defaultBundles,
        List<String> onboardingSteps
) {}
