package com.example.itv_app.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api")
public class AuthController {

    private static final String USUARIO = "Angel";
    private static final String PASSWORD = "Guerrero";
    public static final String SESION_AUTENTICADA = "usuarioAutenticado";

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequest loginRequest, HttpSession session) {
        if (!USUARIO.equals(loginRequest.usuario()) || !PASSWORD.equals(loginRequest.password())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuario o contrasena incorrectos");
        }

        session.setAttribute(SESION_AUTENTICADA, true);
        return ResponseEntity.ok(Map.of("estado", "ok"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("estado", "ok"));
    }

    @GetMapping("/session")
    public ResponseEntity<Map<String, Boolean>> session(HttpSession session) {
        boolean autenticado = Boolean.TRUE.equals(session.getAttribute(SESION_AUTENTICADA));
        return ResponseEntity.ok(Map.of("autenticado", autenticado));
    }

    public record LoginRequest(String usuario, String password) {
    }
}
