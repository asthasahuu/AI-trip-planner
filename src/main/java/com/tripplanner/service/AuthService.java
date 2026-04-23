package com.tripplanner.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tripplanner.dao.UserDAO;
import com.tripplanner.model.User;

import jakarta.servlet.http.HttpSession;

@Service
public class AuthService {

    @Autowired
    private UserDAO userDAO;
    public Map<String, Object> register(String name, String email,
                                        String password, HttpSession session) {

        Map<String, Object> resp = new HashMap<String, Object>();

        if (name == null || name.trim().isEmpty()) {
            resp.put("success", false);
            resp.put("message", "Name is required");
            return resp;
        }
        if (email == null || email.trim().isEmpty()) {
            resp.put("success", false);
            resp.put("message", "Email is required");
            return resp;
        }
        if (!email.contains("@")) {
            resp.put("success", false);
            resp.put("message", "Please enter a valid email address");
            return resp;
        }
        if (password == null || password.length() < 6) {
            resp.put("success", false);
            resp.put("message", "Password must be at least 6 characters");
            return resp;
        }
        if (userDAO.existsByEmail(email.trim())) {
            resp.put("success", false);
            resp.put("message", "This email is already registered");
            return resp;
        }

        String hashed = hashPassword(password);

        User newUser = new User();
        newUser.setName(name.trim());
        newUser.setEmail(email.trim());
        newUser.setPasswordHash(hashed);
        int newId = userDAO.save(newUser);
        session.setAttribute("userId",   newId);
        session.setAttribute("userName", name.trim());
        session.setAttribute("email",    email.trim());

        // Return success
        resp.put("success",  true);
        resp.put("message",  "Registration successful");
        resp.put("userId",   newId);
        resp.put("userName", name.trim());
        resp.put("email",    email.trim());
        return resp;
    }

  
    public Map<String, Object> login(String email, String password,HttpSession session) {
        Map<String, Object> resp = new HashMap<String, Object>();
        if (email == null || email.trim().isEmpty()) {
            resp.put("success", false);
            resp.put("message", "Please enter your email");
            return resp;
        }
        if (password == null || password.isEmpty()) {
            resp.put("success", false);
            resp.put("message", "Please enter your password");
            return resp;
        }
        User user = userDAO.findByEmail(email.trim());
        if (user == null) {
            resp.put("success", false);
            resp.put("message", "No account found with this email");
            return resp;
        }
        String hashedInput = hashPassword(password);
        String storedHash  = user.getPasswordHash();

        if (storedHash == null || !storedHash.equals(hashedInput)) {
            resp.put("success", false);
            resp.put("message", "Incorrect password. Please try again.");
            return resp;
        }

        // Set HTTP session
        session.setAttribute("userId",   user.getId());
        session.setAttribute("userName", user.getName());
        session.setAttribute("email",    user.getEmail());

        // Return success
        resp.put("success",  true);
        resp.put("message",  "Login successful");
        resp.put("userId",   user.getId());
        resp.put("userName", user.getName());
        resp.put("email",    user.getEmail());
        return resp;
    }

    public void logout(HttpSession session) {
        session.invalidate();
    }

 
    public Map<String, Object> getSessionInfo(HttpSession session) {
        Map<String, Object> resp = new HashMap<String, Object>();
        Object userId = session.getAttribute("userId");

        if (userId == null) {
            resp.put("loggedIn", false);
        } else {
            resp.put("loggedIn",  true);
            resp.put("userId",    userId);
            resp.put("userName",  session.getAttribute("userName"));
            resp.put("email",     session.getAttribute("email"));
        }
        return resp;
    }

 
    // HASH PASSWORD using SHA-256 (Java built-in, no external jar)

    public String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(
                password.getBytes(StandardCharsets.UTF_8)
            );
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < hashBytes.length; i++) {
                String h = Integer.toHexString(0xff & hashBytes[i]);
                if (h.length() == 1) {
                    hex.append('0');
                }
                hex.append(h);
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}