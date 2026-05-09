package com.iflytek.skillhub.domain.catalog;

import java.util.List;
import java.util.Optional;

public interface SkillCatalogProfileRepository {
    Optional<SkillCatalogProfile> findBySkillId(Long skillId);
    List<SkillCatalogProfile> findBySkillIdIn(List<Long> skillIds);
    SkillCatalogProfile save(SkillCatalogProfile profile);
}
