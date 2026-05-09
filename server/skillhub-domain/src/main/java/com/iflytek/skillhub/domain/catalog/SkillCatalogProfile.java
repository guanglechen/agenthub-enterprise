package com.iflytek.skillhub.domain.catalog;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "skill_catalog_profile")
public class SkillCatalogProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "skill_id", nullable = false, unique = true)
    private Long skillId;

    @Column(name = "asset_type", length = 64)
    private String assetType;

    @Column(length = 128)
    private String domain;

    @Column(length = 64)
    private String stage;

    @Column(length = 64)
    private String topology;

    @Column(name = "owner_team", length = 128)
    private String ownerTeam;

    @Column(name = "maintenance_mode", length = 32)
    private String maintenanceMode;

    @Column(name = "stack_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String stackJson;

    @Column(name = "keywords_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String keywordsJson;

    @Column(name = "relations_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String relationsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by", length = 128)
    private String updatedBy;

    protected SkillCatalogProfile() {
    }

    public SkillCatalogProfile(Long skillId) {
        this.skillId = skillId;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getSkillId() {
        return skillId;
    }

    public String getAssetType() {
        return assetType;
    }

    public String getDomain() {
        return domain;
    }

    public String getStage() {
        return stage;
    }

    public String getTopology() {
        return topology;
    }

    public String getOwnerTeam() {
        return ownerTeam;
    }

    public String getMaintenanceMode() {
        return maintenanceMode;
    }

    public String getStackJson() {
        return stackJson;
    }

    public String getKeywordsJson() {
        return keywordsJson;
    }

    public String getRelationsJson() {
        return relationsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setAssetType(String assetType) {
        this.assetType = assetType;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public void setTopology(String topology) {
        this.topology = topology;
    }

    public void setOwnerTeam(String ownerTeam) {
        this.ownerTeam = ownerTeam;
    }

    public void setMaintenanceMode(String maintenanceMode) {
        this.maintenanceMode = maintenanceMode;
    }

    public void setStackJson(String stackJson) {
        this.stackJson = stackJson;
    }

    public void setKeywordsJson(String keywordsJson) {
        this.keywordsJson = keywordsJson;
    }

    public void setRelationsJson(String relationsJson) {
        this.relationsJson = relationsJson;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
}
