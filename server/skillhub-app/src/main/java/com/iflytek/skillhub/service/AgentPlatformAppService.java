package com.iflytek.skillhub.service;

import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.dto.AgentInstallPlanRequest;
import com.iflytek.skillhub.dto.AgentInstallPlanResponse;
import com.iflytek.skillhub.dto.AgentInstallPlanSkillResponse;
import com.iflytek.skillhub.dto.AgentPlatformBundleResponse;
import com.iflytek.skillhub.dto.AgentPlatformProfileResponse;
import com.iflytek.skillhub.dto.AgentWorkspaceContextResponse;
import com.iflytek.skillhub.dto.SkillRecommendationContextRequest;
import com.iflytek.skillhub.dto.SkillRecommendationResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AgentPlatformAppService {
    private static final AgentPlatformProfileResponse PLATFORM_PROFILE = new AgentPlatformProfileResponse(
            "agenthub-enterprise",
            "AgentHub Enterprise",
            "Enterprise AI development asset center for product blueprints, scaffolds, microservice skills, quality gates, and platform integrations.",
            List.of("product", "scaffold", "business", "microservice", "quality", "integration"),
            List.of("discover", "bootstrap", "develop", "test", "release", "operate"),
            List.of("crud-api", "bff", "event-consumer", "batch", "shared-lib"),
            List.of(
                    "connect-platform",
                    "discover-assets",
                    "install-required-skills",
                    "run-quality-baseline"
            ),
            List.of(
                    new AgentPlatformBundleResponse(
                            "java-microservice-baseline",
                            "Java Microservice Baseline",
                            "Recommended when a Java service needs a scaffold, service development skills, and reusable quality checks.",
                            List.of("scaffold", "microservice", "quality"),
                            List.of("bootstrap", "develop", "test"),
                            List.of("crud-api", "bff", "event-consumer")
                    ),
                    new AgentPlatformBundleResponse(
                            "quality-gate-baseline",
                            "Quality Gate Baseline",
                            "Recommended for repositories that need shared self-test, review, and release guardrail skills.",
                            List.of("quality", "integration"),
                            List.of("test", "release", "operate"),
                            List.of("crud-api", "bff", "event-consumer", "batch", "shared-lib")
                    )
            ),
            List.of(
                    "Call /api/v1/agent/profile first so the agent understands the platform purpose and default workflows.",
                    "Build an install plan from workspace context before searching assets ad hoc.",
                    "Install required skills into .claude/skills, then review recommended skills before opening a PR."
            )
    );

    private final SkillCatalogAppService skillCatalogAppService;

    public AgentPlatformAppService(SkillCatalogAppService skillCatalogAppService) {
        this.skillCatalogAppService = skillCatalogAppService;
    }

    public AgentPlatformProfileResponse getPlatformProfile() {
        return PLATFORM_PROFILE;
    }

    public AgentInstallPlanResponse buildInstallPlan(AgentInstallPlanRequest request,
                                                     String userId,
                                                     Map<Long, NamespaceRole> userNsRoles) {
        AgentWorkspaceContextResponse context = normalizeContext(request);
        List<SkillRecommendationResponse> recommendations = skillCatalogAppService.recommendByContext(
                new SkillRecommendationContextRequest(
                        context.assetType(),
                        context.domain(),
                        context.stage(),
                        context.topology(),
                        context.stack(),
                        context.keywords(),
                        context.namespace()
                ),
                userId,
                userNsRoles != null ? userNsRoles : Map.of()
        );

        LinkedHashMap<String, SkillRecommendationResponse> deduplicated = new LinkedHashMap<>();
        for (SkillRecommendationResponse recommendation : recommendations) {
            deduplicated.putIfAbsent(recommendation.namespace() + "/" + recommendation.slug(), recommendation);
        }

        LinkedHashSet<String> requiredAssetTypes = determineRequiredAssetTypes(context);
        List<AgentInstallPlanSkillResponse> requiredSkills = new ArrayList<>();
        List<AgentInstallPlanSkillResponse> recommendedSkills = new ArrayList<>();
        Set<String> requiredCoordinates = new LinkedHashSet<>();

        for (SkillRecommendationResponse recommendation : deduplicated.values()) {
            String coordinate = recommendation.namespace() + "/" + recommendation.slug();
            boolean required = isRequiredRecommendation(recommendation, context, requiredAssetTypes);
            AgentInstallPlanSkillResponse item = toInstallItem(recommendation, required);
            if (required && requiredSkills.size() < 4) {
                requiredSkills.add(item);
                requiredCoordinates.add(coordinate);
            } else if (recommendedSkills.size() < 6) {
                recommendedSkills.add(item);
            }
        }

        if (requiredSkills.isEmpty() && !deduplicated.isEmpty()) {
            SkillRecommendationResponse fallback = deduplicated.values().iterator().next();
            requiredSkills.add(toInstallItem(fallback, true));
            requiredCoordinates.add(fallback.namespace() + "/" + fallback.slug());
            recommendedSkills.removeIf(item -> requiredCoordinates.contains(item.namespace() + "/" + item.slug()));
        }

        recommendedSkills.removeIf(item -> requiredCoordinates.contains(item.namespace() + "/" + item.slug()));

        return new AgentInstallPlanResponse(
                getPlatformProfile(),
                context,
                List.copyOf(requiredSkills),
                List.copyOf(recommendedSkills),
                buildNextActions(context, requiredSkills, recommendedSkills)
        );
    }

    private AgentWorkspaceContextResponse normalizeContext(AgentInstallPlanRequest request) {
        String workspaceName = normalizeText(request.workspaceName());
        String language = normalizeText(request.language());
        String framework = normalizeText(request.framework());
        boolean newProject = request.newProject() != null ? request.newProject() : false;
        List<String> stack = normalizeList(request.stack());
        if (framework != null && !framework.isBlank() && stack.stream().noneMatch(item -> item.equals(framework))) {
            stack = append(stack, framework);
        }
        String assetType = firstNonBlank(normalizeText(request.assetType()), defaultAssetType(newProject));
        String stage = firstNonBlank(normalizeText(request.stage()), newProject ? "bootstrap" : "develop");
        String topology = firstNonBlank(normalizeText(request.topology()), "crud-api");
        return new AgentWorkspaceContextResponse(
                workspaceName != null ? workspaceName : "current-workspace",
                language != null ? language : "unknown",
                framework,
                newProject,
                assetType,
                normalizeText(request.domain()),
                stage,
                topology,
                stack,
                normalizeList(request.keywords()),
                normalizeText(request.namespace())
        );
    }

    private LinkedHashSet<String> determineRequiredAssetTypes(AgentWorkspaceContextResponse context) {
        LinkedHashSet<String> required = new LinkedHashSet<>();
        if (context.assetType() != null) {
            required.add(context.assetType());
        }
        if (context.newProject()) {
            required.add("scaffold");
        }
        if (Set.of("bootstrap", "develop", "test", "release").contains(context.stage())) {
            required.add("quality");
        }
        return required;
    }

    private boolean isRequiredRecommendation(SkillRecommendationResponse recommendation,
                                             AgentWorkspaceContextResponse context,
                                             Set<String> requiredAssetTypes) {
        String candidateAssetType = recommendation.catalogProfile() != null
                ? normalizeText(recommendation.catalogProfile().assetType())
                : null;
        if (candidateAssetType == null) {
            return false;
        }
        if (context.assetType() != null && context.assetType().equals(candidateAssetType)) {
            return true;
        }
        return requiredAssetTypes.contains(candidateAssetType);
    }

    private AgentInstallPlanSkillResponse toInstallItem(SkillRecommendationResponse recommendation, boolean required) {
        return new AgentInstallPlanSkillResponse(
                required,
                recommendation.namespace(),
                recommendation.slug(),
                recommendation.displayName(),
                recommendation.summary(),
                recommendation.catalogProfile(),
                recommendation.score(),
                recommendation.reasons(),
                "/api/v1/skills/" + recommendation.namespace() + "/" + recommendation.slug() + "/download",
                recommendation.namespace() + "--" + recommendation.slug()
        );
    }

    private List<String> buildNextActions(AgentWorkspaceContextResponse context,
                                          List<AgentInstallPlanSkillResponse> requiredSkills,
                                          List<AgentInstallPlanSkillResponse> recommendedSkills) {
        List<String> actions = new ArrayList<>();
        if (requiredSkills.isEmpty() && recommendedSkills.isEmpty()) {
            actions.add("No skills matched the current workspace context. Publish a baseline skill package or broaden the install-plan filters.");
            actions.add("Retry install-plan with explicit assetType, topology, stack, or domain values.");
            return actions;
        }

        actions.add("Install required skills into .claude/skills before starting implementation.");
        if (!recommendedSkills.isEmpty()) {
            actions.add("Review recommended skills after the baseline is installed; keep only the ones matching the current workflow.");
        }
        actions.add("Run the repository self-test or quality-gate skills after installation and before creating a PR.");
        if (context.newProject()) {
            actions.add("Because this workspace is marked as newProject=true, start with scaffold and quality assets before adding domain-specific skills.");
        }
        return actions;
    }

    private List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            String text = normalizeText(value);
            if (text != null && !text.isBlank()) {
                normalized.add(text);
            }
        }
        return List.copyOf(normalized);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private String defaultAssetType(boolean newProject) {
        return newProject ? "scaffold" : "microservice";
    }

    private List<String> append(List<String> values, String item) {
        if (item == null || item.isBlank()) {
            return values;
        }
        List<String> updated = new ArrayList<>(values);
        updated.add(item);
        return normalizeList(updated);
    }
}
