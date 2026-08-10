# InsureMithra API Documentation

## Overview
This document provides comprehensive API documentation for the InsureMithra Insurance Workflow Automation System - Epic 1: User Authentication & Profile Management.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Error Responses
All error responses follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [] // Optional: validation errors
}
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Response (201):**
```json
{
  "message": "User registered successfully. Please verify your email.",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isEmailVerified": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "verificationToken": "abc123def456..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'
```

### 2. Login User
**POST** `/auth/login`

Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isEmailVerified": false,
    "lastLogin": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'
```

### 3. Logout User
**POST** `/auth/logout`

Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Forgot Password
**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@example.com"}'
```

### 5. Reset Password
**POST** `/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successful. You can now login with your new password."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "password": "NewSecurePassword123!"
  }'
```

### 6. Verify Email
**GET** `/auth/verify-email/:token`

Verify user email address.

**Response (200):**
```json
{
  "message": "Email verified successfully."
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/verify-email/verification-token
```

### 7. Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isEmailVerified": true
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Profile Management Endpoints

### 1. Get Profile
**GET** `/profile`

Get user profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "role": "user",
    "isEmailVerified": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Update Profile
**PUT** `/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "firstName": "Johnny",
  "phone": "+1234567891",
  "address": {
    "street": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210"
  }
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully.",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "Johnny",
    "lastName": "Doe",
    "fullName": "Johnny Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567891",
    "address": {
      "street": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "zipCode": "90210",
      "country": "USA"
    },
    "role": "user",
    "isEmailVerified": true,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Johnny",
    "phone": "+1234567891"
  }'
```

### 3. Change Password
**POST** `/profile/change-password`

Change user password.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/profile/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }'
```

### 4. Deactivate Account
**POST** `/profile/deactivate`

Deactivate user account.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "password": "CurrentPassword123!"
}
```

**Response (200):**
```json
{
  "message": "Account deactivated successfully."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/profile/deactivate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"password": "CurrentPassword123!"}'
```

### 5. Get Activity Log (Admin Only)
**GET** `/profile/activity-log`

Get user activity log (admin only).

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response (200):**
```json
{
  "message": "Activity log feature will be implemented in the monitoring module.",
  "note": "This endpoint is reserved for future implementation of user activity tracking."
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/profile/activity-log \
  -H "Authorization: Bearer <admin-jwt-token>"
```

---

## Health Check

### Health Check
**GET** `/health`

Check API health status.

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "InsureMithra API",
  "version": "1.0.0"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/health
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `NO_TOKEN` | No authentication token provided |
| `INVALID_TOKEN` | Invalid or malformed token |
| `TOKEN_EXPIRED` | Token has expired |
| `ACCOUNT_LOCKED` | Account is temporarily locked |
| `ACCOUNT_DEACTIVATED` | Account is deactivated |
| `USER_EXISTS` | User already exists with email |
| `INVALID_CREDENTIALS` | Invalid email or password |
| `INVALID_RESET_TOKEN` | Invalid or expired reset token |
| `INVALID_VERIFICATION_TOKEN` | Invalid or expired verification token |
| `INVALID_CURRENT_PASSWORD` | Current password is incorrect |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `EMAIL_NOT_VERIFIED` | Email verification required |

---

## Rate Limiting

Authentication endpoints are rate-limited:
- **Window**: 15 minutes
- **Max Attempts**: 5 requests per IP
- **Lockout**: Account locked for 15 minutes after 5 failed attempts

---

## Security Features

1. **Password Requirements**:
   - Minimum 8 characters
   - Must contain uppercase, lowercase, number, and special character

2. **Account Security**:
   - Account lockout after 5 failed login attempts
   - 15-minute lockout period
   - Password reset tokens expire in 15 minutes
   - Email verification tokens expire in 24 hours

3. **JWT Security**:
   - Tokens expire in 7 days (configurable)
   - Secure token generation with secret key
   - Token validation on protected routes

4. **Audit Logging**:
   - All authentication events logged
   - Profile changes tracked
   - Failed login attempts recorded
   - Security events monitored

---

## Next Steps for Epic 2-4

This authentication module provides the foundation for:


1. **Epic 2 - Policy Management**: User authentication required for policy search, comparison, and purchase
2. **Epic 3 - Claims Processing**: Authenticated users can file and track claims
3. **Epic 4 - Monitoring & Analytics**: Admin users can access monitoring dashboards

