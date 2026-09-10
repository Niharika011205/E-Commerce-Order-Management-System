package com.example.Auth_Service.service;

import com.example.Auth_Service.config.JwtConfig;
import com.example.Auth_Service.dto.request.LoginRequest;
import com.example.Auth_Service.dto.request.RegisterRequest;
import com.example.Auth_Service.dto.response.AuthResponse;
import com.example.Auth_Service.dto.response.AuthValidationResponse;
import com.example.Auth_Service.exception.InvalidTokenException;
import com.example.Auth_Service.exception.TokenExpiredException;
import com.example.Auth_Service.exception.UserAlreadyExistsException;
import com.example.Auth_Service.model.User;
import com.example.Auth_Service.model.UserRole;
import com.example.Auth_Service.repository.UserRepository;
import com.example.Auth_Service.security.CustomUserDetails;
import com.example.Auth_Service.security.JwtService;
import com.example.Auth_Service.util.CookieUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Core authentication business logic.
 *
 * Responsibilities:
 * - Registration (CUSTOMER/SELLER only — ADMIN rejected)
 * - Login (all roles — authenticates, generates tokens, sets cookies)
 * - Refresh (validates refresh token, rotates both tokens)
 * - Logout (clears DB refresh token + cookies)
 *
 * Production-level features:
 * - Refresh token rotation (new refresh token on every refresh)
 * - Token reuse detection (mismatch invalidates all sessions)
 * - Transactional DB operations
 */
