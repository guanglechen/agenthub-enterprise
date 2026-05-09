package com.iflytek.skillhub.dto;

public record SkillRelatedSkillResponse(
        String type,
        String target,
        String title,
        String note,
        boolean resolved,
        Long skillId,
        String namespace,
        String slug,
        String displayName,
        String summary,
        SkillCatalogProfileResponse catalogProfile
) {}
