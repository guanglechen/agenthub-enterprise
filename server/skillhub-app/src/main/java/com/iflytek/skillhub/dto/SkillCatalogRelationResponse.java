package com.iflytek.skillhub.dto;

public record SkillCatalogRelationResponse(
        String type,
        String target,
        String title,
        String note
) {}
