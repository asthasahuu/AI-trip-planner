package com.tripplanner.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.jdbc.core.JdbcTemplate;
import javax.sql.DataSource;

@Configuration
@ComponentScan(basePackages = "com.tripplanner")
@PropertySource("classpath:application.properties")
public class AppConfig {

    @Value("${db.url}")     private String defaultUrl;
    @Value("${db.user}")    private String defaultUser;
    @Value("${db.pass}")    private String defaultPass;
    @Value("${db.driver}")  private String driverClassName;

    @Value("${db.pool.max_size}")   private int maxPoolSize;
    @Value("${db.pool.min_idle}")   private int minIdle;

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

     
        String url  = System.getenv("DB_URL")  != null ? System.getenv("DB_URL")  : defaultUrl;
        String user = System.getenv("DB_USER") != null ? System.getenv("DB_USER") : defaultUser;
        String pass = System.getenv("DB_PASS") != null ? System.getenv("DB_PASS") : defaultPass;

        config.setJdbcUrl(url);
        config.setUsername(user);
        config.setPassword(pass);
        config.setDriverClassName(driverClassName);

        // Pool Settings from Properties
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(minIdle);
        config.setConnectionTimeout(30000);

        return new HikariDataSource(config);
    }

    @Bean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }


    @Bean
    public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
        return new PropertySourcesPlaceholderConfigurer();
    }
}