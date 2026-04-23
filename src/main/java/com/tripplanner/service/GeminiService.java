package com.tripplanner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tripplanner.model.TripRequest;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private static final String GEMINI_API_KEY = System.getenv("GEMINI_API_KEY");

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="
            + GEMINI_API_KEY;
    private static final MediaType JSON_TYPE =
        MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────
    //  MAIN
    // ─────────────────────────────────────────────────────
    public String generateItinerary(TripRequest req) throws Exception {
        String prompt      = buildPrompt(req);
        String requestBody = buildRequestBody(prompt);

        log.info("Calling Gemini: dest={} days={} budget={} date={}",
            req.getDestination(), req.getDays(), req.getBudget(), req.getTravelDate());

        Request httpRequest = new Request.Builder()
            .url(GEMINI_URL)
            .post(RequestBody.create(requestBody, JSON_TYPE))
            .addHeader("Content-Type", "application/json")
            .build();

        Response response = httpClient.newCall(httpRequest).execute();
        try {
            if (!response.isSuccessful()) {
                String err = response.body() != null ? response.body().string() : "no body";
                log.error("Gemini error {} : {}", response.code(), err);
                throw new RuntimeException("Gemini API returned error " + response.code() + ": " + err);
            }
            return extractAndValidateJson(response.body().string());
        } finally {
            response.close();
        }
    }

    // ─────────────────────────────────────────────────────
    //  BUILD PROMPT
    // ─────────────────────────────────────────────────────
    private String buildPrompt(TripRequest req) {
        List<String> interests = req.getInterests();
        String interestStr = (interests == null || interests.isEmpty())
            ? "General Sightseeing" : join(interests, ", ");

        String dest       = req.getDestination();
        int    days       = req.getDays();
        String budget     = req.getBudget();
        String travel     = req.getTravelType();
        String travelDate = req.getTravelDate();

        StringBuilder sb = new StringBuilder();

        sb.append("You are an expert AI travel planner. Create a REALISTIC, HUMAN-LIKE ")
          .append(days).append("-day itinerary for ").append(dest).append(".\n\n");

        // ── TRIP INFO ──
        sb.append("=== TRIP INFO ===\n");
        sb.append("Destination: ").append(dest).append("\n");
        sb.append("Days: ").append(days).append("\n");
        sb.append("Budget: ").append(budget).append("\n");
        sb.append("Travelers: ").append(travel).append("\n");
        sb.append("Interests: ").append(interestStr).append("\n");
        if (travelDate != null && !travelDate.trim().isEmpty()) {
            sb.append("Travel Date: ").append(travelDate).append("\n");
            sb.append(getDateContext(travelDate)).append("\n");
            String season = getSeasonContext(travelDate, dest);
            if (!season.isEmpty()) sb.append(season).append("\n");
        }
        sb.append("\n");

        // ── BUDGET ──
        sb.append("=== BUDGET (strictly follow) ===\n");
        if ("Cheap".equalsIgnoreCase(budget)) {
            sb.append("Free/very cheap places only. Street food Rs.50-150. Local buses. No luxury.\n");
        } else if ("Moderate".equalsIgnoreCase(budget)) {
            sb.append("Mid-range. Restaurants Rs.200-500. Ola/Uber/auto. 2-3 star hotels.\n");
        } else {
            sb.append("Premium only. Fine dining Rs.800+. Private cab. 5-star resorts.\n");
        }
        sb.append("\n");

        // ── SMART INTEREST HANDLING ──
        sb.append("=== INTEREST HANDLING (CRITICAL RULES) ===\n");
        sb.append("For EACH selected interest, you MUST either:\n");
        sb.append("A) Include matching real places if they EXIST in ").append(dest).append("\n");
        sb.append("B) OR include a special 'NOT_AVAILABLE' entry explaining why + suggesting alternatives\n\n");

        for (String interest : (interests != null ? interests : new java.util.ArrayList<String>())) {
            sb.append(getInterestRule(interest, dest, budget));
        }
        sb.append("\n");

        // ── DAY STRUCTURE ──
        sb.append("=== ITINERARY RULES ===\n");
        sb.append("1. EXACTLY ").append(days).append(" days\n");
        sb.append("2. 3-4 places per day MAX — realistic timing\n");
        sb.append("3. Morning/Afternoon/Evening slots for each place\n");
        sb.append("4. Logical route — group nearby places\n");
        sb.append("5. Include travel time between places\n");
        sb.append("6. REAL searchable place names only\n");
        sb.append("7. No repetition across days\n");
        sb.append("8. ONLY valid JSON, no markdown\n\n");

        // ── JSON FORMAT ──
        sb.append("=== RETURN THIS EXACT JSON FORMAT — NO DEVIATIONS ===\n");
        sb.append("[\n");
        sb.append("  {\n");
        sb.append("    \"day\": 1,\n");
        sb.append("    \"theme\": \"Short catchy day theme (e.g. Heritage Morning & Street Food Evening)\",\n");
        sb.append("    \"dailyBudget\": \"Approx Rs.X-Y\",\n");
        sb.append("    \"places\": [\n");
        sb.append("      {\n");
        sb.append("        \"name\": \"Exact Real Place Name (must be searchable on Google Maps)\",\n");
        sb.append("        \"type\": \"Category (Heritage/Food/Nature/Beach/Temple/Museum etc)\",\n");
        sb.append("        \"isUnavailable\": false,\n");
        sb.append("        \"unavailableReason\": \"(only fill if isUnavailable=true)\",\n");
        sb.append("        \"suggestedAlternative\": \"(only fill if isUnavailable=true — real alternative in same city)\",\n");
        sb.append("        \"timeOfDay\": \"Morning OR Afternoon OR Evening\",\n");
        sb.append("        \"duration\": \"X hours\",\n");
        sb.append("        \"travelFromPrevious\": \"X min by auto/bus/walk from [previous place name]\",\n");
        sb.append("        \"description\": \"2-3 lines: what makes this place worth visiting\",\n");
        sb.append("        \"bestTime\": \"e.g. 9:00 AM - 11:00 AM\",\n");
        sb.append("        \"estimatedCost\": \"Rs.X entry / Rs.X for food\",\n");
        sb.append("        \"tip\": \"One practical insider tip\",\n");
        sb.append("        \"seasonalNote\": \"Season-specific advice (leave empty if none)\",\n");
        sb.append("        \"placeImageUrl\": \"\"\n");
        sb.append("      }\n");
        sb.append("    ]\n");
        sb.append("  }\n");
        sb.append("]\n\n");
        sb.append("ROUTING RULE: On each day, place all locations in geographical proximity. \n");
        sb.append("Order them so the traveler moves in ONE direction — no zig-zagging. \n");
        sb.append("E.g. Day 1: all North Indore places. Day 2: all Old City places.\n\n");
        sb.append("SEASONALITY RULE: If traveling in Summer (Apr-Jun) → suggest early morning (6-9am) \n");
        sb.append("for outdoor places and midday indoor places. If Monsoon (Jun-Sep) → suggest \n");
        sb.append("covered places and waterfalls. If Winter (Nov-Feb) → all outdoor timings are fine.\n\n");
        sb.append("UNAVAILABLE INTEREST RULE: If user selected an interest that does NOT exist \n");
        sb.append("in ").append(dest).append(", set isUnavailable=true, give specific reason, \n");
        sb.append("and suggest the BEST real alternative WITHIN ").append(dest).append(".\n\n");

        sb.append("EXAMPLE of unavailable interest entry:\n");
        sb.append("{\n");
        sb.append("  \"name\": \"Beaches Not Available\",\n");
        sb.append("  \"type\": \"NOT_AVAILABLE\",\n");
        sb.append("  \"isUnavailable\": true,\n");
        sb.append("  \"unavailableReason\": \"").append(dest).append(" is an inland city with no beaches\",\n");
        sb.append("  \"suggestedAlternative\": \"Visit Sirpur Lake or Ralamandal hills for a refreshing nature experience. For actual beaches, plan a separate trip to Goa (580km)\",\n");
        sb.append("  \"timeOfDay\": \"Morning\",\n");
        sb.append("  \"duration\": \"\",\n");
        sb.append("  \"travelFromPrevious\": \"\",\n");
        sb.append("  \"description\": \"Beaches interest is not applicable for ").append(dest).append(". Here are the best alternatives:\",\n");
        sb.append("  \"bestTime\": \"\",\n");
        sb.append("  \"estimatedCost\": \"\",\n");
        sb.append("  \"tip\": \"Plan a dedicated beach trip to Goa or Alibaug\",\n");
        sb.append("  \"seasonalNote\": \"\"\n");
        sb.append("}\n\n");

        sb.append("NOW generate the complete ").append(days)
          .append("-day realistic trip for ").append(dest)
          .append(". Every place must be real and searchable on Google Maps.");

        return sb.toString();
    }

    // ─────────────────────────────────────────────────────
    //  SMART INTEREST RULES PER CITY
    // ─────────────────────────────────────────────────────
    private String getInterestRule(String interest, String dest, String budget) {
        String d = dest.toLowerCase();
        StringBuilder sb = new StringBuilder();

        switch (interest.toLowerCase()) {

            case "beaches":
                if (isCoastalCity(d)) {
                    sb.append("BEACHES: Include 1-2 specific named beaches in ").append(dest).append(". ");
                    sb.append("Use real beach names (e.g. Baga, Palolem, Juhu, Marina)\n");
                } else {
                    sb.append("BEACHES — NOT AVAILABLE in ").append(dest).append(": ");
                    sb.append("Set isUnavailable=true. unavailableReason='").append(dest)
                      .append(" is an inland city, no beaches'. ");
                    sb.append("suggestedAlternative: suggest nearest lake/river/waterfall IN ")
                      .append(dest).append(" as substitute. ");
                    sb.append("Also mention nearest beach city with distance.\n");
                }
                break;

            case "nightlife":
                if (isReligiousCity(d)) {
                    sb.append("NIGHTLIFE — LIMITED in ").append(dest).append(": ");
                    sb.append("Set isUnavailable=true. Suggest evening aarti, ghats, spiritual night walks instead. ");
                    sb.append("No bars/clubs here.\n");
                } else if (isSmallCity(d)) {
                    sb.append("NIGHTLIFE — LIMITED in ").append(dest).append(": ");
                    sb.append("Set isUnavailable=true. unavailableReason='Limited nightlife in ").append(dest).append("'. ");
                    sb.append("suggestedAlternative: mention best evening food markets or rooftop cafes available.\n");
                } else {
                    sb.append("NIGHTLIFE: Include real clubs, bars, or night markets. Use actual names.\n");
                }
                break;

            case "adventure":
                if (isUrbanFlatCity(d)) {
                    sb.append("ADVENTURE — LIMITED in ").append(dest).append(": ");
                    sb.append("No mountains/trekking. Include adventure parks, go-karting, cycling tours, ");
                    sb.append("or zip-line if available. Use real venue names. ");
                    sb.append("If nothing available, set isUnavailable=true and suggest nearest adventure destination.\n");
                } else {
                    sb.append("ADVENTURE: Include real trekking spots, water sports, or adventure activities in ")
                      .append(dest).append(".\n");
                }
                break;

            case "food":
                sb.append("FOOD: Include 1-2 famous real food spots — street food areas, iconic restaurants. ");
                sb.append("Use actual names. Budget=").append(budget).append(".\n");
                if (d.contains("indore"))
                    sb.append("  Indore options: Sarafa Bazaar, Chappan Dukan, Vijay Chaat, Shreemaya\n");
                else if (d.contains("goa"))
                    sb.append("  Goa options: Britto's, Fisherman's Wharf, Cafe Ando, Infantaria\n");
                else if (d.contains("delhi"))
                    sb.append("  Delhi options: Paranthe Wali Gali, Karim's, Lajpat Nagar market\n");
                else if (d.contains("mumbai"))
                    sb.append("  Mumbai options: Leopold Cafe, Khao Gali, Vada Pav stalls at CST\n");
                else if (d.contains("jaipur"))
                    sb.append("  Jaipur options: Chokhi Dhani, Laxmi Misthan Bhandar, Rawat Mishthan\n");
                break;

            case "culture":
                sb.append("CULTURE: Real temples, mosques, churches, cultural centers. Use proper names.\n");
                break;

            case "history":
                sb.append("HISTORY: Real forts, palaces, museums, monuments. Use specific names.\n");
                if (d.contains("indore"))
                    sb.append("  Options: Rajwada Palace, Lal Bagh Palace, Kanch Mandir, Chhatri Baag\n");
                else if (d.contains("jaipur"))
                    sb.append("  Options: Amber Fort, City Palace, Jantar Mantar, Nahargarh Fort\n");
                else if (d.contains("delhi"))
                    sb.append("  Options: Red Fort, Qutub Minar, Humayun's Tomb, India Gate\n");
                break;

            case "nature":
                sb.append("NATURE: Real parks, lakes, waterfalls, sanctuaries. Use specific names.\n");
                if (d.contains("indore"))
                    sb.append("  Options: Ralamandal Wildlife Sanctuary, Sirpur Lake, Pipliyapala Lake\n");
                else if (d.contains("goa"))
                    sb.append("  Options: Dudhsagar Falls, Bondla Wildlife Sanctuary, Mollem National Park\n");
                break;

            case "shopping":
                sb.append("SHOPPING: Real named markets or malls. ");
                if (d.contains("indore"))
                    sb.append("Options: Sadar Bazaar, MG Road, C21 Mall, Treasure Island Mall\n");
                else if (d.contains("jaipur"))
                    sb.append("Options: Johari Bazaar, Bapu Bazaar, Pink City market\n");
                else
                    sb.append("Use real market/mall names in ").append(dest).append(".\n");
                break;

            case "wellness":
                sb.append("WELLNESS: Real yoga centers, spas, meditation spots in ").append(dest).append(".\n");
                if (isReligiousCity(d) || d.contains("rishikesh"))
                    sb.append("  Great options in spiritual city: ashrams, yoga centers, Ganga ghats\n");
                break;

            case "photography":
                sb.append("PHOTOGRAPHY: Scenic viewpoints, heritage buildings, sunrise/sunset points in ")
                  .append(dest).append(".\n");
                break;

            default:
                sb.append(interest.toUpperCase()).append(": Include relevant real places in ")
                  .append(dest).append(".\n");
        }

        return sb.toString();
    }

    // ─────────────────────────────────────────────────────
    //  DATE CONTEXT
    // ─────────────────────────────────────────────────────
    private String getDateContext(String travelDate) {
        if (travelDate == null || travelDate.trim().isEmpty()) return "";
        try {
            LocalDate travel = LocalDate.parse(travelDate, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            long daysUntil   = ChronoUnit.DAYS.between(LocalDate.now(), travel);
            if (daysUntil == 0) return "DATE: TRAVELING TODAY — prioritize open places, current timings.";
            if (daysUntil > 0 && daysUntil <= 7)  return "DATE: In " + daysUntil + " days — check closures.";
            if (daysUntil > 7 && daysUntil <= 30)  return "DATE: In " + daysUntil + " days — mention advance bookings.";
            if (daysUntil > 30) return "DATE: In ~" + Math.round(daysUntil/30.0) + " months — seasonal planning.";
            return "DATE: Plan as if traveling today.";
        } catch (Exception e) { return ""; }
    }

    // ─────────────────────────────────────────────────────
    //  SEASON CONTEXT
    // ─────────────────────────────────────────────────────
    private String getSeasonContext(String travelDate, String dest) {
        if (travelDate == null || travelDate.isEmpty()) return "";
        int month;
        try {
            month = LocalDate.parse(travelDate, DateTimeFormatter.ofPattern("yyyy-MM-dd")).getMonthValue();
        } catch (Exception e) { return ""; }
        String d = dest.toLowerCase();

        if (d.contains("manali")||d.contains("shimla")||d.contains("kashmir")||d.contains("ladakh")) {
            if (month==12||month<=2) return "SEASON: Heavy snow, some roads closed. Avoid remote treks.";
            if (month>=6&&month<=9)  return "SEASON: Monsoon — landslide risk. Prefer covered attractions.";
            return "SEASON: Good weather for hill activities.";
        }
        if (d.contains("goa")||d.contains("kerala")||d.contains("puri")||d.contains("andaman")) {
            if (month>=6&&month<=9)  return "SEASON: Monsoon — rough seas. Beach shacks closed. Water sports unavailable.";
            if (month>=11||month<=2) return "SEASON: Peak season — best weather. Book accommodation early.";
            return "SEASON: Shoulder season — good weather, fewer crowds.";
        }
        if (d.contains("rajasthan")||d.contains("jaipur")||d.contains("jodhpur")) {
            if (month>=4&&month<=7) return "SEASON: Very hot 42-48°C. Outdoor visits only 6-9AM and 5-8PM.";
            if (month>=10||month<=2) return "SEASON: Best time — pleasant 15-25°C.";
        }
        if (month>=6&&month<=9)  return "SEASON: Monsoon — carry rain gear, indoor backups recommended.";
        if (month>=4&&month<=6)  return "SEASON: Summer — early morning outdoor visits preferred.";
        return "";
    }

    // ─────────────────────────────────────────────────────
    //  CITY CLASSIFIERS
    // ─────────────────────────────────────────────────────
    private boolean isCoastalCity(String d) {
        return d.contains("goa")||d.contains("mumbai")||d.contains("kerala")||d.contains("kochi")
            ||d.contains("puri")||d.contains("gokarna")||d.contains("andaman")||d.contains("lakshadweep")
            ||d.contains("phuket")||d.contains("bali")||d.contains("maldives")||d.contains("chennai")
            ||d.contains("vizag")||d.contains("mangalore")||d.contains("pondicherry")||d.contains("alibaug")
            ||d.contains("diu")||d.contains("dwarka")||d.contains("rameshwaram");
    }

    private boolean isReligiousCity(String d) {
        return d.contains("varanasi")||d.contains("ayodhya")||d.contains("pushkar")
            ||d.contains("vrindavan")||d.contains("mathura")||d.contains("haridwar")
            ||d.contains("rishikesh")||d.contains("tirupati")||d.contains("shirdi")
            ||d.contains("amritsar")||d.contains("bodh gaya")||d.contains("puri");
    }

    private boolean isUrbanFlatCity(String d) {
        return d.contains("delhi")||d.contains("mumbai")||d.contains("indore")
            ||d.contains("pune")||d.contains("hyderabad")||d.contains("bangalore")
            ||d.contains("chennai")||d.contains("kolkata")||d.contains("ahmedabad")
            ||d.contains("surat")||d.contains("nagpur")||d.contains("bhopal")
            ||d.contains("lucknow")||d.contains("kanpur");
    }

    private boolean isSmallCity(String d) {
        return d.contains("khargone")||d.contains("khandwa")||d.contains("ratlam")
            ||d.contains("ujjain")||d.contains("dewas")||d.contains("panna")
            ||d.contains("satna")||d.contains("rewa")||d.contains("sagar");
    }

    // ─────────────────────────────────────────────────────
    //  BUILD REQUEST BODY
    // ─────────────────────────────────────────────────────
    private String buildRequestBody(String prompt) throws Exception {
        ObjectNode root     = objectMapper.createObjectNode();
        ArrayNode  contents = objectMapper.createArrayNode();
        ObjectNode content  = objectMapper.createObjectNode();
        ArrayNode  parts    = objectMapper.createArrayNode();
        ObjectNode part     = objectMapper.createObjectNode();

        part.put("text", prompt);
        parts.add(part);
        content.set("parts", parts);
        contents.add(content);
        root.set("contents", contents);

        ObjectNode gen = objectMapper.createObjectNode();
        gen.put("temperature",     0.8);
        gen.put("maxOutputTokens", 8192);
        gen.put("topP",            0.95);
        root.set("generationConfig", gen);

        ArrayNode safety = objectMapper.createArrayNode();
        for (String cat : new String[]{
            "HARM_CATEGORY_HARASSMENT","HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT","HARM_CATEGORY_DANGEROUS_CONTENT"}) {
            ObjectNode s = objectMapper.createObjectNode();
            s.put("category", cat); s.put("threshold", "BLOCK_NONE");
            safety.add(s);
        }
        root.set("safetySettings", safety);

        return objectMapper.writeValueAsString(root);
    }

    // ─────────────────────────────────────────────────────
    //  EXTRACT JSON
    // ─────────────────────────────────────────────────────
    private String extractAndValidateJson(String resp) throws Exception {
        JsonNode root       = objectMapper.readTree(resp);
        JsonNode candidates = root.path("candidates");

        if (candidates.isMissingNode() || candidates.size() == 0) {
            JsonNode blocked = root.path("promptFeedback").path("blockReason");
            if (!blocked.isMissingNode())
                throw new RuntimeException("Gemini blocked: " + blocked.asText());
            throw new RuntimeException("No candidates in response: " + resp);
        }

        if ("SAFETY".equals(candidates.get(0).path("finishReason").asText("")))
            throw new RuntimeException("Blocked by safety filters");

        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (parts.isMissingNode() || parts.size() == 0)
            throw new RuntimeException("No parts in response");

        String text = parts.get(0).path("text").asText("").trim();
        if (text.isEmpty()) throw new RuntimeException("Empty response");

        if (text.startsWith("```json")) text = text.substring(7);
        else if (text.startsWith("```")) text = text.substring(3);
        if (text.endsWith("```")) text = text.substring(0, text.length()-3);
        text = text.trim();

        if (!text.startsWith("[")) {
            int s = text.indexOf('['), e = text.lastIndexOf(']');
            if (s>=0&&e>s) text = text.substring(s, e+1);
            else throw new RuntimeException("Not a JSON array: " + text.substring(0, Math.min(300, text.length())));
        }

        JsonNode parsed = objectMapper.readTree(text);
        if (!parsed.isArray() || parsed.size()==0)
            throw new RuntimeException("Empty JSON array");

        log.info("Generated {} days", parsed.size());
        return text;
    }

    // ─────────────────────────────────────────────────────
    //  UTILITY
    // ─────────────────────────────────────────────────────
    private String join(List<String> list, String sep) {
        if (list==null||list.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (int i=0; i<list.size(); i++) {
            if (i>0) sb.append(sep);
            sb.append(list.get(i));
        }
        return sb.toString();
    }
}