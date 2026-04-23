package com.tripplanner.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

public class User {
    private int    id;
    private String name;
    private String email;
    @JsonIgnore
    private String passwordHash;
    private LocalDateTime createdAt;

    public User() {}

    public int    getId()           { return id; }
    public void   setId(int id)     { this.id = id; }
    public String getName()         { return name; }
    public void   setName(String n) { this.name = n; }
    public String getEmail()        { return email; }
    public void   setEmail(String e){ this.email = e; }
    public String getPasswordHash() { return passwordHash; }
    public void   setPasswordHash(String h) { this.passwordHash = h; }
    public LocalDateTime getCreatedAt()              { return createdAt; }
    public void          setCreatedAt(LocalDateTime t){ this.createdAt = t; }
}

// private static final String GEMINI_API_KEY = "AIzaSyCvutjRuieT8yyPJRESoSc3aRniw3Ukzsc";
//private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;