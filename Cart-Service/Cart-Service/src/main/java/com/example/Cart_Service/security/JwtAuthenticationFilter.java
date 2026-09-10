package com.example.Cart_Service.security;

import com.example.Cart_Service.dto.response.AuthValidationResponse;
import com.example.Cart_Service.feign.AuthServiceClient;
import feign.FeignException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT Authentication Filter — runs once per request.
 *
 * Flow:
 *   1. Extract "access_token" cookie from the request.
 *   2. If present and SecurityContext is empty, call Auth-Service via Feign
 *      (GET /auth/validate with "Authorization: Bearer {token}").
 *   3. On success, build an AuthenticatedUser principal and store it in
 *      the SecurityContextHolder so controllers can access userId + role.
 *   4. On any failure (invalid token, expired, Auth-Service down), log
 *      the error and proceed as unauthenticated — Spring Security handles rejection.
 *
 * Token source: HttpOnly cookie named "access_token" (same as Auth-Service).
 * This is NOT the Authorization header — the token is a browser cookie.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private AuthServiceClient authServiceClient;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 1. Extract access_token from cookie
        String token = extractTokenFromCookie(request, "access_token");

        // 2. Only attempt validation if token present and context is not already populated
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                // 3. Call Auth-Service to validate token — throws FeignException on 4xx/5xx
                AuthValidationResponse validationResponse =
                        authServiceClient.validateToken("Bearer " + token);

                if (validationResponse != null
                        && validationResponse.getUserId() != null
                        && validationResponse.getUsername() != null
                        && validationResponse.getRole() != null) {

                    // 4. Build principal from validated claims (no DB lookup needed)
                    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
                            validationResponse.getUserId(),
                            validationResponse.getUsername(),
                            validationResponse.getRole()
                    );

                    // 5. Map role to Spring Security GrantedAuthority (prefix with "ROLE_")
                    List<SimpleGrantedAuthority> authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_" + validationResponse.getRole())
                    );

                    // 6. Create authentication token and set in SecurityContext
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    authenticatedUser, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    log.debug("Authenticated user: {} [{}] for request: {}",
                            validationResponse.getUsername(),
                            validationResponse.getRole(),
                            request.getRequestURI());
                }

            } catch (FeignException.Unauthorized | FeignException.Forbidden e) {
                // Token is invalid or expired — Auth-Service returned 401/403
                log.warn("Token validation rejected by Auth-Service for {}: {}",
                        request.getRequestURI(), e.getMessage());
                // Proceed as unauthenticated — Spring Security will reject if endpoint requires auth

            } catch (FeignException e) {
                // Auth-Service returned other 4xx/5xx (e.g. 500) or is unreachable
                log.error("Auth-Service error during token validation for {}: {} [status={}]",
                        request.getRequestURI(), e.getMessage(), e.status());
                // Proceed as unauthenticated

            } catch (Exception e) {
                // Network failure, timeout, or unexpected error
                log.error("Unexpected error during token validation for {}: {}",
                        request.getRequestURI(), e.getMessage());
                // Proceed as unauthenticated
            }
        }

        // Always continue the filter chain — Spring Security handles rejection
        filterChain.doFilter(request, response);
    }

    /**
     * Extract the value of a named cookie from the HTTP request.
     * Returns null if the cookie is absent.
     */
    private String extractTokenFromCookie(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookieName.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
