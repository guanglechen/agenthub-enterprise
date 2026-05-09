CREATE TABLE skill_catalog_profile (
    id BIGSERIAL PRIMARY KEY,
    skill_id BIGINT NOT NULL UNIQUE,
    asset_type VARCHAR(64),
    domain VARCHAR(128),
    stage VARCHAR(64),
    topology VARCHAR(64),
    owner_team VARCHAR(128),
    maintenance_mode VARCHAR(32),
    stack_json JSONB,
    keywords_json JSONB,
    relations_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(128),
    CONSTRAINT fk_skill_catalog_profile_skill
        FOREIGN KEY (skill_id) REFERENCES skill(id) ON DELETE CASCADE
);

CREATE INDEX idx_skill_catalog_profile_skill_id ON skill_catalog_profile(skill_id);
CREATE INDEX idx_skill_catalog_profile_asset_type ON skill_catalog_profile(asset_type);
CREATE INDEX idx_skill_catalog_profile_domain ON skill_catalog_profile(domain);
CREATE INDEX idx_skill_catalog_profile_stage ON skill_catalog_profile(stage);
CREATE INDEX idx_skill_catalog_profile_topology ON skill_catalog_profile(topology);
