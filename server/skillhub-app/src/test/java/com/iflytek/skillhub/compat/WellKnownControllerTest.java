package com.iflytek.skillhub.compat;

import com.iflytek.skillhub.domain.namespace.NamespaceMemberRepository;
import com.iflytek.skillhub.auth.device.DeviceAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WellKnownControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NamespaceMemberRepository namespaceMemberRepository;

    @MockBean
    private DeviceAuthService deviceAuthService;

    @Test
    void clawhubConfig_returns_apiBase() throws Exception {
        mockMvc.perform(get("/.well-known/clawhub.json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiBase").value("/api/v1"));
    }

    @Test
    void agenthubConfig_returns_agent_discovery_metadata() throws Exception {
        mockMvc.perform(get("/.well-known/agenthub.json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.platformName").value("agenthub-enterprise"))
                .andExpect(jsonPath("$.marketModel").value("skill-package-first"))
                .andExpect(jsonPath("$.endpoints.llms").value("/llms.txt"))
                .andExpect(jsonPath("$.endpoints.registryDoc").value("/registry/skill.md"))
                .andExpect(jsonPath("$.endpoints.agentProfile").value("/api/v1/agent/profile"))
                .andExpect(jsonPath("$.cli.package").value("/downloads/agenthub-cli-0.1.3.tgz"))
                .andExpect(jsonPath("$.agentInstructions[0]").value("Read /llms.txt and /registry/skill.md before using the platform."))
                .andExpect(jsonPath("$.assetFamilies[0]").value("claude-agent-plugin"));
    }
}
