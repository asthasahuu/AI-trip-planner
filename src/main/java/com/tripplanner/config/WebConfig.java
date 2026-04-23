package com.tripplanner.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET","POST","PUT","DELETE","OPTIONS","HEAD")
                .allowedHeaders("*").exposedHeaders("*")
                .allowCredentials(true).maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. Sabse zaroori: Ye line saari static files (CSS/JS/Images) ko handle karegi
        registry.addResourceHandler("/static/**")
                .addResourceLocations("/static/");

        // 2. Agar aapki HTML files webapp folder ke root mein hain
        registry.addResourceHandler("/*.html")
                .addResourceLocations("/");
        
        // 3. Fallback handlers (Security ke liye)
        registry.addResourceHandler("/css/**").addResourceLocations("/static/css/");
        registry.addResourceHandler("/js/**").addResourceLocations("/static/js/");
    }
}