package com.tripplanner.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tripplanner.service.AuthService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register( @RequestBody Map<String, String> body, HttpSession session) {

        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        Map<String, Object> result = authService.register(name, email, password, session);
        return ResponseEntity.ok(result);
    }

  
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login( @RequestBody Map<String, String> body, HttpSession session) {
        String email = body.get("email");
        String password = body.get("password");
        Map<String, Object> result = authService.login(email, password, session);
        return ResponseEntity.ok(result);
    }

   
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        authService.logout(session);
        java.util.Map<String, Object> resp = new java.util.HashMap<String, Object>();
        resp.put("success", true);
        resp.put("message", "Logged out");
        return ResponseEntity.ok(resp);
    }

  
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpSession session) {
        Map<String, Object> result = authService.getSessionInfo(session);
        return ResponseEntity.ok(result);
    }
}