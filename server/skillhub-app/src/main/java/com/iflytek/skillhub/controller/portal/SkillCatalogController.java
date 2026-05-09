package com.iflytek.skillhub.controller.portal;

import com.iflytek.skillhub.controller.BaseApiController;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.SkillCatalogProfileResponse;
import com.iflytek.skillhub.dto.SkillCatalogRelationResponse;
import com.iflytek.skillhub.dto.SkillCatalogUpsertRequest;
import com.iflytek.skillhub.dto.SkillRelationsUpdateRequest;
import com.iflytek.skillhub.service.AuditRequestContext;
import com.iflytek.skillhub.service.SkillCatalogAppService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class SkillCatalogController extends BaseApiController {

    private final SkillCatalogAppService skillCatalogAppService;

    public SkillCatalogController(SkillCatalogAppService skillCatalogAppService,
                                  ApiResponseFactory responseFactory) {
        super(responseFactory);
        this.skillCatalogAppService = skillCatalogAppService;
    }

    @GetMapping({"/api/v1/skills/{namespace}/{slug}/catalog", "/api/web/skills/{namespace}/{slug}/catalog"})
    public ApiResponse<SkillCatalogProfileResponse> getCatalog(@PathVariable String namespace,
                                                               @PathVariable String slug,
                                                               @RequestAttribute(value = "userId", required = false) String userId,
                                                               @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles) {
        return ok("response.success.read", skillCatalogAppService.getCatalog(
                namespace,
                slug,
                userId,
                userNsRoles != null ? userNsRoles : Map.of()
        ));
    }

    @PutMapping({"/api/v1/skills/{namespace}/{slug}/catalog", "/api/web/skills/{namespace}/{slug}/catalog"})
    public ApiResponse<SkillCatalogProfileResponse> updateCatalog(@PathVariable String namespace,
                                                                  @PathVariable String slug,
                                                                  @RequestBody SkillCatalogUpsertRequest request,
                                                                  @RequestAttribute("userId") String userId,
                                                                  @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles,
                                                                  HttpServletRequest httpRequest) {
        return ok("response.success.updated", skillCatalogAppService.updateCatalog(
                namespace,
                slug,
                request,
                userId,
                userNsRoles != null ? userNsRoles : Map.of(),
                AuditRequestContext.from(httpRequest)
        ));
    }

    @GetMapping({"/api/v1/skills/{namespace}/{slug}/relations", "/api/web/skills/{namespace}/{slug}/relations"})
    public ApiResponse<List<SkillCatalogRelationResponse>> getRelations(@PathVariable String namespace,
                                                                        @PathVariable String slug,
                                                                        @RequestAttribute(value = "userId", required = false) String userId,
                                                                        @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles) {
        return ok("response.success.read", skillCatalogAppService.getRelations(
                namespace,
                slug,
                userId,
                userNsRoles != null ? userNsRoles : Map.of()
        ));
    }

    @PutMapping({"/api/v1/skills/{namespace}/{slug}/relations", "/api/web/skills/{namespace}/{slug}/relations"})
    public ApiResponse<List<SkillCatalogRelationResponse>> updateRelations(@PathVariable String namespace,
                                                                           @PathVariable String slug,
                                                                           @RequestBody SkillRelationsUpdateRequest request,
                                                                           @RequestAttribute("userId") String userId,
                                                                           @RequestAttribute(value = "userNsRoles", required = false) Map<Long, NamespaceRole> userNsRoles,
                                                                           HttpServletRequest httpRequest) {
        return ok("response.success.updated", skillCatalogAppService.updateRelations(
                namespace,
                slug,
                request.relations() != null ? request.relations() : List.of(),
                userId,
                userNsRoles != null ? userNsRoles : Map.of(),
                AuditRequestContext.from(httpRequest)
        ));
    }
}
