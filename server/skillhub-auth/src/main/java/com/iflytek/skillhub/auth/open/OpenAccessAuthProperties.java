package com.iflytek.skillhub.auth.open;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration for temporarily disabling interactive authentication and
 * projecting every request as a preconfigured platform user.
 */
@Component
@ConfigurationProperties(prefix = "skillhub.auth.open-access")
public class OpenAccessAuthProperties {

    private boolean enabled = false;
    private String userId = "docker-admin";
    private String providerCode = "open-access";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getProviderCode() {
        return providerCode;
    }

    public void setProviderCode(String providerCode) {
        this.providerCode = providerCode;
    }
}
