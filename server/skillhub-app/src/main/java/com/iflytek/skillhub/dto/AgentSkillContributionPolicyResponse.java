package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentSkillContributionPolicyResponse(
        boolean inferCatalogProfileBeforePublish,
        boolean inferLabelsBeforePublish,
        boolean requireDisplayedContributor,
        List<String> contributionSteps,
        List<String> attributionResolutionOrder,
        String missingContributorAction,
        List<String> recommendedPublishCommands
) {}
