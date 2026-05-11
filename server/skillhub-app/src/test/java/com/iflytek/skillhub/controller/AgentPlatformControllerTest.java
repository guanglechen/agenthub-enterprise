package com.iflytek.skillhub.controller;

import com.iflytek.skillhub.dto.AgentInstallPlanRequest;
import com.iflytek.skillhub.dto.AgentInstallPlanResponse;
import com.iflytek.skillhub.dto.AgentInstallPlanCommandResponse;
import com.iflytek.skillhub.dto.AgentInstallPlanSkillResponse;
import com.iflytek.skillhub.dto.AgentPlatformAuthResponse;
import com.iflytek.skillhub.dto.AgentPlatformBundleResponse;
import com.iflytek.skillhub.dto.AgentPlatformProfileResponse;
import com.iflytek.skillhub.dto.AgentWorkspaceContextResponse;
import com.iflytek.skillhub.service.AgentPlatformAppService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AgentPlatformControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AgentPlatformAppService agentPlatformAppService;

    @Test
    void getProfileShouldReturnOnboardingMetadata() throws Exception {
        when(agentPlatformAppService.getPlatformProfile()).thenReturn(new AgentPlatformProfileResponse(
                "agenthub-enterprise",
                "AgentHub Enterprise",
                "Enterprise asset center",
                Map.of("harness", true, "claudeCodeMarketplace", true),
                List.of("microservice", "quality"),
                List.of("bootstrap", "develop"),
                List.of("crud-api", "bff"),
                List.of("connect-platform"),
                List.of(new AgentPlatformBundleResponse(
                        "java-microservice-baseline",
                        "Java Microservice Baseline",
                        "baseline",
                        List.of("microservice"),
                        List.of("develop"),
                        List.of("crud-api")
                )),
                List.of("connect first"),
                List.of("agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json"),
                new AgentPlatformAuthResponse("provided-by-user-or-ci", "set AGENTHUB_TOKEN")
        ));

        mockMvc.perform(get("/api/v1/agent/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.platformName").value("agenthub-enterprise"))
                .andExpect(jsonPath("$.data.capabilities.harness").value(true))
                .andExpect(jsonPath("$.data.capabilities.claudeCodeMarketplace").value(true))
                .andExpect(jsonPath("$.data.defaultBundles[0].bundleId").value("java-microservice-baseline"))
                .andExpect(jsonPath("$.data.onboardingSteps[0]").value("connect first"))
                .andExpect(jsonPath("$.data.recommendedEntrypoints[0]").value("agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json"))
                .andExpect(jsonPath("$.data.auth.tokenMode").value("provided-by-user-or-ci"));
    }

    @Test
    void buildInstallPlanShouldReturnRequiredAndRecommendedSkills() throws Exception {
        when(agentPlatformAppService.buildInstallPlan(any(AgentInstallPlanRequest.class), eq(null), eq(Map.of())))
                .thenReturn(new AgentInstallPlanResponse(
                        new AgentPlatformProfileResponse(
                                "agenthub-enterprise",
                                "AgentHub Enterprise",
                                "Enterprise asset center",
                                Map.of("harness", true),
                                List.of("microservice"),
                                List.of("develop"),
                                List.of("bff"),
                                List.of("install-required-skills"),
                                List.of(),
                                List.of("call profile"),
                                List.of("agenthub-cli harness browse --json"),
                                new AgentPlatformAuthResponse("provided-by-user-or-ci", "set AGENTHUB_TOKEN")
                        ),
                        new AgentWorkspaceContextResponse(
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
                        List.of(new AgentInstallPlanSkillResponse(
                                true,
                                "team-ai",
                                "payment-service",
                                "Payment Service",
                                "Microservice baseline",
                                null,
                                0.91D,
                                List.of("same-domain"),
                                "/api/v1/skills/team-ai/payment-service/download",
                                "team-ai--payment-service"
                        )),
                        List.of(new AgentInstallPlanSkillResponse(
                                false,
                                "team-ai",
                                "payment-base",
                                "Payment Base",
                                "Integration baseline",
                                null,
                                0.67D,
                                List.of("related-by-graph"),
                                "/api/v1/skills/team-ai/payment-base/download",
                                "team-ai--payment-base"
                        )),
                        List.of("install required skills"),
                        List.of(new AgentInstallPlanCommandResponse(
                                "agenthub-cli harness browse --stack spring-boot3,maven --topology bff --json",
                                "discover-harness-packages",
                                true
                        ))
                ));

        mockMvc.perform(post("/api/v1/agent/install-plan")
                        .contentType("application/json")
                        .content("""
                                {
                                  "workspaceName":"payments",
                                  "language":"java",
                                  "framework":"spring-boot3",
                                  "newProject":false,
                                  "assetType":"microservice",
                                  "domain":"payment",
                                  "stage":"develop",
                                  "topology":"bff",
                                  "stack":["spring-boot3","maven"],
                                  "keywords":["gateway"],
                                  "namespace":"team-ai"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.workspaceContext.assetType").value("microservice"))
                .andExpect(jsonPath("$.data.requiredSkills[0].slug").value("payment-service"))
                .andExpect(jsonPath("$.data.recommendedSkills[0].slug").value("payment-base"))
                .andExpect(jsonPath("$.data.nextActions[0]").value("install required skills"))
                .andExpect(jsonPath("$.data.commands[0].reason").value("discover-harness-packages"));
    }
}
