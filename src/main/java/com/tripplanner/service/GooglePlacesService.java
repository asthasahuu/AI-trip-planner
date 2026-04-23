package com.tripplanner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.util.concurrent.TimeUnit;

/**
 * GooglePlacesService
 * ──────────────────────────────────────────────────────────────
 * Fetches REAL, ACCURATE place photos using Google Places API.
 *
 * Flow:
 *   Step A → Text Search API  → finds correct place → gets photo_reference
 *   Step B → Place Photo URL  → constructs direct image URL (800px)
 *
 * Setup:
 *   1. console.cloud.google.com → New Project
 *   2. Enable "Places API" (legacy)
 *   3. Credentials → Create API Key
 *   4. Eclipse → Run → Run Configurations → Environment tab
 *      Name:  GOOGLE_API_KEY
 *      Value: AIzaSy_your_key_here
 *
 * Cost: $200 free credit/month (~5,000 Text Search calls free)
 * ──────────────────────────────────────────────────────────────
 */
@Service
public class GooglePlacesService {

    private static final Logger log = LoggerFactory.getLogger(GooglePlacesService.class);

    // Read from environment — never hardcode
    private static final String API_KEY =
        System.getenv("GOOGLE_API_KEY") != null ? System.getenv("GOOGLE_API_KEY").trim() : "";

    // Text Search: finds the exact place and returns photo_reference
    // More accurate than Find Place — handles full place names with city
    private static final String TEXT_SEARCH_URL =
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
        + "?query=%s"
        + "&fields=name,photos"
        + "&key=%s";

    // Photo URL: constructs direct image link from photo_reference
    private static final String PHOTO_URL =
        "https://maps.googleapis.com/maps/api/place/photo"
        + "?maxwidth=800"
        + "&photo_reference=%s"
        + "&key=%s";

    private final OkHttpClient http = new OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .build();

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Returns a real Google Places photo URL for the given place.
     *
     * @param placeName  Exact place name, e.g. "Rajwada Palace"
     * @param city       City name, e.g. "Indore" — improves accuracy
     * @return photo URL string, or null if not found / API key missing
     */
    public String getPlacePhoto(String placeName, String city) {

        // Skip if no API key configured
        if (API_KEY.isEmpty()) {
            log.debug("GOOGLE_API_KEY not set — skipping for '{}'", placeName);
            return null;
        }
        if (placeName == null || placeName.trim().isEmpty()) return null;

        try {
            // Build specific query: "Rajwada Palace, Indore, India"
            String query = placeName.trim();
            if (city != null && !city.trim().isEmpty()) {
                query = query + ", " + city.trim();
            }
            query = query + ", India";   // helps narrow results to India

            String encoded = URLEncoder.encode(query, "UTF-8");
            String url     = String.format(TEXT_SEARCH_URL, encoded, API_KEY);

            log.debug("GooglePlaces TextSearch: '{}'", query);

            Request req = new Request.Builder()
                .url(url)
                .addHeader("Accept", "application/json")
                .get()
                .build();

            Response resp = http.newCall(req).execute();
            if (!resp.isSuccessful()) {
                log.warn("GooglePlaces HTTP {} for '{}'", resp.code(), query);
                return null;
            }

            String body   = resp.body().string();
            JsonNode root = mapper.readTree(body);

            // Check API response status
            String status = root.path("status").asText("");
            if ("REQUEST_DENIED".equals(status)) {
                log.error("GooglePlaces REQUEST_DENIED — verify GOOGLE_API_KEY and enable Places API");
                return null;
            }
            if ("OVER_QUERY_LIMIT".equals(status)) {
                log.warn("GooglePlaces quota exceeded");
                return null;
            }
            if (!"OK".equals(status)) {
                log.debug("GooglePlaces status='{}' for '{}'", status, query);
                return null;
            }

            // Get first result's photo reference
            JsonNode results = root.path("results");
            if (results.size() == 0) {
                log.debug("GooglePlaces: no results for '{}'", query);
                return null;
            }

            JsonNode photos = results.get(0).path("photos");
            if (photos.size() == 0) {
                log.debug("GooglePlaces: no photos for '{}'", query);
                return null;
            }

            String photoRef = photos.get(0).path("photo_reference").asText("");
            if (photoRef.isEmpty()) return null;

            // Construct final photo URL
            String photoUrl = String.format(PHOTO_URL, photoRef, API_KEY);
            log.info("✅ GooglePlaces photo found: '{}' → ref={}...", query, photoRef.substring(0, Math.min(20, photoRef.length())));
            return photoUrl;

        } catch (Exception e) {
            log.error("GooglePlaces error for '{}': {}", placeName, e.getMessage());
            return null;
        }
    }
}