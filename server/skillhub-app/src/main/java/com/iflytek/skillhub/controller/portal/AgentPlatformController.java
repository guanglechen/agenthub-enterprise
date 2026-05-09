package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.dto.AgentInstallPlanRequest;
import com.iflytek.skillhub.dto.AgentInstallPlanResponse;
import com.iflytek.skillhub.dto.AgentPlatformProfileResponse;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.ratelimit.RateLimit;
import com.iflytek.skillhub.service.AgentPlatformAppService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/agent", "/api/web/agent"})
public class AgentPlatformController extends BaseApiController {
    private final AgentPlatformAppService agentPlatformAppService;

    public AgentPlatformController(AgentPlatformAppService agentPlatformAppService,
                                   ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.agentPlatformAppService = agentPlatformAppService;
    }

    @GetMapping("/profile")
    @RateLimit(category = "search", authenticated = 60, anonymous = 20)
    public ApiResponse<AgentPlatformProfileResponse> getProfile() {
        return ok("response.success.read", agentPlatformAppService.getPlatformProfile());
    }

    @PostMapping("/install-plan")
    @RateLimit(category = "search", authenticated = 30, anonymous = 10)
    public ApiResponse<AgentInstallPlanResponse> buildInstallPlan(
            @RequestBody(required = false) AgentInstallPlanRequest request,
            @RequestAttribute(value = "userId", required = false) String userId,
            @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles) {
        AgentInstallPlanRequest normalizedRequest = request != null
                ? request
                : new AgentInstallPlanRequest(null, null, null, null, null, null, null, null, List.of(), List.of(), null);
        return ok("response.success.read", agentPlatformAppService.buildInstallPlan(
                normalizedRequest,
                userId,
                userNsRoles != null ? userNsRoles : Map.of()
        ));
    }
}