The JWT tokens and user roles established here will be used across all subsequent modules.

---

## Policy Renewal Endpoints (Epic 3 Story 3)

### 1. Check Renewal Eligibility
**GET** `/renewals/eligibility/:purchaseId`

Check if a policy purchase is eligible for renewal. Policies are eligible for renewal within 7 days before expiry.

**Authentication:** Required

**URL Parameters:**
- `purchaseId` (string): The ID of the policy purchase

**Response (200 OK):**
```json
{
  "eligible": true,
  "purchaseId": "507f1f77bcf86cd799439011",
  "policyName": "Comprehensive Car Insurance",
  "policyType": "4W",
  "expiryDate": "2025-12-01T00:00:00.000Z",
  "daysLeft": 5,
  "renewalAmount": 15000,
  "currency": "INR",
  "renewalWindowDays": 7,
  "message": "Your policy is eligible for renewal"
}
```

**Response (200 OK - Not Eligible):**
```json
{
  "eligible": false,
  "purchaseId": "507f1f77bcf86cd799439011",
  "policyName": "Comprehensive Car Insurance",
  "policyType": "4W",
  "expiryDate": "2025-12-20T00:00:00.000Z",
  "daysLeft": 15,
  "renewalAmount": 15000,
  "currency": "INR",
  "renewalWindowDays": 7,
  "message": "Renewal will be available 7 days before expiry"
}
```

**Error Responses:**
- `404`: Purchase not found
- `403`: Unauthorized (purchase belongs to another user)
- `400`: Purchase does not have an expiry date set

---

### 2. Initiate Renewal
**POST** `/renewals/initiate`

Initiate the renewal process for an eligible policy. This starts the payment processing flow.

**Authentication:** Required

**Request Body:**
```json
{
  "purchaseId": "507f1f77bcf86cd799439011",
  "paymentMethod": "card"
}
```

**Parameters:**
- `purchaseId` (string, required): ID of the policy purchase to renew
- `paymentMethod` (string, required): Payment method - `card`, `upi`, `netbanking`, `wallet`

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Renewal initiated. Processing payment...",
  "renewalId": "507f1f77bcf86cd799439022",
  "transactionId": "REN-1699875123456-A1B2C3D4",
  "status": "processing"
}
```

**Notes:**
- Payment is processed asynchronously
- Poll the renewal status endpoint or wait for email notification
- In sandbox mode, payment typically completes within 1-3 seconds

**Error Responses:**
- `400`: Missing required fields, not eligible, or renewal already in progress
- `403`: Unauthorized
- `404`: Purchase not found

---

### 3. Get Renewal Status
**GET** `/renewals/:renewalId`

Get the current status and details of a renewal transaction.

**Authentication:** Required

**URL Parameters:**
- `renewalId` (string): The ID of the renewal transaction

**Response (200 OK - Success):**
```json
{
  "renewal": {
    "id": "507f1f77bcf86cd799439022",
    "transactionId": "REN-1699875123456-A1B2C3D4",
    "status": "success",
    "amount": 15000,
    "currency": "INR",
    "paymentMethod": "card",
    "oldExpiryDate": "2025-12-01T00:00:00.000Z",
    "newExpiryDate": "2026-12-01T00:00:00.000Z",
    "createdAt": "2025-11-25T10:30:00.000Z",
    "completedAt": "2025-11-25T10:30:03.500Z",
    "errorMessage": null
  },
  "purchase": {
    "id": "507f1f77bcf86cd799439011",
    "policyNumber": "POL-12345",
    "policyName": "Comprehensive Car Insurance"
  }
}
```

**Response (200 OK - Failed):**
```json
{
  "renewal": {
    "id": "507f1f77bcf86cd799439022",
    "transactionId": "REN-1699875123456-A1B2C3D4",
    "status": "failed",
    "amount": 15000,
    "currency": "INR",
    "paymentMethod": "card",
    "oldExpiryDate": "2025-12-01T00:00:00.000Z",
    "newExpiryDate": null,
    "createdAt": "2025-11-25T10:30:00.000Z",
    "completedAt": "2025-11-25T10:30:02.800Z",
    "errorMessage": "Payment declined by gateway"
  },
  "purchase": {
    "id": "507f1f77bcf86cd799439011",
    "policyNumber": "POL-12345",
    "policyName": "Comprehensive Car Insurance"
  }
}
```

**Error Responses:**
- `403`: Unauthorized (renewal belongs to another user)
- `404`: Renewal not found

---

### 4. Get My Renewals
**GET** `/renewals/my`

Get the authenticated user's renewal history with pagination.

**Authentication:** Required

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response (200 OK):**
```json
{
  "renewals": [
    {
      "id": "507f1f77bcf86cd799439022",
      "transactionId": "REN-1699875123456-A1B2C3D4",
      "status": "success",
      "amount": 15000,
      "currency": "INR",
      "policyName": "Comprehensive Car Insurance",
      "policyType": "4W",
      "oldExpiryDate": "2025-12-01T00:00:00.000Z",
      "newExpiryDate": "2026-12-01T00:00:00.000Z",
      "createdAt": "2025-11-25T10:30:00.000Z",
      "completedAt": "2025-11-25T10:30:03.500Z"
    },
    {
      "id": "507f1f77bcf86cd799439023",
      "transactionId": "REN-1698765432100-X9Y8Z7W6",
      "status": "failed",
      "amount": 12000,
      "currency": "INR",
      "policyName": "Health Insurance Plan",
      "policyType": "Health",
      "oldExpiryDate": "2025-06-15T00:00:00.000Z",
      "newExpiryDate": null,
      "createdAt": "2025-06-08T15:20:00.000Z",
      "completedAt": "2025-06-08T15:20:02.100Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "pages": 1
  }
}
```

---

## Renewal Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Renewal Configuration
RENEWAL_WINDOW_DAYS=7

# Payment Gateway Configuration
PAYMENT_GATEWAY_MODE=sandbox
SANDBOX_MIN_MS=1000
SANDBOX_MAX_MS=3000
PAYMENT_PROVIDER_API_KEY=your_payment_provider_api_key_here
```

**Configuration Details:**
- `RENEWAL_WINDOW_DAYS`: Number of days before expiry when renewal becomes available (default: 7)
- `PAYMENT_GATEWAY_MODE`: `sandbox` for development/testing, `live` for production
- `SANDBOX_MIN_MS/MAX_MS`: Simulated payment processing delay range in milliseconds
- `PAYMENT_PROVIDER_API_KEY`: API key for live payment gateway (not used in sandbox mode)

### Postman Collection Example

**Check Eligibility:**
```bash
curl -X GET \
  http://localhost:5001/api/renewals/eligibility/507f1f77bcf86cd799439011 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Initiate Renewal:**
```bash
curl -X POST \
  http://localhost:5001/api/renewals/initiate \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseId": "507f1f77bcf86cd799439011",
    "paymentMethod": "card"
  }'
