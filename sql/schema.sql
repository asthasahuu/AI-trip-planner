CREATE DATABASE IF NOT EXISTS trip_planner;
USE trip_planner;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    days INT NOT NULL,
    budget VARCHAR(50) NOT NULL,
    travel_type VARCHAR(50) NOT NULL,
    interests TEXT NOT NULL,
    itinerary_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sample user (password: password123 - bcrypt hash)
INSERT IGNORE INTO users (username, email, password) VALUES 
('demo', 'demo@tripplanner.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8RxqYe6vHPr1V/iSfm');
