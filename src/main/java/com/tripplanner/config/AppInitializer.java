package com.tripplanner.config;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRegistration;
import org.springframework.web.WebApplicationInitializer;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.DispatcherServlet;

public class AppInitializer implements WebApplicationInitializer {

    @Override
    public void onStartup(ServletContext ctx) throws ServletException {

        AnnotationConfigWebApplicationContext context =new AnnotationConfigWebApplicationContext();
        context.register(AppConfig.class, WebConfig.class);

        DispatcherServlet dispatcher = new DispatcherServlet(context);
        dispatcher.setThrowExceptionIfNoHandlerFound(false);

        ServletRegistration.Dynamic reg =ctx.addServlet("dispatcher", dispatcher);
        reg.setLoadOnStartup(1);
        reg.addMapping("/api/*");

     
        ctx.getSessionCookieConfig().setHttpOnly(true);
        ctx.getSessionCookieConfig().setMaxAge(86400);
    }
}