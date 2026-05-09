package com.iflytek.skillhub.dto;

import java.util.List;

public record SkillRelationsUpdateRequest(
        List<SkillCatalogRelationResponse> relations
) {}
