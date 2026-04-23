package com.tripplanner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tripplanner.dao.TripDAO;
import com.tripplanner.model.Trip;
import com.tripplanner.model.TripRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TripService {

    private static final Logger log = LoggerFactory.getLogger(TripService.class);

    @Autowired private TripDAO             tripDAO;
    @Autowired private GeminiService       geminiService;
    @Autowired private GooglePlacesService googlePlacesService;

    private final ObjectMapper mapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────────
    //  GENERATE + INJECT IMAGES + SAVE
    // ─────────────────────────────────────────────────────────
    public Map<String, Object> generateAndSave(TripRequest req, int userId) {
        Map<String, Object> resp = new HashMap<>();

        // ── Validate ──────────────────────────────────────────
        if (blank(req.getDestination()))  return fail("Destination is required");
        if (req.getDays() < 1 || req.getDays() > 30) return fail("Days must be 1–30");
        if (blank(req.getBudget()))       return fail("Budget is required");
        if (blank(req.getTravelType()))   return fail("Travel type is required");
        if (req.getInterests() == null || req.getInterests().isEmpty())
            return fail("Please select at least one interest");

        // ── Step 1: Gemini generates raw itinerary JSON ───────
        String rawJson;
        try {
            rawJson = geminiService.generateItinerary(req);
            log.info("Gemini OK: dest='{}' days={}", req.getDestination(), req.getDays());
        } catch (Exception e) {
            log.error("Gemini failed for '{}'", req.getDestination(), e);
            return fail("AI generation failed: " + e.getMessage());
        }

        // ── Step 2: Parse JSON, inject real Google photo URLs ─
        //    For every place node → call GooglePlacesService
        //    Add "photoUrl" field → save enriched JSON
        String finalJson = injectGooglePhotos(rawJson, req.getDestination());

        // ── Step 3: Save enriched trip to DB ──────────────────
        Trip trip = new Trip();
        trip.setUserId(userId);
        trip.setDestination(req.getDestination().trim());
        trip.setDays(req.getDays());
        trip.setBudget(req.getBudget().trim());
        trip.setTravelType(req.getTravelType().trim());
        trip.setInterests(String.join(", ", req.getInterests()));
        trip.setItineraryJson(finalJson);

        int savedId = tripDAO.save(trip);
        log.info("Trip saved: id={} dest='{}'", savedId, trip.getDestination());

        // ── Step 4: Return response ───────────────────────────
        resp.put("success",     true);
        resp.put("tripId",      savedId);
        resp.put("destination", trip.getDestination());
        resp.put("days",        trip.getDays());
        resp.put("budget",      trip.getBudget());
        resp.put("travelType",  trip.getTravelType());
        resp.put("interests",   trip.getInterests());
        resp.put("itinerary",   finalJson);
        return resp;
    }

    // ─────────────────────────────────────────────────────────
    //  INJECT GOOGLE PLACE PHOTOS INTO ITINERARY JSON
    //
    //  Parses the Gemini JSON array.
    //  For every non-unavailable place, calls Google Places API.
    //  Injects "photoUrl" field directly into the place's JSON node.
    //  Returns the updated JSON string ready for DB storage.
    //
    //  If Google API key is not set → returns JSON unchanged
    //  (frontend will use Wikipedia / KNOWN_IMGS fallback)
    // ─────────────────────────────────────────────────────────
    private String injectGooglePhotos(String itineraryJson, String destination) {
        try {
            JsonNode root = mapper.readTree(itineraryJson);
            if (!root.isArray()) {
                log.warn("injectGooglePhotos: JSON is not an array");
                return itineraryJson;
            }

            int injected = 0;
            int skipped  = 0;

            for (JsonNode dayNode : root) {
                JsonNode placesNode = dayNode.path("places");
                if (!placesNode.isArray()) continue;

                for (JsonNode placeNode : placesNode) {

                    // Skip unavailable interest cards
                    if (placeNode.path("isUnavailable").asBoolean(false)) {
                        skipped++;
                        continue;
                    }

                    String name = placeNode.path("name").asText("").trim();
                    if (name.isEmpty()) { skipped++; continue; }

                    // Call Google Places Text Search → get real photo URL
                    String photoUrl = googlePlacesService.getPlacePhoto(name, destination);

                    // Inject into JSON node
                    if (photoUrl != null && !photoUrl.isEmpty()) {
                        ((ObjectNode) placeNode).put("photoUrl", photoUrl);
                        injected++;
                    } else {
                        // Empty string — frontend uses fallback chain
                        ((ObjectNode) placeNode).put("photoUrl", "");
                        skipped++;
                    }
                }
            }

            log.info("Photos injected: {} places, {} skipped/not-found for '{}'",
                injected, skipped, destination);

            return mapper.writeValueAsString(root);

        } catch (Exception e) {
            log.error("injectGooglePhotos failed for '{}': {}", destination, e.getMessage());
            return itineraryJson; // return original JSON — do not break the flow
        }
    }

    // ─────────────────────────────────────────────────────────
    //  CRUD
    // ─────────────────────────────────────────────────────────
    public List<Trip> getMyTrips(int userId)        { return tripDAO.findByUserId(userId); }
    public Trip       getTripById(int id)            { return tripDAO.findById(id); }
    public boolean    deleteTrip(int id, int userId) { return tripDAO.delete(id, userId); }

    // ─────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────
    private boolean blank(String s) { return s == null || s.trim().isEmpty(); }

    private Map<String, Object> fail(String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("success", false);
        m.put("message", msg);
        return m;
    }
}