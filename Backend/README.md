# 🚀 Authentication API

A complete Authentication Backend built using Node.js, Express.js, MongoDB, and JWT Authentication.

---

# 📌 Features

- User Registration
- User Login
- Logout System
- Account Verification
- Forgot Password
- Reset Password
- Change Password
- User Profile
- JWT Authentication
- Secure Password Hashing
- REST API Structure


# ❤️ Health Route

## Check Server Status

```http
GET /api/health
```

### Response

```json
{
  "success": true,
  "message": "Server is running successfully"
}
```

---

# 🔐 Authentication Routes

---

# 1️⃣ Register User

```http
POST /api/auth/register
```

## Request Body

```json
{
  "fullname": "Your Name",
  "username": "your_username",
  "email": "your_email@example.com",
  "password": "your_password"
}
```

---

# 2️⃣ Login User

```http
POST /api/auth/login
```

## Request Body

```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

## Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token"
}
```

---

# 3️⃣ Logout User

```http
POST /api/auth/logout
```

## Success Response

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

# 4️⃣ Verify Account

```http
POST /api/auth/verify/:id
```

## Params

| Parameter | Type   | Description |
| ---------- | ------ | ----------- |
| id         | String | Verification ID |

## Success Response

```json
{
  "success": true,
  "message": "Account verified successfully"
}
```

---

# 5️⃣ Forgot Password

```http
POST /api/auth/forgot-password
```

## Request Body

```json
{
  "email": "rajiv@example.com"
}
```

## Success Response

```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

---

# 6️⃣ Reset Password

```http
POST /api/auth/reset-password/:token
```

## Params

| Parameter | Type   | Description |
| ---------- | ------ | ----------- |
| token      | String | Reset token |

## Request Body

```json
{
  "password": "newpassword123"
}
```

## Success Response

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

# 7️⃣ Change Password

```http
POST /api/auth/change-password
```

## Request Body

```json
{
  "oldPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

## Success Response

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

# 8️⃣ Get User Profile

```http
GET /api/auth/profile
```



# 📊 Status Codes

| Status Code | Description |
| ------------ | ----------- |
| 200          | Success |
| 201          | Created |
| 400          | Bad Request |
| 401          | Unauthorized |
| 403          | Forbidden |
| 404          | Not Found |
| 500          | Internal Server Error |
