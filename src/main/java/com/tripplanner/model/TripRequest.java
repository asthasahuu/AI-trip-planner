package com.tripplanner.model;

import java.util.List;

public class TripRequest {

    private String       destination;
    private int          days;
    private String       budget;
    private String       travelType;
    private List<String> interests;
    private String       travelDate;   // NEW: "2026-06-15" format (YYYY-MM-DD)

    public TripRequest() {}

    public String       getDestination()            { return destination; }
    public void         setDestination(String d)    { this.destination = d; }

    public int          getDays()                   { return days; }
    public void         setDays(int d)              { this.days = d; }

    public String       getBudget()                 { return budget; }
    public void         setBudget(String b)         { this.budget = b; }

    public String       getTravelType()             { return travelType; }
    public void         setTravelType(String t)     { this.travelType = t; }

    public List<String> getInterests()              { return interests; }
    public void         setInterests(List<String> i){ this.interests = i; }

    public String       getTravelDate()             { return travelDate; }
    public void         setTravelDate(String d)     { this.travelDate = d; }
}