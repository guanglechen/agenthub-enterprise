package com.iflytek.skillhub.service;

import com.iflytek.skillhub.dto.AgentInstallPlanRequest;
import com.iflytek.skillhub.dto.AgentInstallPlanResponse;
import com.iflytek.skillhub.dto.SkillCatalogProfileResponse;
import com.iflytek.skillhub.dto.SkillCatalogRelationResponse;
import com.iflytek.skillhub.dto.SkillRecommendationResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AgentPlatformAppServiceTest {

    @Test
    void buildInstallPlanShouldPrioritizeContextAssetTypeAndQualityHints() {
        SkillCatalogAppService skillCatalogAppService = mock(SkillCatalogAppService.class);
        AgentPlatformAppService service = new AgentPlatformAppService(skillCatalogAppService);

        when(skillCatalogAppService.recommendByContext(any(), eq("user-1"), eq(Map.of())))
                .thenReturn(List.of(
                        new SkillRecommendationResponse(
                                1L,
                                "team-ai",
                                "payment-service",
                                "Payment Service",
                                "Microservice baseline",
                                12L,
                                0,
                                Instant.parse("2026-05-09T00:00:00Z"),
                                new SkillCatalogProfileResponse(
                                        "microservice",
                                        "payment",
                                        "develop",
                                        "bff",
                                        List.of("spring-boot3", "maven"),
                                        "payments-domain",
                                        List.of("gateway"),
                                        "agent",
                                        List.of()
                                ),
                                0.93D,
                                List.of("same-domain", "shared-stack")
                        ),
                        new SkillRecommendationResponse(
                                2L,
                                "team-ai",
                                "quality-gate",
                                "Quality Gate",
                                "Quality baseline",
                                8L,
                                0,
                                Instant.parse("2026-05-08T00:00:00Z"),
                                new SkillCatalogProfileResponse(
                                        "quality",
                                        "payment",
                                        "test",
                                        "shared-lib",
                                        List.of("maven"),
                                        "qa-platform",
                                        List.of("self-test"),
                                        "agent",
                                        List.of()
                                ),
                                0.74D,
                                List.of("shared-stack")
                        ),
                        new SkillRecommendationResponse(
                                3L,
                                "team-ai",
                                "payment-integration",
                                "Payment Integration",
                                "Integration helper",
                                5L,
                                0,
                                Instant.parse("2026-05-07T00:00:00Z"),
                                new SkillCatalogProfileResponse(
                                        "integration",
                                        "payment",
                                        "develop",
                                        "bff",
                                        List.of("spring-boot3"),
                                        "platform",
                                        List.of("gateway"),
                                        "agent",
                                        List.of(new SkillCatalogRelationResponse(
                                                "recommendedWith",
                                                "@team-ai/payment-service",
                                                "Payment Service",
                                                "graph"
                                        ))
                                ),
                                0.61D,
                                List.of("related-by-graph")
                        )
                ));

        AgentInstallPlanResponse response = service.buildInstallPlan(
                new AgentInstallPlanRequest(
                        "payments",
                        "java",
                        "spring-boot3",
                        false,
                        "microservice",
                        "payment",
                        "develop",
                        "bff",
                        List.of("spring-boot3", "maven"),
                        List.of("gateway"),
                        "team-ai"
                ),
                "user-1",
                Map.of()
        );

        assertThat(response.workspaceContext().assetType()).isEqualTo("microservice");
        assertThat(response.requiredSkills())
                .extracting(item -> item.slug())
                .containsExactly("payment-service", "quality-gate");
        assertThat(response.recommendedSkills())
                .extracting(item -> item.slug())
                .containsExactly("payment-integration");
        assertThat(response.nextActions()).isNotEmpty();
        assertThat(response.platform().platformName()).isEqualTo("agenthub-enterprise");
        assertThat(response.platform().capabilities()).containsEntry("claudeCodeMarketplace", true);
        assertThat(response.platform().recommendedEntrypoints())
                .contains("agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json");
    }
}
