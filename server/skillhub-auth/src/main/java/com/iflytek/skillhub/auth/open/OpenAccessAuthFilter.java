package com.iflytek.skillhub.auth.open;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.auth.rbac.PlatformRoleDefaults;
import com.iflytek.skillhub.auth.repository.UserRoleBindingRepository;
import com.iflytek.skillhub.auth.session.PlatformSessionService;
import com.iflytek.skillhub.domain.user.UserAccount;
import com.iflytek.skillhub.domain.user.UserAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Open-access mode filter that auto-establishes a platform session for every
 * anonymous request using a configured bootstrap account.
 */
@Component
@ConditionalOnProperty(name = "skillhub.auth.open-access.enabled", havingValue = "true")
@Order(-110)
public class OpenAccessAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(OpenAccessAuthFilter.class);

    private final UserAccountRepository userAccountRepository;
    private final UserRoleBindingRepository userRoleBindingRepository;
    private final PlatformSessionService platformSessionService;
    private final OpenAccessAuthProperties properties;
    private final AtomicBoolean missingUserWarningLogged = new AtomicBoolean(false);

    public OpenAccessAuthFilter(UserAccountRepository userAccountRepository,
                                UserRoleBindingRepository userRoleBindingRepository,
                                PlatformSessionService platformSessionService,
                                OpenAccessAuthProperties properties) {
        this.userAccountRepository = userAccountRepository;
        this.userRoleBindingRepository = userRoleBindingRepository;
        this.platformSessionService = platformSessionService;
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            establishOpenAccessSession(request);
        }
        filterChain.doFilter(request, response);
    }

    private void establishOpenAccessSession(HttpServletRequest request) {
        String userId = normalize(properties.getUserId());
        if (userId == null) {
            return;
        }

        userAccountRepository.findById(userId)
                .filter(UserAccount::isActive)
                .ifPresentOrElse(user -> {
                    Set<String> roles = PlatformRoleDefaults.withDefaultUserRole(
                            userRoleBindingRepository.findByUserId(userId).stream()
                                    .map(binding -> binding.getRole().getCode())
                                    .collect(Collectors.toSet())
                    );
                    PlatformPrincipal principal = new PlatformPrincipal(
                            user.getId(),
                            user.getDisplayName(),
                            user.getEmail(),
                            user.getAvatarUrl(),
                            normalize(properties.getProviderCode(), "open-access"),
                            roles
                    );
                    platformSessionService.establishSession(principal, request, false);
                }, () -> {
                    if (missingUserWarningLogged.compareAndSet(false, true)) {
                        log.warn(
                                "Open-access mode is enabled but configured user '{}' was not found or is inactive",
                                userId
                        );
                    }
                });
    }

    private String normalize(String value) {
        return normalize(value, null);
    }

    private String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
