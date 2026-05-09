package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentPlatformBundleResponse(
        String bundleId,
        String title,
        String description,
        List<String> defaultAssetTypes,
        List<String> preferredStages,
        List<String> defaultTopologies
) {}
