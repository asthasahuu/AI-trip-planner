# ✈ Voyager AI — Intelligent Travel Planner

A full-stack AI-powered travel planning application built with **Spring MVC**, **MySQL**, **Gemini AI**, and **Leaflet.js**.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| Backend    | Java 17, Spring MVC 6.1 (no Boot) |
| Server     | Apache Tomcat 10.1                |
| Database   | MySQL 8.x                         |
| AI         | Google Gemini 1.5 Flash API       |
| Map        | Leaflet.js + OpenStreetMap        |
| Geocoding  | Nominatim API (free, no key)      |
| HTTP       | OkHttp 4                          |

---

## Project Structure

```
trip-planner/
├── pom.xml
├── sql/
│   └── schema.sql                          ← Run this first
└── src/main/
    ├── java/com/tripplanner/
    │   ├── config/
    │   │   ├── AppInitializer.java         ← Replaces web.xml Spring config
    │   │   ├── AppConfig.java              ← DataSource, JdbcTemplate beans
    │   │   └── WebConfig.java              ← MVC, CORS, static resources
    │   ├── controller/
    │   │   ├── AuthController.java         ← /api/auth/* endpoints
    │   │   └── TripController.java         ← /api/trips/* endpoints
    │   ├── service/
    │   │   ├── AuthService.java            ← Register/login logic
    │   │   ├── TripService.java            ← Trip CRUD + AI orchestration
    │   │   └── GeminiService.java          ← Gemini API integration
    │   ├── dao/
    │   │   ├── UserDAO.java                ← User DB operations
    │   │   └── TripDAO.java                ← Trip DB operations
    │   └── model/
    │       ├── User.java
    │       ├── Trip.java
    │       └── TripRequest.java
    ├── resources/
    │   ├── application.properties
    │   └── logback.xml
    └── webapp/
        ├── index.html                      ← Single-page frontend
        ├── static/
        │   └── js/
        │       └── app.js                  ← All frontend JS
        └── WEB-INF/
            └── web.xml
```

---

## Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8.x
- Apache Tomcat 10.1
- Google Gemini API key (free tier available)

---

## Setup Instructions

### Step 1 — Get a Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key

### Step 2 — Configure the Application

**a) Set your Gemini API key** in `GeminiService.java`:
```java
private static final String GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
```

**b) Set your MySQL credentials** in `AppConfig.java`:
```java
config.setJdbcUrl("jdbc:mysql://localhost:3306/trip_planner?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true");
config.setUsername("root");           // ← your MySQL username
config.setPassword("your_password"); // ← your MySQL password
```

### Step 3 — Set Up the Database

```bash
mysql -u root -p < sql/schema.sql
```

This creates the `trip_planner` database with `users` and `trips` tables.

A demo user is pre-created:
- **Username:** `demo`
- **Password:** `password123`

### Step 4 — Build the Project

```bash
cd trip-planner
mvn clean package -DskipTests
```

This creates `target/trip-planner.war`.

### Step 5 — Deploy to Tomcat

1. Copy the WAR to Tomcat's webapps folder:
```bash
cp target/trip-planner.war /path/to/tomcat/webapps/ROOT.war
```

Or deploy to a context path:
```bash
cp target/trip-planner.war /path/to/tomcat/webapps/trip-planner.war
```

2. Start Tomcat:
```bash
/path/to/tomcat/bin/startup.sh
```

3. Open in browser:
   - Root deployment: [http://localhost:8080](http://localhost:8080)
   - Context path: [http://localhost:8080/trip-planner](http://localhost:8080/trip-planner)

---

## API Reference

### Auth Endpoints

| Method | Endpoint            | Description        |
|--------|---------------------|--------------------|
| POST   | `/api/auth/register`| Register new user  |
| POST   | `/api/auth/login`   | Login              |
| POST   | `/api/auth/logout`  | Logout             |
| GET    | `/api/auth/me`      | Get current user   |

**Login request body:**
```json
{ "username": "demo", "password": "password123" }
```

### Trip Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/trips/generate` | Generate AI itinerary    |
| GET    | `/api/trips/my`       | Get all trips for user   |
| GET    | `/api/trips/{id}`     | Get specific trip        |
| DELETE | `/api/trips/{id}`     | Delete a trip            |

**Generate trip request body:**
```json
{
  "destination": "Indore",
  "days": 2,
  "budget": "Cheap",
  "travelType": "Solo",
  "interests": ["Food", "Culture", "History"]
}
```

**Itinerary response (itinerary field is JSON string):**
```json
{
  "success": true,
  "tripId": 1,
  "destination": "Indore",
  "itinerary": "[{\"day\":1,\"theme\":\"...\",\"places\":[...]}]"
}
```

---

## How It Works — Dynamic AI Flow

```
User Input (Destination + Preferences)
        ↓
TripController.generateTrip()
        ↓
GeminiService.generateItinerary()
  → Builds prompt: "Generate itinerary for [Destination] with [Budget], [Days], [Interests]"
  → Calls Gemini 1.5 Flash API
  → Extracts JSON from response
        ↓
TripService.generateAndSave()
  → Saves to MySQL
        ↓
Frontend receives JSON itinerary
        ↓
User clicks "View on Map"
  → Calls Nominatim: /search?q=PlaceName,Destination&format=json
  → Extracts lat/lon
  → Leaflet map.flyTo(lat, lon)
  → Adds marker + popup
        ↓
User clicks "Navigate"
  → Opens: https://www.google.com/maps?q=PlaceName,Destination
```

---

## Gemini Prompt Design

The prompt is fully dynamic — built from user inputs at runtime:

```
Generate a day-wise travel itinerary for Indore
based on Cheap budget, 2 days, Solo travel,
with interests in: Food, Culture

Return ONLY a JSON array: [{day, theme, places: [{name, type, description, bestTime, estimatedCost}]}]
```

For **Indore + Food**, Gemini will return real places like Sarafa Bazaar, Chappan Dukan, Rajwada.  
For **Goa + Beaches**, it returns Baga Beach, Calangute Beach, Anjuna Beach — completely different.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ClassNotFoundException: com.mysql.cj.jdbc.Driver` | Add MySQL connector JAR to Tomcat lib |
| Gemini API returns 400 | Check API key in `GeminiService.java` |
| Map not loading | Check internet connection (OpenStreetMap CDN) |
| `401 Unauthorized` on trip endpoints | Session expired — log in again |
| CORS errors | Ensure frontend is served from same Tomcat instance |
| Places not found on map | Nominatim couldn't geocode — map shows destination city instead |

---

## Security Notes

- Passwords hashed with BCrypt (cost factor 10)
- Session-based authentication (HttpOnly cookies)
- SQL injection protected via Spring `JdbcTemplate` parameterized queries
- User can only access their own trips (userId check on every trip operation)
- XSS protected via HTML escaping in frontend JS

---

## Extending the App

- **Add weather**: Integrate OpenWeatherMap API in `GeminiService` prompt context
- **Add photos**: Use Unsplash API for place images
- **Add export**: Generate PDF itinerary using iText or Apache PDFBox
- **Add sharing**: Add a `shared` flag to trips table + public trip URLs
- **Add ratings**: Let users rate places after visiting
