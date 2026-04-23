package com.tripplanner.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Trip POJO.
 * NOTE: Never serialized directly by Jackson.
 * TripController always builds Map/ObjectNode manually.
 */
public class Trip {

    private int           id;
    private int           userId;
    private String        destination;
    private int           days;
    private String        budget;
    private String        travelType;
    private String        interests;
    private String        itineraryJson;
    private LocalDateTime createdAt;

    public Trip() {}

    public int    getId()                  { return id; }
    public void   setId(int id)            { this.id = id; }
    public int    getUserId()              { return userId; }
    public void   setUserId(int u)         { this.userId = u; }
    public String getDestination()         { return destination; }
    public void   setDestination(String d) { this.destination = d; }
    public int    getDays()                { return days; }
    public void   setDays(int d)           { this.days = d; }
    public String getBudget()              { return budget; }
    public void   setBudget(String b)      { this.budget = b; }
    public String getTravelType()          { return travelType; }
    public void   setTravelType(String t)  { this.travelType = t; }
    public String getInterests()           { return interests; }
    public void   setInterests(String i)   { this.interests = i; }
    public String getItineraryJson()            { return itineraryJson; }
    public void   setItineraryJson(String j)    { this.itineraryJson = j; }
    public LocalDateTime getCreatedAt()                { return createdAt; }
    public void          setCreatedAt(LocalDateTime t) { this.createdAt = t; }

    /** Safe string — used in responses instead of LocalDateTime */
    public String getCreatedAtStr() {
        if (createdAt == null) return "";
        try { return createdAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")); }
        catch (Exception e) { return createdAt.toString(); }
    }
}