```

**Get Renewal Status:**
```bash
curl -X GET \
  http://localhost:5001/api/renewals/507f1f77bcf86cd799439022 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Get My Renewals:**
```bash
curl -X GET \
  'http://localhost:5001/api/renewals/my?page=1&limit=10' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## Renewal Flow

1. **User checks eligibility** → GET `/renewals/eligibility/:purchaseId`
2. **If eligible, initiates renewal** → POST `/renewals/initiate`
3. **Payment processed asynchronously** (1-3 seconds in sandbox)
4. **User polls status** → GET `/renewals/:renewalId` or receives email notification
5. **On success:** Policy expiry date is updated, user receives confirmation email
6. **On failure:** User receives failure email with retry instructions

---

## Email Notifications

### Renewal Success Email
- Sent automatically when payment succeeds
- Includes: Transaction ID, amount paid, new expiry date, policy details
- Template: `templates/renewalSuccess.html`

### Renewal Failure Email
- Sent automatically when payment fails
- Includes: Transaction ID, error reason, retry instructions
- Template: `templates/renewalFailure.html`

---

## Logging

All renewal events are logged to `logs/renewals.log` in JSON format:

```json
{"event":"RENEWAL_SUCCESS","transactionId":"REN-1699875123456-A1B2C3D4","purchaseId":"507f1f77bcf86cd799439011","userId":"507f1f77bcf86cd799439001","amount":15000,"oldExpiry":"2025-12-01T00:00:00.000Z","newExpiry":"2026-12-01T00:00:00.000Z","timestamp":"2025-11-25T10:30:03.500Z"}
{"event":"RENEWAL_FAILED","transactionId":"REN-1699875123456-A1B2C3D4","purchaseId":"507f1f77bcf86cd799439011","userId":"507f1f77bcf86cd799439001","amount":15000,"error":"Payment declined by gateway","timestamp":"2025-11-25T10:30:02.800Z"}
```

---