@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private CookieUtil cookieUtil;

    @Autowired
    private JwtConfig jwtConfig;

    // =============================================
    // REGISTRATION
    // =============================================

    @Override
    public AuthResponse register(RegisterRequest request) {
        // 1. Validate and parse role
        UserRole role;
        try {
            role = UserRole.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + request.getRole()
                    + ". Allowed roles: CUSTOMER, SELLER");
        }

        // 2. Reject ADMIN registration
        if (role == UserRole.ADMIN) {
            throw new IllegalArgumentException("Admin registration is not allowed. "
                    + "Admin accounts are managed separately.");
        }

        // 3. Check for duplicate username
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException(
                    "Username already exists: " + request.getUsername());
        }

        // 4. Check for duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException(
                    "Email already exists: " + request.getEmail());
        }

        // 4.5 Check for duplicate phone
        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new UserAlreadyExistsException(
                    "Phone number already exists: " + request.getPhone());
        }

        // 5. Create user with encrypted password
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .build();

        User savedUser = userRepository.save(user);

        log.info("User registered successfully: {} with role: {}",
                savedUser.getUsername(), savedUser.getRole());

        // 6. Return success — NO JWT, NO cookies
        // User must login manually after registration
        return AuthResponse.builder()
                .message("Registration successful. Please login to continue.")
                .userId(savedUser.getId())
                .username(savedUser.getUsername())
                .role(savedUser.getRole().name())
                .build();
    }

    // =============================================
    // LOGIN
    // =============================================

    @Override
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        // 1. Authenticate via Spring Security AuthenticationManager
        // This delegates to CustomUserDetailsService → BCrypt password validation
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()
                )
        );

        // 2. Extract authenticated user
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        // 3. Generate tokens
        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getUsername(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(
                user.getId(), user.getUsername());

        // 4. Store refresh token in database
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(
                LocalDateTime.now().plusSeconds(jwtConfig.getRefreshExpiration() / 1000));
        userRepository.save(user);

        // 5. Set HttpOnly secure cookies
        ResponseCookie accessCookie = cookieUtil.createAccessTokenCookie(accessToken);
        ResponseCookie refreshCookie = cookieUtil.createRefreshTokenCookie(refreshToken);
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        log.info("User logged in successfully: {} [{}]",
                user.getUsername(), user.getRole());

        // 6. Return response — tokens are in cookies, NOT in response body
        return AuthResponse.builder()
                .message("Login successful")
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }

    // =============================================
    // REFRESH TOKEN
    // =============================================

    @Override
    public AuthResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
        // 1. Read refresh token from cookie
        String refreshToken = extractTokenFromCookie(request, "refresh_token");

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidTokenException("Refresh token is missing");
        }

        // 2. Validate the refresh token JWT (signature, expiration, issuer)
        String username;
        try {
            String tokenType = jwtService.extractTokenType(refreshToken);
            if (!"REFRESH".equals(tokenType)) {
                throw new InvalidTokenException("Invalid token type. Expected REFRESH token.");
            }
            username = jwtService.extractUsername(refreshToken);
        } catch (InvalidTokenException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidTokenException("Invalid or malformed refresh token");
        }

        // 3. Find user in database
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidTokenException("User not found for refresh token"));

        // 4. Validate stored refresh token matches (token reuse detection)
        if (user.getRefreshToken() == null || !user.getRefreshToken().equals(refreshToken)) {
            // SECURITY: Possible token reuse attack — invalidate all sessions
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
            userRepository.save(user);
            log.warn("Refresh token reuse detected for user: {}. All sessions invalidated.", username);
            throw new InvalidTokenException(
                    "Refresh token mismatch. All sessions have been invalidated for security.");
        }

        // 5. Check refresh token expiry in database
        if (user.getRefreshTokenExpiry() == null
                || user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
            userRepository.save(user);
            throw new TokenExpiredException("Refresh token has expired. Please login again.");
        }

        // 6. Generate new tokens (ROTATION — both tokens refreshed)
        String newAccessToken = jwtService.generateAccessToken(
                user.getId(), user.getUsername(), user.getRole().name());
        String newRefreshToken = jwtService.generateRefreshToken(
                user.getId(), user.getUsername());

        // 7. Update stored refresh token in database (rotation)
        user.setRefreshToken(newRefreshToken);
        user.setRefreshTokenExpiry(
                LocalDateTime.now().plusSeconds(jwtConfig.getRefreshExpiration() / 1000));
        userRepository.save(user);

        // 8. Set new cookies (replacing old ones)
        ResponseCookie accessCookie = cookieUtil.createAccessTokenCookie(newAccessToken);
        ResponseCookie refreshCookie = cookieUtil.createRefreshTokenCookie(newRefreshToken);
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        log.info("Tokens refreshed successfully for user: {}", user.getUsername());

        return AuthResponse.builder()
                .message("Token refreshed successfully")
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }

    // =============================================
    // LOGOUT
    // =============================================

    @Override
    public AuthResponse logout(HttpServletRequest request, HttpServletResponse response) {
        // 1. Try to identify user from access token cookie
        String accessToken = extractTokenFromCookie(request, "access_token");

        if (accessToken != null) {
            try {
                String username = jwtService.extractUsername(accessToken);
                User user = userRepository.findByUsername(username).orElse(null);

                if (user != null) {
                    // 2. Remove refresh token from database
                    user.setRefreshToken(null);
                    user.setRefreshTokenExpiry(null);
                    userRepository.save(user);
                    log.info("User logged out successfully: {}", username);
                }
            } catch (Exception e) {
                log.warn("Could not process access token during logout: {}", e.getMessage());
                // Continue with cookie clearing even if token is expired/invalid
            }
        }

        // 3. Clear both cookies regardless
        ResponseCookie clearAccess = cookieUtil.clearAccessTokenCookie();
        ResponseCookie clearRefresh = cookieUtil.clearRefreshTokenCookie();
        response.addHeader(HttpHeaders.SET_COOKIE, clearAccess.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());

        return AuthResponse.builder()
                .message("Logout successful")
                .build();
    }

    /**
     * Extracts a named cookie value from the HTTP request.
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

    // =============================================
    // TOKEN VALIDATION (inter-service)
    // =============================================

    /**
     * Validates an ACCESS JWT provided in the Authorization header.
     * Called by other microservices (e.g. Product-Service) via Feign on
     * every authenticated request. Does NOT perform a database lookup —
     * validation is entirely cryptographic (HMAC-SHA256 + issuer + expiry).
     *
     * @param authHeader  "Bearer <token>" value from the Authorization header
     * @return            User identity extracted from valid token claims
     * @throws InvalidTokenException   for malformed, invalid, or non-ACCESS tokens
     * @throws TokenExpiredException   when the token has passed its expiry time
     */
    @Override
    public AuthValidationResponse validateToken(String authHeader) {
        // 1. Validate header format
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new InvalidTokenException(
                    "Authorization header must start with 'Bearer '. Received: "
                            + (authHeader == null ? "null" : authHeader));
        }

        String token = authHeader.substring(7).trim();

        if (token.isBlank()) {
            throw new InvalidTokenException("JWT token must not be blank");
        }

        // 2. Parse and cryptographically validate the token.
        //    extractAllClaims() verifies: HMAC-SHA256 signature, issuer, and expiry.
        //    Throws ExpiredJwtException (subclass of JwtException) if expired.
        io.jsonwebtoken.Claims claims;
        try {
            claims = jwtService.extractAllClaims(token);
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new TokenExpiredException("Access token has expired. Please login again.");
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            throw new InvalidTokenException("Invalid or malformed token: " + e.getMessage());
        }

        // 3. Enforce ACCESS token type — reject REFRESH tokens
        String tokenType = claims.get("tokenType", String.class);
        if (!"ACCESS".equals(tokenType)) {
            throw new InvalidTokenException(
                    "Expected ACCESS token but received: " + tokenType
                            + ". REFRESH tokens cannot be used for authentication.");
        }

        // 4. Extract claims and return
        Long userId   = claims.get("userId", Long.class);
        String username = claims.getSubject();
        String role     = claims.get("role", String.class);

        log.debug("Token validated for user: {} [{}] (userId={})", username, role, userId);

        return AuthValidationResponse.builder()
                .userId(userId)
                .username(username)
                .role(role)
                .build();
    }
}
