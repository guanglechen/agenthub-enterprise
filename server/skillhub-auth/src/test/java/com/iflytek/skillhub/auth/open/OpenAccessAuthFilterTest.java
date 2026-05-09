package com.iflytek.skillhub.auth.open;

import com.iflytek.skillhub.auth.entity.Role;
import com.iflytek.skillhub.auth.entity.UserRoleBinding;
import com.iflytek.skillhub.auth.repository.UserRoleBindingRepository;
import com.iflytek.skillhub.auth.session.PlatformSessionService;
import com.iflytek.skillhub.domain.user.UserAccount;
import com.iflytek.skillhub.domain.user.UserAccountRepository;
import jakarta.servlet.FilterChain;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OpenAccessAuthFilterTest {

    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final UserRoleBindingRepository userRoleBindingRepository = mock(UserRoleBindingRepository.class);
    private final PlatformSessionService platformSessionService = mock(PlatformSessionService.class);
    private final OpenAccessAuthProperties properties = new OpenAccessAuthProperties();
    private final OpenAccessAuthFilter filter = new OpenAccessAuthFilter(
            userAccountRepository,
            userRoleBindingRepository,
            platformSessionService,
            properties
    );

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousRequestShouldEstablishOpenAccessSession() throws Exception {
        properties.setUserId("open-admin");
        properties.setProviderCode("open-access");
        UserAccount user = new UserAccount("open-admin", "Open Admin", "open-admin@example.com", null);
        Role role = mock(Role.class);
        when(role.getCode()).thenReturn("SUPER_ADMIN");
        UserRoleBinding binding = mock(UserRoleBinding.class);
        when(binding.getRole()).thenReturn(role);

        when(userAccountRepository.findById("open-admin")).thenReturn(Optional.of(user));
        when(userRoleBindingRepository.findByUserId("open-admin")).thenReturn(List.of(binding));

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilter(request, response, filterChain);

        verify(platformSessionService).establishSession(any(), any(MockHttpServletRequest.class), anyBoolean());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void authenticatedRequestShouldNotOverrideExistingSecurityContext() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("existing-user", null, List.of())
        );

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilter(request, response, filterChain);

        verify(platformSessionService, never()).establishSession(any(), any(), anyBoolean());
        verify(userAccountRepository, never()).findById(any());
        verify(filterChain).doFilter(request, response);
    }
}
