package com.iflytek.skillhub.dto;

import java.util.List;

public record SkillCatalogUpsertRequest(
        String assetType,
        String domain,
        String stage,
        String topology,
        List<String> stack,
        String ownerTeam,
        List<String> keywords,
        String maintenanceMode,
        List<SkillCatalogRelationResponse> relations
) {}
