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
                        "package", "/downloads/agenthub-cli-0.1.4.tgz",
                        "install", "npm install -g <base-url>/downloads/agenthub-cli-0.1.4.tgz",
                        "profile", "agenthub-cli agent profile --base-url <base-url> --json",
                        "installPlan", "agenthub-cli agent install-plan --json"
                )),
                Map.entry("agentInstructions", List.of(
                        "Read /llms.txt and /registry/skill.md before using the platform.",
                        "Call /api/v1/agent/profile to understand capabilities and workflows.",
                        "Use agenthub-cli as the primary machine interface.",
                        "Use open-access direct publish when available; ask for AGENTHUB_TOKEN only after the deployment returns 401 or 403.",
                        "Before publishing, infer catalog profile fields and labels from the Skill package and workspace context.",
                        "Resolve the displayed Skill contributor from SKILL.md, CLI flags, environment variables, git config, or CI actor metadata before publishing.",
                        "If no contributor can be resolved, ask the user for the contributor display name before publishing.",
                        "Do not replace the Skill market model with a separate top-level asset protocol."
                )),
                Map.entry("skillContributionPolicy", Map.ofEntries(
                        Map.entry("inferCatalogProfileBeforePublish", true),
                        Map.entry("inferLabelsBeforePublish", true),
                        Map.entry("requireDisplayedContributor", true),
                        Map.entry("missingContributorAction", "ask-user-for-contributor-display-name-before-publish"),
                        Map.entry("publishCommand", "agenthub-cli publish --namespace <namespace> --file <bundle.zip> --catalog-file <catalog.json> --author-name \"<contributor>\" --yes"),
                        Map.entry("postPublishCommands", List.of(
                                "agenthub-cli labels add --skill @<namespace>/<slug> --label <label>",
                                "agenthub-cli relations sync --skill @<namespace>/<slug> --file <relations.json>"
                        ))
                )),
                Map.entry("capabilityLayers", List.of(
                        Map.of(
                                "layerId", "development-standards",
                                "displayName", "第一层：开发规范层",
                                "intent", "编码、接口、配置、日志、CI、测试、发布和运维规范"
                        ),
                        Map.of(
                                "layerId", "capability-open",
                                "displayName", "第二层：能力开放层",
                                "intent", "CLI、Skill、Harness、模板、Dry Run、可观测和排查能力"
                        ),
                        Map.of(
                                "layerId", "business-orchestration",
                                "displayName", "第三层：业务编排层",
                                "intent", "业务能力、产品知识、跨服务协作边界和 Agent 连续调用"
                        )
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
