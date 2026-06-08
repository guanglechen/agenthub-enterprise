package com.iflytek.skillhub.dto;

import java.util.List;

public record AgentCapabilityLayerResponse(
        String layerId,
        String displayName,
        String intent,
        List<String> assetTypes,
        List<String> stages,
        String agentUse
) {}
