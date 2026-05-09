package com.iflytek.skillhub.infra.jpa;

import com.iflytek.skillhub.domain.catalog.SkillCatalogProfile;
import com.iflytek.skillhub.domain.catalog.SkillCatalogProfileRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillCatalogProfileJpaRepository extends JpaRepository<SkillCatalogProfile, Long>, SkillCatalogProfileRepository {
    @Override
    Optional<SkillCatalogProfile> findBySkillId(Long skillId);

    @Override
    List<SkillCatalogProfile> findBySkillIdIn(List<Long> skillIds);
}
