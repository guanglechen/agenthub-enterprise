package com.iflytek.skillhub.service;

import com.iflytek.skillhub.auth.rbac.RbacService;
import com.iflytek.skillhub.domain.audit.AuditLogService;
import com.iflytek.skillhub.domain.catalog.SkillCatalogProfileService;
import com.iflytek.skillhub.domain.label.SkillLabelRepository;
import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.namespace.NamespaceRepository;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillRepository;
import com.iflytek.skillhub.domain.skill.SkillVisibility;
import com.iflytek.skillhub.domain.skill.VisibilityChecker;
import com.iflytek.skillhub.domain.skill.service.SkillSlugResolutionService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SkillCatalogAppServiceTest {

    @Test
    void getRecommendationsShouldPrioritizeGraphRelatedTargets() {
        NamespaceRepository namespaceRepository = mock(NamespaceRepository.class);
        SkillRepository skillRepository = mock(SkillRepository.class);
        VisibilityChecker visibilityChecker = mock(VisibilityChecker.class);
        SkillCatalogProfileService skillCatalogProfileService = mock(SkillCatalogProfileService.class);
        SkillSlugResolutionService skillSlugResolutionService = mock(SkillSlugResolutionService.class);
        SkillLabelRepository skillLabelRepository = mock(SkillLabelRepository.class);
        RbacService rbacService = mock(RbacService.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        LabelSearchSyncService labelSearchSyncService = mock(LabelSearchSyncService.class);

        SkillCatalogAppService service = new SkillCatalogAppService(
                namespaceRepository,
                skillRepository,
                visibilityChecker,
                skillCatalogProfileService,
                skillSlugResolutionService,
                skillLabelRepository,
                rbacService,
                auditLogService,
                labelSearchSyncService
        );

        Namespace sourceNamespace = new Namespace("team-a", "Team A", "owner");
        ReflectionTestUtils.setField(sourceNamespace, "id", 10L);
        Namespace otherNamespace = new Namespace("team-b", "Team B", "owner");
        ReflectionTestUtils.setField(otherNamespace, "id", 11L);

        Skill sourceSkill = new Skill(10L, "agent-cli-skill", "owner", SkillVisibility.PUBLIC);
        ReflectionTestUtils.setField(sourceSkill, "id", 1L);
        sourceSkill.setDisplayName("Agent CLI Skill");
        ReflectionTestUtils.setField(sourceSkill, "updatedAt", Instant.parse("2026-05-09T00:00:00Z"));

        Skill relationTarget = new Skill(10L, "payment-base-skill", "owner", SkillVisibility.PUBLIC);
        ReflectionTestUtils.setField(relationTarget, "id", 2L);
        relationTarget.setDisplayName("Payment Base Skill");
        ReflectionTestUtils.setField(relationTarget, "updatedAt", Instant.parse("2026-05-09T00:00:00Z"));

        Skill similarCandidate = new Skill(11L, "agent-cli-skill", "owner", SkillVisibility.PUBLIC);
        ReflectionTestUtils.setField(similarCandidate, "id", 3L);
        similarCandidate.setDisplayName("Agent CLI Skill");
        ReflectionTestUtils.setField(similarCandidate, "updatedAt", Instant.parse("2026-05-09T00:00:00Z"));

        when(namespaceRepository.findBySlug("team-a")).thenReturn(Optional.of(sourceNamespace));
        when(skillSlugResolutionService.resolve(eq(10L), eq("agent-cli-skill"), eq(null), eq(SkillSlugResolutionService.Preference.PUBLISHED)))
                .thenReturn(sourceSkill);
        when(skillRepository.findAll()).thenReturn(List.of(sourceSkill, relationTarget, similarCandidate));
        when(namespaceRepository.findByIdIn(List.of(10L, 11L))).thenReturn(List.of(sourceNamespace, otherNamespace));
        when(skillLabelRepository.findBySkillIdIn(any())).thenReturn(List.of());
        when(visibilityChecker.canAccess(any(Skill.class), eq(null), eq(Map.of()))).thenReturn(true);
        when(skillCatalogProfileService.resolveForSkill(sourceSkill)).thenReturn(new SkillCatalogProfileService.CatalogProfileView(
                "business",
                "order",
                "release",
                "batch",
                List.of("java21", "maven", "harness"),
                "agent-ops",
                List.of("fulfillment"),
                "agent",
                List.of(new SkillCatalogProfileService.CatalogRelation(
                        "recommendedWith",
                        "@team-a/payment-base-skill",
                        "Payment Base Skill",
                        "graph"
                ))
        ));
        when(skillCatalogProfileService.resolveForSkills(any())).thenReturn(Map.of(
                2L, new SkillCatalogProfileService.CatalogProfileView(
                        "integration",
                        "payment",
                        "develop",
                        "bff",
                        List.of("spring-boot3", "maven"),
                        "payments",
                        List.of("gateway"),
                        "agent",
                        List.of()
                ),
                3L, new SkillCatalogProfileService.CatalogProfileView(
                        "business",
                        "order",
                        "release",
                        "batch",
                        List.of("java21", "maven", "harness"),
                        "agent-ops",
                        List.of("fulfillment"),
                        "agent",
                        List.of()
                )
        ));

        List<com.iflytek.skillhub.dto.SkillRecommendationResponse> recommendations = service.getRecommendations(
                "team-a",
                "agent-cli-skill",
                null,
                Map.of()
        );

        assertThat(recommendations).isNotEmpty();
        assertThat(recommendations.get(0).slug()).isEqualTo("payment-base-skill");
        assertThat(recommendations.get(0).reasons()).contains("related-by-graph");
    }
}
