#!/bin/bash
# ── Voyager AI Trip Planner — Quick Setup Script ──────────────────────────────
# Run this from the project root: bash setup.sh

set -e

echo ""
echo "✈  Voyager AI Trip Planner — Setup"
echo "────────────────────────────────────"

# Check Java
if ! command -v java &> /dev/null; then
  echo "❌  Java 17+ not found. Please install Java first."
  exit 1
fi
JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
echo "✅  Java $JAVA_VER found"

# Check Maven
if ! command -v mvn &> /dev/null; then
  echo "❌  Maven not found. Please install Maven 3.8+"
  exit 1
fi
echo "✅  Maven found"

# Check MySQL
if ! command -v mysql &> /dev/null; then
  echo "⚠️   MySQL CLI not found. Set up DB manually using sql/schema.sql"
else
  echo ""
  echo "📦  Setting up MySQL database..."
  read -p "   MySQL username (default: root): " DB_USER
  DB_USER=${DB_USER:-root}
  mysql -u "$DB_USER" -p < sql/schema.sql
  echo "✅  Database created"
fi

echo ""
echo "🔑  Configuration needed:"
echo "   1. Add your Gemini API key to:"
echo "      src/main/java/com/tripplanner/service/GeminiService.java"
echo "      → GEMINI_API_KEY = \"YOUR_KEY_HERE\""
echo ""
echo "   2. Set your MySQL password in:"
echo "      src/main/java/com/tripplanner/config/AppConfig.java"
echo "      → config.setPassword(\"YOUR_PASSWORD\")"
echo ""
read -p "Press ENTER after configuring the above files... "

echo ""
echo "🔨  Building project..."
mvn clean package -DskipTests -q
echo "✅  Build successful → target/trip-planner.war"

echo ""
echo "🚀  Deploy target/trip-planner.war to Tomcat 10.1 webapps/"
echo ""
echo "   Example:"
echo "   cp target/trip-planner.war \$TOMCAT_HOME/webapps/ROOT.war"
echo "   \$TOMCAT_HOME/bin/startup.sh"
echo ""
echo "   Then open: http://localhost:8080"
echo ""
echo "✈  Demo account: username=demo  password=password123"
echo ""
echo "────────────────────────────────────"
echo "Setup complete! Happy travels 🌍"
echo ""
