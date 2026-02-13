# Database Setup for Aiven MySQL

This folder contains the database schema for the GPS tracking system.

## Files

- **`aiven-schema.sql`** - Complete database schema with tables, views, and stored procedures

---

## Automatic Setup (Recommended)

The Node.js server (`index.js`) automatically creates the required tables when it starts. No manual SQL execution needed.

**How it works:**
1. Server connects to Aiven MySQL
2. Checks if `gps_devices` and `gps_data` tables exist
3. Creates tables if missing
4. Ready to receive GPS data

---

## Manual Setup on Aiven

### Method 1: Aiven Web Console (Easiest)

1. **Login to Aiven Console**
   - Go to https://console.aiven.io
   - Select your MySQL service

2. **Open SQL Editor**
   - Click "SQL Editor" tab
   - Wait for connection

3. **Import Schema**
   - Open `aiven-schema.sql` in text editor
   - Copy entire contents
   - Paste into Aiven SQL Editor
   - Click "Execute" or press Ctrl+Enter

4. **Verify Tables Created**
   ```sql
   SHOW TABLES;
   -- Should show: gps_devices, gps_data
   
   SELECT * FROM gps_devices;
   -- Should show empty table or sample data
   ```

### Method 2: MySQL Command Line

1. **Get Connection String from Aiven**
   - Service URL: `mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED`

2. **Connect via MySQL Client**
   ```bash
   mysql -h your-host.aivencloud.com \
         -P 12345 \
         -u avnadmin \
         -p \
         --ssl-mode=REQUIRED \
         defaultdb
   ```

3. **Import SQL File**
   ```bash
   mysql -h your-host.aivencloud.com \
         -P 12345 \
         -u avnadmin \
         -p \
         --ssl-mode=REQUIRED \
         defaultdb < database/aiven-schema.sql
   ```

### Method 3: MySQL Workbench

1. **Create New Connection**
   - Connection Name: GPS Tracker DB
   - Hostname: `your-host.aivencloud.com`
   - Port: `12345`
   - Username: `avnadmin`
   - Password: [from Aiven]
   - SSL: Required

2. **Import SQL File**
   - File → Run SQL Script
   - Select `aiven-schema.sql`
   - Execute

---

## Importing Existing Data to Aiven

If you have existing GPS data from another database:

### Step 1: Export Data from Old Database

```bash
# Export only data (no schema)
mysqldump -h old-host -u user -p \
  --no-create-info \
  --skip-triggers \
  old_database gps_devices gps_data > backup.sql
```

### Step 2: Import to Aiven

```bash
# First create tables (use aiven-schema.sql)
mysql -h aiven-host -u avnadmin -p --ssl-mode=REQUIRED defaultdb < database/aiven-schema.sql

# Then import data
mysql -h aiven-host -u avnadmin -p --ssl-mode=REQUIRED defaultdb < backup.sql
```

### Alternative: CSV Export/Import

**Export to CSV:**
```sql
SELECT * FROM gps_devices
INTO OUTFILE '/tmp/devices.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

**Import from Aiven Console:**
1. Upload CSV to cloud storage
2. Use Aiven's data import tool
3. Map columns to table fields

---

## Database Schema Details

### Tables

#### `gps_devices`
Stores registered GPS devices
```sql
CREATE TABLE gps_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_imei VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_imei (device_imei)
);
```

**Fields:**
- `id` - Auto-increment primary key
- `device_imei` - Unique device identifier (ESP32 name)
- `created_at` - First registration timestamp
- `updated_at` - Last activity timestamp

#### `gps_data`
Stores GPS location points
```sql
CREATE TABLE gps_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gps_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    battery_voltage DECIMAL(4, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gps_id) REFERENCES gps_devices(id) ON DELETE CASCADE,
    INDEX idx_created_at (created_at),
    INDEX idx_gps_id (gps_id)
);
```

**Fields:**
- `id` - Auto-increment primary key
- `gps_id` - Foreign key to `gps_devices.id`
- `latitude` - GPS latitude (-90 to 90)
- `longitude` - GPS longitude (-180 to 180)
- `speed` - Speed in km/h
- `heading` - Direction (0-360 degrees)
- `battery_voltage` - Battery voltage in volts
- `created_at` - Data point timestamp

**Indexes:**
- Fast lookups by device ID
- Time-based queries optimized
- Location searches indexed

---

## Database Connection Configuration

### In Node.js (`index.js`)

```javascript
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
});
```

**Important:**
- ✅ SSL must be enabled for Aiven
- ✅ Connection pooling prevents timeouts
- ✅ 10-second timeout handles slow connections

---

## Verifying Database Setup

### Test Queries

```sql
-- Check tables exist
SHOW TABLES;

-- Check table structure
DESCRIBE gps_devices;
DESCRIBE gps_data;

-- Count records
SELECT COUNT(*) FROM gps_devices;
SELECT COUNT(*) FROM gps_data;

-- View latest GPS data
SELECT d.device_imei, g.latitude, g.longitude, g.created_at
FROM gps_data g
JOIN gps_devices d ON g.gps_id = d.id
ORDER BY g.created_at DESC
LIMIT 10;
```

### Test from Node.js

```bash
# Check health endpoint
curl https://your-render-service.onrender.com/api/health

# Expected: {"status":"healthy","database":"connected"}
```

---

## Troubleshooting

### Error: "Table doesn't exist"

**Solution:**
1. Run `aiven-schema.sql` manually
2. Restart Node.js server
3. Check Aiven service is running

### Error: "Access denied"

**Solution:**
1. Verify username/password in `.env`
2. Check Aiven user permissions
3. Ensure SSL is enabled

### Error: "Connection timeout"

**Solution:**
1. Check Aiven service status
2. Verify host/port are correct
3. Increase `connectTimeout` in config
4. Check firewall settings

---

## Database Backups

Aiven automatically backs up your database every 12 hours.

**Manual Backup:**
```bash
mysqldump -h aiven-host -u avnadmin -p \
  --ssl-mode=REQUIRED \
  --single-transaction \
  defaultdb > backup-$(date +%Y%m%d).sql
```

**Restore from Backup:**
```bash
mysql -h aiven-host -u avnadmin -p \
  --ssl-mode=REQUIRED \
  defaultdb < backup-20260209.sql
```

---

## Performance Tips

- **Indexes:** Already optimized for common queries
- **Partitioning:** Consider partitioning `gps_data` by date for large datasets
- **Archiving:** Move old data to archive table periodically
- **Connection Pooling:** Reuses connections for better performance

---

## Security Notes

- ✅ SSL/TLS encryption required
- ✅ Parameterized queries prevent SQL injection
- ✅ Foreign key constraints maintain data integrity
- ✅ Credentials stored in environment variables (never committed)

---

**Last Updated:** February 2026  
**Database Version:** MySQL 8.0  
**Hosting:** Aiven Cloud
