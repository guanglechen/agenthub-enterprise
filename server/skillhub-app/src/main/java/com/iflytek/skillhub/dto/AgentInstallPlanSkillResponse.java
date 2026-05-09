package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentInstallPlanSkillResponse(
        boolean required,
        String namespace,
        String slug,
        String displayName,
        String summary,
        SkillCatalogProfileResponse catalogProfile,
        double score,
        List<String> reasons,
        String downloadUrl,
        String installDirName
) {}
