package com.iflytek.skillhub.dto;

import java.util.List;

public record SkillRecommendationContextRequest(
        String assetType,
        String domain,
        String stage,
        String topology,
        List<String> stack,
        List<String> keywords,
        String namespace
) {}
