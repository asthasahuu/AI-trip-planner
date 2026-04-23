package com.tripplanner.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tripplanner.model.Trip;
import com.tripplanner.model.TripRequest;
import com.tripplanner.service.TripService;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/trips")
public class TripController {

    private static final Logger log = LoggerFactory.getLogger(TripController.class);
    private final ObjectMapper  mapper = new ObjectMapper();

    @Autowired private TripService tripService;

    /* ─────────────────────────────────────────────────────────
       POST /api/trips/generate
    ───────────────────────────────────────────────────────── */
    @PostMapping("/generate")
    public ResponseEntity<String> generate(
            @RequestBody TripRequest req, HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) return auth401();

            Map<String, Object> result = tripService.generateAndSave(req, userId);
            return ok(mapper.writeValueAsString(result));
        } catch (Exception e) {
            log.error("generate error", e);
            return err500("Generate failed: " + e.getMessage());
        }
    }

    /* ─────────────────────────────────────────────────────────
       GET /api/trips/my
    ───────────────────────────────────────────────────────── */
    @GetMapping("/my")
    public ResponseEntity<String> myTrips(HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) return auth401();

            List<Trip> trips = tripService.getMyTrips(userId);
            List<Map<String, Object>> list = new ArrayList<>();
            for (Trip t : trips) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",         t.getId());
                m.put("destination",safe(t.getDestination()));
                m.put("days",       t.getDays());
                m.put("budget",     safe(t.getBudget()));
                m.put("travelType", safe(t.getTravelType()));
                m.put("interests",  safe(t.getInterests()));
                m.put("createdAt",  t.getCreatedAtStr());
                list.add(m);
            }
            ObjectNode resp = mapper.createObjectNode();
            resp.put("success", true);
            resp.set("trips", mapper.valueToTree(list));
            return ok(mapper.writeValueAsString(resp));
        } catch (Exception e) {
            log.error("myTrips error", e);
            return err500("Could not load trips: " + e.getMessage());
        }
    }

    /* ─────────────────────────────────────────────────────────
       GET /api/trips/{id}
       THE HTTP 500 FIX:
       - Full try/catch with logging
       - itinerary_json parsed as JsonNode (no double-encode)
       - All fields null-safe
       - Returns ResponseEntity<String> — Jackson never touches Trip
    ───────────────────────────────────────────────────────── */
    @GetMapping("/{id}")
    public ResponseEntity<String> getTrip(
            @PathVariable("id") int id, HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) {
                log.warn("getTrip id={} — no session", id);
                return auth401();
            }

            log.info("getTrip id={} userId={}", id, userId);
            Trip trip = tripService.getTripById(id);

            if (trip == null) {
                log.warn("getTrip id={} — not found in DB", id);
                return ok("{\"success\":false,\"message\":\"Trip not found\"}");
            }

            log.info("getTrip id={} found dest={}", id, trip.getDestination());

            // Build JSON node by node — NO direct Trip serialization
            ObjectNode resp = mapper.createObjectNode();
            resp.put("success",     true);
            resp.put("tripId",      trip.getId());
            resp.put("destination", safe(trip.getDestination()));
            resp.put("days",        trip.getDays());
            resp.put("budget",      safe(trip.getBudget()));
            resp.put("travelType",  safe(trip.getTravelType()));
            resp.put("interests",   safe(trip.getInterests()));
            resp.put("travelDate",  "");
            resp.put("createdAt",   trip.getCreatedAtStr());

            // Embed itinerary: parse JSON string → JsonNode
            // This prevents double-encoding and special char issues
            String raw = trip.getItineraryJson();
            if (raw != null && !raw.trim().isEmpty()) {
                try {
                    String trimmed = raw.trim();
                    // Strip markdown fences if any
                    if (trimmed.startsWith("```")) {
                        int s = trimmed.indexOf('[');
                        int e = trimmed.lastIndexOf(']');
                        if (s >= 0 && e > s) trimmed = trimmed.substring(s, e + 1);
                    }
                    JsonNode node = mapper.readTree(trimmed);
                    resp.set("itinerary", node);
                    log.info("getTrip id={} itinerary parsed OK, days={}", id, node.size());
                } catch (Exception ex) {
                    log.error("getTrip id={} itinerary parse failed: {}", id, ex.getMessage());
                    // Send as raw string — frontend will handle
                    resp.put("itinerary", raw);
                }
            } else {
                log.warn("getTrip id={} itinerary_json is empty", id);
                resp.set("itinerary", mapper.createArrayNode());
            }

            String body = mapper.writeValueAsString(resp);
            log.info("getTrip id={} response size={}bytes", id, body.length());
            return ok(body);

        } catch (Exception e) {
            log.error("getTrip id={} FATAL: {}", id, e.getMessage(), e);
            return err500("Error loading trip: " + e.getMessage());
        }
    }

    /* ─────────────────────────────────────────────────────────
       DELETE /api/trips/{id}
    ───────────────────────────────────────────────────────── */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteTrip(
            @PathVariable("id") int id, HttpSession session) {
        try {
            Integer userId = (Integer) session.getAttribute("userId");
            if (userId == null) return auth401();
            boolean ok = tripService.deleteTrip(id, userId);
            return ok("{\"success\":" + ok + "}");
        } catch (Exception e) {
            log.error("deleteTrip error", e);
            return err500("Delete failed: " + e.getMessage());
        }
    }

    /* ─── helpers ─────────────────────────────────────────── */
    private ResponseEntity<String> ok(String body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
    private ResponseEntity<String> auth401() {
        return ResponseEntity.status(401).contentType(MediaType.APPLICATION_JSON)
            .body("{\"success\":false,\"message\":\"Please login first\"}");
    }
    private ResponseEntity<String> err500(String msg) {
        return ResponseEntity.status(500).contentType(MediaType.APPLICATION_JSON)
            .body("{\"success\":false,\"message\":\"" + msg.replace("\"","'") + "\"}");
    }
    private String safe(String s) { return s != null ? s : ""; }
}