package com.iflytek.skillhub.domain.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillVersion;
import com.iflytek.skillhub.domain.skill.SkillVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SkillCatalogProfileService {
    private static final Logger log = LoggerFactory.getLogger(SkillCatalogProfileService.class);
    private static final Set<String> ALLOWED_ASSET_TYPES = Set.of(
            "product", "scaffold", "business", "microservice", "quality", "integration"
    );
    private static final Set<String> ALLOWED_STAGES = Set.of(
            "discover", "bootstrap", "develop", "test", "release", "operate"
    );
    private static final Set<String> ALLOWED_TOPOLOGIES = Set.of(
            "crud-api", "bff", "event-consumer", "batch", "shared-lib"
    );
    private static final Set<String> ALLOWED_MAINTENANCE_MODES = Set.of("manual", "agent");
    private static final Set<String> ALLOWED_RELATION_TYPES = Set.of(
            "dependsOn", "recommendedWith", "partOf", "forService"
    );
    private static final Pattern RELATION_TARGET_PATTERN = Pattern.compile("^@?[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$");
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Object>> LIST_TYPE = new TypeReference<>() {};

    private final SkillCatalogProfileRepository repository;
    private final SkillVersionRepository skillVersionRepository;
    private final ObjectMapper objectMapper;

    public SkillCatalogProfileService(SkillCatalogProfileRepository repository,
                                      SkillVersionRepository skillVersionRepository,
                                      ObjectMapper objectMapper) {
        this.repository = repository;
        this.skillVersionRepository = skillVersionRepository;
        this.objectMapper = objectMapper;
    }

    public record CatalogRelation(String type, String target, String title, String note) {}

    public record CatalogProfileView(
            String assetType,
            String domain,
            String stage,
            String topology,
            List<String> stack,
            String ownerTeam,
            List<String> keywords,
            String maintenanceMode,
            List<CatalogRelation> relations
    ) {}

    public Optional<SkillCatalogProfile> findOverlayBySkillId(Long skillId) {
        return repository.findBySkillId(skillId);
    }

    public CatalogProfileView resolveForSkill(Skill skill) {
        Map<Long, CatalogProfileView> resolved = resolveForSkills(List.of(skill));
        return resolved.getOrDefault(skill.getId(), emptyProfile());
    }

    public Map<Long, CatalogProfileView> resolveForSkills(List<Skill> skills) {
        if (skills == null || skills.isEmpty()) {
            return Map.of();
        }
        List<Long> skillIds = skills.stream().map(Skill::getId).filter(Objects::nonNull).distinct().toList();
        Map<Long, SkillCatalogProfile> overlays = repository.findBySkillIdIn(skillIds).stream()
                .collect(Collectors.toMap(SkillCatalogProfile::getSkillId, profile -> profile));
        Map<Long, SkillVersion> latestVersions = skillVersionRepository.findByIdIn(
                        skills.stream().map(Skill::getLatestVersionId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(SkillVersion::getId, version -> version));

        Map<Long, CatalogProfileView> result = new LinkedHashMap<>();
        for (Skill skill : skills) {
            CatalogProfileView packageProfile = Optional.ofNullable(skill.getLatestVersionId())
                    .map(latestVersions::get)
                    .map(this::extractPackageProfile)
                    .orElse(emptyProfile());
            CatalogProfileView overlayProfile = Optional.ofNullable(overlays.get(skill.getId()))
                    .map(this::toOverlayView)
                    .orElse(emptyProfile());
            result.put(skill.getId(), mergeProfiles(packageProfile, overlayProfile));
        }
        return result;
    }

    public CatalogProfileView saveOverlay(Long skillId, CatalogProfileView profile, String updatedBy) {
        SkillCatalogProfile entity = repository.findBySkillId(skillId).orElseGet(() -> new SkillCatalogProfile(skillId));
        entity.setAssetType(normalizeEnum(profile.assetType(), ALLOWED_ASSET_TYPES, "assetType"));
        entity.setDomain(normalizeText(profile.domain()));
        entity.setStage(normalizeEnum(profile.stage(), ALLOWED_STAGES, "stage"));
        entity.setTopology(normalizeEnum(profile.topology(), ALLOWED_TOPOLOGIES, "topology"));
        entity.setOwnerTeam(normalizeText(profile.ownerTeam()));
        entity.setMaintenanceMode(normalizeEnum(profile.maintenanceMode(), ALLOWED_MAINTENANCE_MODES, "maintenanceMode"));
        entity.setStackJson(writeJsonArray(normalizeDistinctList(profile.stack())));
        entity.setKeywordsJson(writeJsonArray(normalizeDistinctList(profile.keywords())));
        entity.setRelationsJson(writeJsonArray(normalizeRelations(profile.relations())));
        entity.setUpdatedBy(updatedBy);
        repository.save(entity);
        return toOverlayView(entity);
    }

    public CatalogProfileView saveRelations(Long skillId, List<CatalogRelation> relations, String updatedBy) {
        SkillCatalogProfile entity = repository.findBySkillId(skillId).orElseGet(() -> new SkillCatalogProfile(skillId));
        entity.setRelationsJson(writeJsonArray(normalizeRelations(relations)));
        entity.setUpdatedBy(updatedBy);
        repository.save(entity);
        return toOverlayView(entity);
    }

    private CatalogProfileView extractPackageProfile(SkillVersion version) {
        Map<String, Object> metadata = parseJsonMap(version.getParsedMetadataJson());
        Map<String, Object> frontmatter = asMap(metadata.get("frontmatter"));
        return new CatalogProfileView(
                safeNormalizeEnum(readFirst(frontmatter, "x-agenthub-asset-type"), ALLOWED_ASSET_TYPES, "x-agenthub-asset-type"),
                normalizeText(readFirst(frontmatter, "x-agenthub-domain")),
                safeNormalizeEnum(readFirst(frontmatter, "x-agenthub-stage"), ALLOWED_STAGES, "x-agenthub-stage"),
                safeNormalizeEnum(readFirst(frontmatter, "x-agenthub-topology"), ALLOWED_TOPOLOGIES, "x-agenthub-topology"),
                normalizeDistinctList(readStringList(frontmatter, "x-agenthub-stack")),
                normalizeText(readFirst(frontmatter, "x-agenthub-owner-team")),
                normalizeDistinctList(mergeLists(
                        readStringList(frontmatter, "x-agenthub-keywords"),
                        readStringList(frontmatter, "keywords")
                )),
                safeNormalizeEnum(readFirst(frontmatter, "x-agenthub-maintenance-mode"), ALLOWED_MAINTENANCE_MODES, "x-agenthub-maintenance-mode"),
                safeNormalizeRelations(readRelations(frontmatter.get("x-agenthub-relations")))
        );
    }

    private CatalogProfileView toOverlayView(SkillCatalogProfile entity) {
        return new CatalogProfileView(
                normalizeText(entity.getAssetType()),
                normalizeText(entity.getDomain()),
                normalizeText(entity.getStage()),
                normalizeText(entity.getTopology()),
                normalizeDistinctList(readJsonStringList(entity.getStackJson())),
                normalizeText(entity.getOwnerTeam()),
                normalizeDistinctList(readJsonStringList(entity.getKeywordsJson())),
                normalizeText(entity.getMaintenanceMode()),
                normalizeRelations(readJsonRelations(entity.getRelationsJson()))
        );
    }

    private CatalogProfileView mergeProfiles(CatalogProfileView packageProfile, CatalogProfileView overlayProfile) {
        return new CatalogProfileView(
                firstNonBlank(overlayProfile.assetType(), packageProfile.assetType()),
                firstNonBlank(overlayProfile.domain(), packageProfile.domain()),
                firstNonBlank(overlayProfile.stage(), packageProfile.stage()),
                firstNonBlank(overlayProfile.topology(), packageProfile.topology()),
                overlayProfile.stack().isEmpty() ? packageProfile.stack() : overlayProfile.stack(),
                firstNonBlank(overlayProfile.ownerTeam(), packageProfile.ownerTeam()),
                overlayProfile.keywords().isEmpty() ? packageProfile.keywords() : overlayProfile.keywords(),
                firstNonBlank(overlayProfile.maintenanceMode(), packageProfile.maintenanceMode()),
                overlayProfile.relations().isEmpty() ? packageProfile.relations() : overlayProfile.relations()
        );
    }

    private CatalogProfileView emptyProfile() {
        return new CatalogProfileView(null, null, null, null, List.of(), null, List.of(), null, List.of());
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private String readFirst(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        return String.valueOf(value);
    }

    private List<String> readStringList(Map<String, Object> map, String key) {
        return flattenStrings(map.get(key));
    }

    private List<String> flattenStrings(Object value) {
        if (value == null) {
            return List.of();
        }
        if (value instanceof String text) {
            return List.of(text);
        }
        if (value instanceof Collection<?> collection) {
            List<String> values = new ArrayList<>();
            for (Object item : collection) {
                values.addAll(flattenStrings(item));
            }
            return values;
        }
        return List.of(String.valueOf(value));
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, MAP_TYPE);
        } catch (Exception exception) {
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    normalized.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
            return normalized;
        }
        return Map.of();
    }

    private List<String> readJsonStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<Object> values = objectMapper.readValue(json, LIST_TYPE);
            return values.stream().filter(Objects::nonNull).map(String::valueOf).toList();
        } catch (Exception exception) {
            return List.of();
        }
    }

    private List<CatalogRelation> readJsonRelations(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<Object> values = objectMapper.readValue(json, LIST_TYPE);
            return readRelations(values);
        } catch (Exception exception) {
            return List.of();
        }
    }

    private List<CatalogRelation> readRelations(Object value) {
        if (!(value instanceof Collection<?> collection)) {
            return List.of();
        }
        List<CatalogRelation> relations = new ArrayList<>();
        for (Object item : collection) {
            Map<String, Object> relationMap = asMap(item);
            if (relationMap.isEmpty()) {
                continue;
            }
            relations.add(new CatalogRelation(
                    readFirst(relationMap, "type"),
                    readFirst(relationMap, "target"),
                    readFirst(relationMap, "title"),
                    readFirst(relationMap, "note")
            ));
        }
        return relations;
    }

    private List<String> mergeLists(List<String> left, List<String> right) {
        List<String> merged = new ArrayList<>(left);
        merged.addAll(right);
        return merged;
    }

    private List<String> normalizeDistinctList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            String text = normalizeText(value);
            if (text != null) {
                normalized.add(text);
            }
        }
        return List.copyOf(normalized);
    }

    private List<CatalogRelation> normalizeRelations(List<CatalogRelation> relations) {
        if (relations == null || relations.isEmpty()) {
            return List.of();
        }
        List<CatalogRelation> normalized = new ArrayList<>();
        for (CatalogRelation relation : relations) {
            if (relation == null) {
                continue;
            }
            String type = normalizeRelationType(relation.type());
            String target = normalizeRelationTarget(relation.target());
            if (type == null || target == null) {
                continue;
            }
            normalized.add(new CatalogRelation(
                    type,
                    target,
                    normalizeText(relation.title()),
                    normalizeText(relation.note())
            ));
        }
        return List.copyOf(normalized);
    }

    private List<CatalogRelation> safeNormalizeRelations(List<CatalogRelation> relations) {
        if (relations == null || relations.isEmpty()) {
            return List.of();
        }
        List<CatalogRelation> normalized = new ArrayList<>();
        for (CatalogRelation relation : relations) {
            try {
                List<CatalogRelation> single = normalizeRelations(List.of(relation));
                if (!single.isEmpty()) {
                    normalized.add(single.getFirst());
                }
            } catch (DomainBadRequestException exception) {
                log.debug("Ignoring invalid catalog relation from package metadata: {}", exception.getMessage());
            }
        }
        return List.copyOf(normalized);
    }

    private String normalizeRelationType(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return null;
        }
        if (!ALLOWED_RELATION_TYPES.contains(normalized)) {
            throw new DomainBadRequestException("error.skill.catalog.invalidRelationType", normalized);
        }
        return normalized;
    }

    private String normalizeRelationTarget(String value) {
        String normalized = normalizeLowerText(value);
        if (normalized == null) {
            return null;
        }
        if (!RELATION_TARGET_PATTERN.matcher(normalized).matches()) {
            throw new DomainBadRequestException("error.skill.catalog.invalidRelationTarget", normalized);
        }
        return normalized.startsWith("@") ? normalized : "@" + normalized;
    }

    private String normalizeEnum(String value, Set<String> allowedValues, String fieldName) {
        String normalized = normalizeLowerText(value);
        if (normalized == null) {
            return null;
        }
        if (!allowedValues.contains(normalized)) {
            throw new DomainBadRequestException("error.skill.catalog.invalidField", fieldName + ":" + normalized);
        }
        return normalized;
    }

    private String safeNormalizeEnum(String value, Set<String> allowedValues, String fieldName) {
        try {
            return normalizeEnum(value, allowedValues, fieldName);
        } catch (DomainBadRequestException exception) {
            log.debug("Ignoring invalid catalog field from package metadata: {}", exception.getMessage());
            return null;
        }
    }

    private String normalizeLowerText(String value) {
        String normalized = normalizeText(value);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String writeJsonArray(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? List.of() : value);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to serialize catalog profile", exception);
        }
    }
}
