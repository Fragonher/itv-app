package com.example.itv_app.config;

import com.example.itv_app.controller.AuthController;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

@Component
public class AuthFilter implements Filter {

    private static final Set<String> RUTAS_PUBLICAS = Set.of(
            "/login.html",
            "/login.js",
            "/style.css",
            "/manifest.webmanifest",
            "/sw.js",
            "/favicon.ico",
            "/error",
            "/api/login",
            "/api/session"
    );

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        String ruta = request.getRequestURI();

        if (esRutaPublica(ruta) || estaAutenticado(request)) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        if (ruta.startsWith("/api/")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        response.sendRedirect("/login.html");
    }

    private boolean esRutaPublica(String ruta) {
        return RUTAS_PUBLICAS.contains(ruta)
                || ruta.startsWith("/assets/")
                || ruta.startsWith("/icon");
    }

    private boolean estaAutenticado(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return session != null && Boolean.TRUE.equals(session.getAttribute(AuthController.SESION_AUTENTICADA));
    }
}
