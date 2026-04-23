package com.tripplanner.dao;

import com.tripplanner.model.Trip;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;

@Repository
public class TripDAO {

    @Autowired
    private JdbcTemplate jdbc;

    private final RowMapper<Trip> ROW = (rs, n) -> {
        Trip t = new Trip();
        t.setId(rs.getInt("id"));
        t.setUserId(rs.getInt("user_id"));
        t.setDestination(rs.getString("destination"));
        t.setDays(rs.getInt("days"));
        t.setBudget(rs.getString("budget"));
        t.setTravelType(rs.getString("travel_type"));
        t.setInterests(rs.getString("interests"));
        t.setItineraryJson(rs.getString("itinerary_json"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) t.setCreatedAt(ts.toLocalDateTime());
        return t;
    };

    public int save(Trip t) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO trips (user_id,destination,days,budget,travel_type,interests,itinerary_json)" +
                " VALUES (?,?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, t.getUserId());
            ps.setString(2, t.getDestination());
            ps.setInt(3, t.getDays());
            ps.setString(4, t.getBudget());
            ps.setString(5, t.getTravelType());
            ps.setString(6, t.getInterests());
            ps.setString(7, t.getItineraryJson());
            return ps;
        }, kh);
        return kh.getKey().intValue();
    }

    public List<Trip> findByUserId(int userId) {
        return jdbc.query(
            "SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC", ROW, userId);
    }

    public Trip findById(int id) {
        try {
            return jdbc.queryForObject("SELECT * FROM trips WHERE id = ?", ROW, id);
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    public boolean delete(int id, int userId) {
        return jdbc.update("DELETE FROM trips WHERE id = ? AND user_id = ?", id, userId) > 0;
    }
}