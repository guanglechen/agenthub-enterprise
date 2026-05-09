package com.iflytek.skillhub.service;

import com.iflytek.skillhub.auth.rbac.RbacService;
import com.iflytek.skillhub.domain.audit.AuditLogService;
import com.iflytek.skillhub.domain.catalog.SkillCatalogProfile;
import com.iflytek.skillhub.domain.catalog.SkillCatalogProfileService;
import com.iflytek.skillhub.domain.label.SkillLabel;
import com.iflytek.skillhub.domain.label.SkillLabelRepository;
import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.namespace.NamespaceRepository;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainForbiddenException;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillRepository;
import com.iflytek.skillhub.domain.skill.SkillStatus;
import com.iflytek.skillhub.domain.skill.VisibilityChecker;
import com.iflytek.skillhub.domain.skill.service.SkillSlugResolutionService;
import com.iflytek.skillhub.dto.SkillCatalogProfileResponse;
import com.iflytek.skillhub.dto.SkillCatalogRelationResponse;
import com.iflytek.skillhub.dto.SkillCatalogUpsertRequest;
import com.iflytek.skillhub.dto.SkillRecommendationContextRequest;
import com.iflytek.skillhub.dto.SkillRecommendationResponse;
import com.iflytek.skillhub.dto.SkillRelatedSkillResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SkillCatalogAppService {
    private static final int DEFAULT_RECOMMENDATION_LIMIT = 6;

    private final NamespaceRepository namespaceRepository;
    private final SkillRepository skillRepository;
    private final VisibilityChecker visibilityChecker;
    private final SkillCatalogProfileService skillCatalogProfileService;
    private final SkillSlugResolutionService skillSlugResolutionService;
    private final SkillLabelRepository skillLabelRepository;
    private final RbacService rbacService;
    private final AuditLogService auditLogService;
    private final LabelSearchSyncService labelSearchSyncService;

    public SkillCatalogAppService(NamespaceRepository namespaceRepository,
                                  SkillRepository skillRepository,
                                  VisibilityChecker visibilityChecker,
                                  SkillCatalogProfileService skillCatalogProfileService,
                                  SkillSlugResolutionService skillSlugResolutionService,
                                  SkillLabelRepository skillLabelRepository,
                                  RbacService rbacService,
                                  AuditLogService auditLogService,
                                  LabelSearchSyncService labelSearchSyncService) {
        this.namespaceRepository = namespaceRepository;
        this.skillRepository = skillRepository;
        this.visibilityChecker = visibilityChecker;
        this.skillCatalogProfileService = skillCatalogProfileService;
        this.skillSlugResolutionService = skillSlugResolutionService;
        this.skillLabelRepository = skillLabelRepository;
        this.rbacService = rbacService;
        this.auditLogService = auditLogService;
        this.labelSearchSyncService = labelSearchSyncService;
    }

    public SkillCatalogProfileResponse getCatalog(String namespaceSlug,
                                                  String skillSlug,
                                                  String userId,
                                                  Map<Long, NamespaceRole> userNsRoles) {
        Skill skill = resolveSkillForRead(namespaceSlug, skillSlug, userId, userNsRoles);
        return toCatalogResponse(skillCatalogProfileService.resolveForSkill(skill));
    }

    @Transactional
    public SkillCatalogProfileResponse updateCatalog(String namespaceSlug,
                                                     String skillSlug,
                                                     SkillCatalogUpsertRequest request,
                                                     String userId,
                                                     Map<Long, NamespaceRole> userNsRoles,
                                                     AuditRequestContext auditContext) {
        Skill skill = resolveSkillForWrite(namespaceSlug, skillSlug, userId, userNsRoles);
        SkillCatalogProfileService.CatalogProfileView saved = skillCatalogProfileService.saveOverlay(
                skill.getId(),
                new SkillCatalogProfileService.CatalogProfileView(
                        request.assetType(),
                        request.domain(),
                        request.stage(),
                        request.topology(),
                        request.stack() != null ? request.stack() : List.of(),
                        request.ownerTeam(),
                        request.keywords() != null ? request.keywords() : List.of(),
                        request.maintenanceMode(),
                        toRelationViews(request.relations())
                ),
                userId
        );
        afterCommit(() -> labelSearchSyncService.rebuildSkill(skill.getId()));
        recordAudit("SKILL_CATALOG_UPDATE", userId, skill.getId(), auditContext);
        return toCatalogResponse(skillCatalogProfileService.resolveForSkill(skill));
    }

    public List<SkillCatalogRelationResponse> getRelations(String namespaceSlug,
                                                           String skillSlug,
                                                           String userId,
                                                           Map<Long, NamespaceRole> userNsRoles) {
        Skill skill = resolveSkillForRead(namespaceSlug, skillSlug, userId, userNsRoles);
        return toRelationResponses(skillCatalogProfileService.resolveForSkill(skill).relations());
    }

    @Transactional
    public List<SkillCatalogRelationResponse> updateRelations(String namespaceSlug,
                                                              String skillSlug,
                                                              List<SkillCatalogRelationResponse> relations,
                                                              String userId,
                                                              Map<Long, NamespaceRole> userNsRoles,
                                                              AuditRequestContext auditContext) {
        Skill skill = resolveSkillForWrite(namespaceSlug, skillSlug, userId, userNsRoles);
        SkillCatalogProfileService.CatalogProfileView saved = skillCatalogProfileService.saveRelations(
                skill.getId(),
                toRelationViews(relations),
                userId
        );
        afterCommit(() -> labelSearchSyncService.rebuildSkill(skill.getId()));
        recordAudit("SKILL_RELATIONS_UPDATE", userId, skill.getId(), auditContext);
        return toRelationResponses(saved.relations());
    }

    public List<SkillRelatedSkillResponse> getRelatedSkills(String namespaceSlug,
                                                            String skillSlug,
                                                            String userId,
                                                            Map<Long, NamespaceRole> userNsRoles) {
        Skill skill = resolveSkillForRead(namespaceSlug, skillSlug, userId, userNsRoles);
        SkillCatalogProfileService.CatalogProfileView profile = skillCatalogProfileService.resolveForSkill(skill);
        return resolveRelatedSkills(profile.relations(), userId, userNsRoles);
    }

    public List<SkillRecommendationResponse> getRecommendations(String namespaceSlug,
                                                                String skillSlug,
                                                                String userId,
                                                                Map<Long, NamespaceRole> userNsRoles) {
        Skill sourceSkill = resolveSkillForRead(namespaceSlug, skillSlug, userId, userNsRoles);
        SkillCatalogProfileService.CatalogProfileView sourceProfile = skillCatalogProfileService.resolveForSkill(sourceSkill);
        return rankRecommendations(sourceSkill, sourceProfile, userId, userNsRoles, null, DEFAULT_RECOMMENDATION_LIMIT);
    }

    public List<SkillRecommendationResponse> recommendByContext(SkillRecommendationContextRequest request,
                                                                String userId,
                                                                Map<Long, NamespaceRole> userNsRoles) {
        SkillCatalogProfileService.CatalogProfileView contextProfile = new SkillCatalogProfileService.CatalogProfileView(
                request.assetType(),
                request.domain(),
                request.stage(),
                request.topology(),
                request.stack() != null ? request.stack() : List.of(),
                null,
                request.keywords() != null ? request.keywords() : List.of(),
                null,
                List.of()
        );
        return rankRecommendations(null, contextProfile, userId, userNsRoles, request.namespace(), DEFAULT_RECOMMENDATION_LIMIT);
    }

    public List<String> buildRecommendationReasonHints(Long downloadCount,
                                                       SkillCatalogProfileResponse profile) {
        LinkedHashSet<String> reasons = new LinkedHashSet<>();
        if (profile != null && profile.domain() != null) {
            reasons.add("same-domain");
        }
        if (profile != null && profile.topology() != null) {
            reasons.add("same-topology");
        }
        if (profile != null && profile.stack() != null && !profile.stack().isEmpty()) {
            reasons.add("shared-stack");
        }
        if (profile != null && profile.relations() != null && !profile.relations().isEmpty()) {
            reasons.add("related-by-graph");
        }
        if (downloadCount != null && downloadCount >= 10) {
            reasons.add("high-reuse");
        }
        return List.copyOf(reasons);
    }

    private List<SkillRecommendationResponse> rankRecommendations(Skill sourceSkill,
                                                                  SkillCatalogProfileService.CatalogProfileView sourceProfile,
                                                                  String userId,
                                                                  Map<Long, NamespaceRole> userNsRoles,
                                                                  String namespacePreference,
                                                                  int limit) {
        List<Skill> candidates = skillRepository.findAll().stream()
                .filter(skill -> skill.getStatus() == SkillStatus.ACTIVE)
                .filter(skill -> !skill.isHidden())
                .filter(skill -> sourceSkill == null || !Objects.equals(skill.getId(), sourceSkill.getId()))
                .filter(skill -> visibilityChecker.canAccess(skill, userId, normalizeRoles(userNsRoles)))
                .toList();
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<Long, SkillCatalogProfileService.CatalogProfileView> profiles = skillCatalogProfileService.resolveForSkills(candidates);
        Map<Long, Namespace> namespacesById = namespaceRepository.findByIdIn(
                        candidates.stream().map(Skill::getNamespaceId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Namespace::getId, Function.identity()));
        Map<Long, Set<Long>> labelIdsBySkillId = skillLabelRepository.findBySkillIdIn(
                        candidates.stream().map(Skill::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        SkillLabel::getSkillId,
                        Collectors.mapping(SkillLabel::getLabelId, Collectors.toSet())
                ));
        Set<Long> sourceLabelIds = sourceSkill == null
                ? Set.of()
                : labelIdsBySkillId.getOrDefault(sourceSkill.getId(), Set.of());
        Set<String> sourceRelationTargets = sourceProfile.relations().stream()
                .map(SkillCatalogProfileService.CatalogRelation::target)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return candidates.stream()
                .map(candidate -> toRecommendation(candidate,
                        profiles.getOrDefault(candidate.getId(), emptyProfile()),
                        namespacesById.get(candidate.getNamespaceId()),
                        sourceProfile,
                        sourceLabelIds,
                        labelIdsBySkillId.getOrDefault(candidate.getId(), Set.of()),
                        sourceRelationTargets,
                        namespacePreference))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble(SkillRecommendationResponse::score).reversed()
                        .thenComparing(SkillRecommendationResponse::updatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .toList();
    }

    private SkillRecommendationResponse toRecommendation(Skill candidate,
                                                         SkillCatalogProfileService.CatalogProfileView candidateProfile,
                                                         Namespace namespace,
                                                         SkillCatalogProfileService.CatalogProfileView sourceProfile,
                                                         Set<Long> sourceLabelIds,
                                                         Set<Long> candidateLabelIds,
                                                         Set<String> sourceRelationTargets,
                                                         String namespacePreference) {
        List<String> reasons = new ArrayList<>();
        double score = 0D;

        if (same(sourceProfile.assetType(), candidateProfile.assetType())) {
            score += 2.5D;
        }
        if (same(sourceProfile.domain(), candidateProfile.domain())) {
            score += 4D;
            reasons.add("same-domain");
        }
        if (same(sourceProfile.topology(), candidateProfile.topology())) {
            score += 3D;
            reasons.add("same-topology");
        }
        int sharedStacks = intersectionSize(sourceProfile.stack(), candidateProfile.stack());
        if (sharedStacks > 0) {
            score += Math.min(2.5D, sharedStacks * 0.8D);
            reasons.add("shared-stack");
        }
        int sharedLabels = intersectionSize(sourceLabelIds, candidateLabelIds);
        if (sharedLabels > 0) {
            score += Math.min(1.5D, sharedLabels * 0.5D);
        }
        String candidateTarget = namespace == null ? null : "@" + namespace.getSlug() + "/" + candidate.getSlug();
        if (candidateTarget != null && sourceRelationTargets.contains(candidateTarget)) {
            score += 2.5D;
            reasons.add("related-by-graph");
        }
        if (candidate.getDownloadCount() != null && candidate.getDownloadCount() >= 10) {
            score += Math.min(2D, candidate.getDownloadCount() / 50D);
            reasons.add("high-reuse");
        }
        if (candidate.getUpdatedAt() != null && candidate.getUpdatedAt().isAfter(Instant.now().minus(Duration.ofDays(90)))) {
            score += 0.4D;
        }
        if (namespacePreference != null && namespace != null && namespacePreference.equals(namespace.getSlug())) {
            score += 1D;
        }
        if (score <= 0D) {
            return null;
        }
        return new SkillRecommendationResponse(
                candidate.getId(),
                namespace != null ? namespace.getSlug() : null,
                candidate.getSlug(),
                candidate.getDisplayName(),
                candidate.getSummary(),
                candidate.getDownloadCount(),
                candidate.getStarCount(),
                candidate.getUpdatedAt(),
                toCatalogResponse(candidateProfile),
                score,
                List.copyOf(new LinkedHashSet<>(reasons))
        );
    }

    private List<SkillRelatedSkillResponse> resolveRelatedSkills(List<SkillCatalogProfileService.CatalogRelation> relations,
                                                                 String userId,
                                                                 Map<Long, NamespaceRole> userNsRoles) {
        if (relations == null || relations.isEmpty()) {
            return List.of();
        }
        List<SkillRelatedSkillResponse> items = new ArrayList<>();
        for (SkillCatalogProfileService.CatalogRelation relation : relations) {
            String target = relation.target();
            if (target == null || !target.contains("/")) {
                items.add(new SkillRelatedSkillResponse(
                        relation.type(),
                        relation.target(),
                        relation.title(),
                        relation.note(),
                        false,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ));
                continue;
            }

            String normalizedTarget = target.startsWith("@") ? target.substring(1) : target;
            String[] parts = normalizedTarget.split("/", 2);
            String namespaceSlug = parts[0];
            String skillSlug = parts[1];
            List<Skill> matches = skillRepository.findByNamespaceSlugAndSlug(namespaceSlug, skillSlug);
            Skill resolved = matches.stream()
                    .filter(skill -> skill.getStatus() == SkillStatus.ACTIVE)
                    .filter(skill -> !skill.isHidden())
                    .filter(skill -> visibilityChecker.canAccess(skill, userId, normalizeRoles(userNsRoles)))
                    .findFirst()
                    .orElse(null);
            if (resolved == null) {
                items.add(new SkillRelatedSkillResponse(
                        relation.type(),
                        relation.target(),
                        relation.title(),
                        relation.note(),
                        false,
                        null,
                        namespaceSlug,
                        skillSlug,
                        null,
                        null,
                        null
                ));
                continue;
            }
            SkillCatalogProfileService.CatalogProfileView resolvedProfile = skillCatalogProfileService.resolveForSkill(resolved);
            items.add(new SkillRelatedSkillResponse(
                    relation.type(),
                    relation.target(),
                    relation.title(),
                    relation.note(),
                    true,
                    resolved.getId(),
                    namespaceSlug,
                    resolved.getSlug(),
                    resolved.getDisplayName(),
                    resolved.getSummary(),
                    toCatalogResponse(resolvedProfile)
            ));
        }
        return items;
    }

    private Skill resolveSkillForRead(String namespaceSlug,
                                      String skillSlug,
                                      String userId,
                                      Map<Long, NamespaceRole> userNsRoles) {
        Namespace namespace = namespaceRepository.findBySlug(namespaceSlug)
                .orElseThrow(() -> new DomainBadRequestException("error.namespace.slug.notFound", namespaceSlug));
        Skill skill = skillSlugResolutionService.resolve(
                namespace.getId(),
                skillSlug,
                userId,
                SkillSlugResolutionService.Preference.PUBLISHED
        );
        if (!platformRoles(userId).contains("SUPER_ADMIN")
                && !visibilityChecker.canAccess(skill, userId, normalizeRoles(userNsRoles))) {
            throw new DomainForbiddenException("error.skill.access.denied", skillSlug);
        }
        return skill;
    }

    private Skill resolveSkillForWrite(String namespaceSlug,
                                       String skillSlug,
                                       String userId,
                                       Map<Long, NamespaceRole> userNsRoles) {
        if (userId == null || userId.isBlank()) {
            throw new DomainForbiddenException("error.auth.required", "catalog");
        }
        Namespace namespace = namespaceRepository.findBySlug(namespaceSlug)
                .orElseThrow(() -> new DomainBadRequestException("error.namespace.slug.notFound", namespaceSlug));
        Skill skill = skillSlugResolutionService.resolve(
                namespace.getId(),
                skillSlug,
                userId,
                SkillSlugResolutionService.Preference.CURRENT_USER
        );
        if (!canManageSkill(skill, userId, userNsRoles)) {
            throw new DomainForbiddenException("error.skill.catalog.manageDenied", skillSlug);
        }
        return skill;
    }

    private boolean canManageSkill(Skill skill, String userId, Map<Long, NamespaceRole> userNsRoles) {
        if (userId != null && userId.equals(skill.getOwnerId())) {
            return true;
        }
        if (platformRoles(userId).contains("SUPER_ADMIN")) {
            return true;
        }
        NamespaceRole role = normalizeRoles(userNsRoles).get(skill.getNamespaceId());
        return role == NamespaceRole.OWNER || role == NamespaceRole.ADMIN;
    }

    private Map<Long, NamespaceRole> normalizeRoles(Map<Long, NamespaceRole> userNsRoles) {
        return userNsRoles != null ? userNsRoles : Map.of();
    }

    private Set<String> platformRoles(String userId) {
        return userId == null ? Set.of() : rbacService.getUserRoleCodes(userId);
    }

    private List<SkillCatalogProfileService.CatalogRelation> toRelationViews(List<SkillCatalogRelationResponse> relations) {
        if (relations == null || relations.isEmpty()) {
            return List.of();
        }
        return relations.stream()
                .filter(Objects::nonNull)
                .map(relation -> new SkillCatalogProfileService.CatalogRelation(
                        relation.type(),
                        relation.target(),
                        relation.title(),
                        relation.note()
                ))
                .toList();
    }

    public SkillCatalogProfileResponse toCatalogResponse(SkillCatalogProfileService.CatalogProfileView profile) {
        return new SkillCatalogProfileResponse(
                profile.assetType(),
                profile.domain(),
                profile.stage(),
                profile.topology(),
                profile.stack(),
                profile.ownerTeam(),
                profile.keywords(),
                profile.maintenanceMode(),
                toRelationResponses(profile.relations())
        );
    }

    private List<SkillCatalogRelationResponse> toRelationResponses(List<SkillCatalogProfileService.CatalogRelation> relations) {
        if (relations == null || relations.isEmpty()) {
            return List.of();
        }
        return relations.stream()
                .map(relation -> new SkillCatalogRelationResponse(
                        relation.type(),
                        relation.target(),
                        relation.title(),
                        relation.note()
                ))
                .toList();
    }

    private SkillCatalogProfileService.CatalogProfileView emptyProfile() {
        return new SkillCatalogProfileService.CatalogProfileView(
                null, null, null, null, List.of(), null, List.of(), null, List.of()
        );
    }

    private boolean same(String left, String right) {
        return left != null && left.equals(right);
    }

    private int intersectionSize(List<String> left, List<String> right) {
        if (left == null || right == null || left.isEmpty() || right.isEmpty()) {
            return 0;
        }
        Set<String> leftSet = new LinkedHashSet<>(left);
        leftSet.retainAll(right);
        return leftSet.size();
    }

    private int intersectionSize(Set<Long> left, Set<Long> right) {
        if (left == null || right == null || left.isEmpty() || right.isEmpty()) {
            return 0;
        }
        Set<Long> copy = new LinkedHashSet<>(left);
        copy.retainAll(right);
        return copy.size();
    }

    private void recordAudit(String action,
                             String userId,
                             Long targetId,
                             AuditRequestContext auditContext) {
        auditLogService.record(
                userId,
                action,
                "SKILL",
                targetId,
                MDC.get("requestId"),
                auditContext != null ? auditContext.clientIp() : null,
                auditContext != null ? auditContext.userAgent() : null,
                null
        );
    }

    private void afterCommit(Runnable runnable) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            runnable.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                runnable.run();
            }
        });
    }
}
