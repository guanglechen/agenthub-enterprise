package com.iflytek.skillhub.compat;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves well-known compatibility metadata used by external clients to discover the API base.
 */
@RestController
public class WellKnownController {

    @GetMapping("/.well-known/clawhub.json")
    public Map<String, String> clawhubConfig() {
        return Map.of("apiBase", "/api/v1");
    }

    @GetMapping("/.well-known/agenthub.json")
    public Map<String, Object> agenthubConfig() {
        return Map.ofEntries(
                Map.entry("platformName", "agenthub-enterprise"),
                Map.entry("displayName", "AgentHub Enterprise"),
                Map.entry("purpose", "Private enterprise Skill and Agent asset market for product, business, engineering, tool, Harness, and platform integration assets."),
                Map.entry("marketModel", "skill-package-first"),
                Map.entry("endpoints", Map.ofEntries(
                        Map.entry("llms", "/llms.txt"),
                        Map.entry("registryDoc", "/registry/skill.md"),
                        Map.entry("agentProfile", "/api/v1/agent/profile"),
                        Map.entry("agentInstallPlan", "/api/v1/agent/install-plan"),
                        Map.entry("search", "/api/web/skills"),
                        Map.entry("claudeMarketplace", "/registry/claude-marketplace.json")
                )),
                Map.entry("cli", Map.of(
                        "package", "/downloads/agenthub-cli-0.1.3.tgz",
                        "install", "npm install -g <base-url>/downloads/agenthub-cli-0.1.3.tgz",
                        "profile", "agenthub-cli agent profile --base-url <base-url> --json",
                        "installPlan", "agenthub-cli agent install-plan --json"
                )),
                Map.entry("agentInstructions", List.of(
                        "Read /llms.txt and /registry/skill.md before using the platform.",
                        "Call /api/v1/agent/profile to understand capabilities and workflows.",
                        "Use agenthub-cli as the primary machine interface.",
                        "Ask the user for AGENTHUB_TOKEN before publishing or maintaining catalog metadata.",
                        "Do not replace the Skill market model with a separate top-level asset protocol."
                )),
                Map.entry("assetFamilies", List.of(
                        "claude-agent-plugin",
                        "agent-skill",
                        "engineering-knowledge",
                        "product-knowledge",
                        "business-knowledge",
                        "developer-tooling",
                        "harness-package",
                        "platform-integration"
                ))
        );
    }
}
