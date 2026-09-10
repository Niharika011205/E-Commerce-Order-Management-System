package com.example.Cart_Service.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    
                    // Explicitly pass the access_token cookie
                    if (request.getCookies() != null) {
                        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                            if ("access_token".equals(cookie.getName())) {
                                template.header("Cookie", "access_token=" + cookie.getValue());
                            }
                        }
                    }

                    // Forward Authorization header if present
                    String authorization = request.getHeader("Authorization");
                    if (authorization != null) {
                        template.header("Authorization", authorization);
                    }
                }
            }
        };
    }
}
