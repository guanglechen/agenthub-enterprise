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
        String installDirName,
        String installScope,
        String targetDir
) {
    public AgentInstallPlanSkillResponse(boolean required,
                                         String namespace,
                                         String slug,
                                         String displayName,
                                         String summary,
                                         SkillCatalogProfileResponse catalogProfile,
                                         double score,
                                         List<String> reasons,
                                         String downloadUrl,
                                         String installDirName) {
        this(required, namespace, slug, displayName, summary, catalogProfile, score, reasons, downloadUrl, installDirName, "workspace", "./.agent/skills");
    }
}
