# Troubleshooting Guide

## Session/Login Issues on VPS

If you're experiencing login issues where users get redirected back to the login page, here are the most common causes and solutions:

### 1. Check Server Logs

First, check your Docker container logs to see what's happening:

```bash
# Check container logs
docker logs meshkat-lab-app

# Follow logs in real-time
docker logs -f meshkat-lab-app
```

Look for these debug messages:
- `Login attempt for user: admin`
- `Login successful for user: admin`
- `Setting cookie - Production: true HTTPS: false/true`
- `Cookie set successfully`
- `Checking authentication...`
- `Session response status: 200/401`
- `User authenticated: admin` or `User not authenticated`

### 2. Common Issues and Solutions

#### Issue: Cookies not being set
**Symptoms:** Login succeeds but session check fails immediately

**Solutions:**
1. **HTTPS vs HTTP**: If your VPS uses HTTP (not HTTPS), the `secure` cookie flag should be `false`
2. **Domain issues**: Make sure your VPS domain/IP is accessible
3. **Port issues**: Ensure the app is running on the correct port

#### Issue: Session expires immediately
**Symptoms:** Login works but redirects to login after a few seconds

**Solutions:**
1. Check if the session token is being parsed correctly
2. Verify the session age calculation
3. Ensure the server time is correct

#### Issue: Network/CORS issues
**Symptoms:** Fetch requests fail or return network errors

**Solutions:**
1. Ensure the VPS is accessible from your browser
2. Check firewall settings
3. Verify the port is open

### 3. Manual Testing

#### Test 1: Basic Connectivity
```bash
curl -X GET http://your-vps-ip:3000/api/auth/session
```
Should return: `{"authenticated":false}`

#### Test 2: Login
```bash
curl -X POST http://your-vps-ip:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
Should return: `{"success":true,"message":"Login successful",...}`

#### Test 3: Session with Cookie
```bash
# First login and capture the cookie
LOGIN_RESPONSE=$(curl -X POST http://your-vps-ip:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt)

# Then test session with the cookie
curl -X GET http://your-vps-ip:3000/api/auth/session \
  -b cookies.txt
```

### 4. Environment Variables

Make sure these are set correctly in your Docker environment:

```bash
# In your docker-compose.yml or .env file
NODE_ENV=production
```

### 5. Browser Developer Tools

1. Open browser developer tools (F12)
2. Go to Network tab
3. Try to login
4. Check the requests:
   - `/api/auth/login` should return 200 with success message
   - `/api/auth/session` should return 200 with authenticated: true
5. Check Application tab > Cookies to see if `admin-session` cookie is set

### 6. Quick Fixes

#### Fix 1: Force HTTP (if not using HTTPS)
Update the login route to always use `secure: false` for HTTP:

```javascript
// In app/api/auth/login/route.ts
response.cookies.set('admin-session', JSON.stringify(sessionData), {
  httpOnly: true,
  secure: false, // Force false for HTTP
  sameSite: 'lax',
  maxAge: 24 * 60 * 60,
  path: '/',
});
```

#### Fix 2: Add Domain to Cookie
If using a specific domain:

```javascript
response.cookies.set('admin-session', JSON.stringify(sessionData), {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60,
  path: '/',
  domain: 'your-domain.com', // Add your domain
});
```

### 7. Debug Script

Use the included `debug-session.js` script:

```bash
# Set your VPS URL
export VPS_URL="http://your-vps-ip:3000"

# Run the debug script
node debug-session.js
```

### 8. Restart Services

If nothing else works, restart your Docker services:

```bash
docker-compose down
docker-compose up -d --build
```

### 9. Check VPS Configuration

Ensure your VPS is properly configured:
- Port 3000 is open
- Docker is running
- The app container is healthy
- No firewall blocking requests

### 10. Contact Support

If none of these solutions work, please provide:
1. Server logs from `docker logs meshkat-lab-app`
2. Browser developer tools network tab screenshots
3. The output of `debug-session.js`
4. Your VPS configuration details
