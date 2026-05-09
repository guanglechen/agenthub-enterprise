package com.iflytek.skillhub.dto;

import java.time.Instant;
import java.util.List;

public record SkillRecommendationResponse(
        Long skillId,
        String namespace,
        String slug,
        String displayName,
        String summary,
        Long downloadCount,
        Integer starCount,
        Instant updatedAt,
        SkillCatalogProfileResponse catalogProfile,
        double score,
        List<String> reasons
) {}
