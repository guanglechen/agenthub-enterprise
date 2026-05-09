package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.SkillRecommendationContextRequest;
import com.iflytek.skillhub.dto.SkillRecommendationResponse;
import com.iflytek.skillhub.service.SkillCatalogAppService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class SkillRecommendationController extends BaseApiController {

    private final SkillCatalogAppService skillCatalogAppService;

    public SkillRecommendationController(SkillCatalogAppService skillCatalogAppService,
                                         ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.skillCatalogAppService = skillCatalogAppService;
    }

    @GetMapping({"/api/v1/skills/{namespace}/{slug}/recommendations", "/api/web/skills/{namespace}/{slug}/recommendations"})
    public ApiResponse<List<SkillRecommendationResponse>> getSkillRecommendations(@PathVariable String namespace,
                                                                                  @PathVariable String slug,
                                                                                  @RequestAttribute(value = "userId", required = false) String userId,
                                                                                  @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles) {
        return ok("response.success.read", skillCatalogAppService.getRecommendations(
                namespace,
                slug,
                userId,
                userNsRoles != null ? userNsRoles : Map.of()
        ));
    }

    @PostMapping({"/api/v1/recommendations/context", "/api/web/recommendations/context"})
    public ApiResponse<List<SkillRecommendationResponse>> getContextRecommendations(@RequestBody SkillRecommendationContextRequest request,
                                                                                    @RequestAttribute(value = "userId", required = false) String userId,
                                                                                    @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles) {
        return ok("response.success.read", skillCatalogAppService.recommendByContext(
                request,
                userId,
                userNsRoles != null ? userNsRoles : Map.of()
        ));
    }
}
