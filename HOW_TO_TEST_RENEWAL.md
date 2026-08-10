# How to Test the Policy Renewal Feature

## Quick Start Guide

### Step 1: Start the Application

1. **Start the Backend:**
   ```bash
   cd official_se
   npm start
   ```
   The backend should start on `http://localhost:5001`

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm start
   ```
   The frontend should start on `http://localhost:3000`

### Step 2: Login or Register

1. Open your browser and go to `http://localhost:3000`
2. Login with your existing account or register a new one
3. You'll be redirected to the dashboard

### Step 3: Create a Test Purchase

Since the renewal feature requires a policy that's expiring within 7 days, we've added a special **Test Purchase Creator** tool:

1. **Navigate to "My Purchases":**
   - Click on "My Purchases" in the navigation menu
   - Or go directly to `http://localhost:3000/purchases`

2. **Click "Create Test Purchase (Renewal Testing)":**
   - You'll see this button in the top right corner
   - It opens a dialog for creating test purchases

3. **Configure Your Test Purchase:**
   - **Select Policy:** Choose any policy from the dropdown
   - **Days Until Expiry:** Set how many days until the policy expires
     - Set to **5 or less** to make it immediately eligible for renewal
     - The renewal window is 7 days before expiry
   - Click "Create Test Purchase"

4. **Success!**
   - The test purchase will appear in your list
   - If you set it to expire within 7 days, you'll see:
     - 🟡 "Renewal Available" badge
     - Expiry date with countdown (e.g., "5 days left")
     - 🟠 "Renew Policy" button

### Step 4: Test the Renewal Flow

1. **Click "Renew Policy":**
   - You'll be redirected to the renewal page
   - The system automatically checks eligibility

2. **Review Policy Details:**
   - Policy name and type
   - Current expiry date
   - Days until expiry
   - Renewal amount

3. **Select Payment Method:**
   - Credit/Debit Card
   - UPI
   - Net Banking
   - Wallet

4. **Click "Renew Now":**
   - Payment processing begins (simulated)
   - You'll see a loading spinner
   - The system polls for payment status

5. **Payment Result:**
   - **90% Success Rate:** You'll see a success dialog with:
     - Transaction ID
     - Amount paid
     - New expiry date
     - Confirmation message
   - **10% Failure Rate:** You'll see a failure dialog with:
     - Error message
     - "Try Again" button
     - Troubleshooting tips

6. **After Success:**
   - An email confirmation is sent (check backend logs)
   - Return to "My Purchases"
   - The policy now shows:
     - 🟢 "Renewed" badge
     - Updated expiry date
     - Renewal in purchase history

## Testing Scenarios

### Scenario 1: Eligible Policy (Within 7 Days)
```
Days Until Expiry: 5
Expected: ✅ Eligible for renewal
Button: "Renew Policy" visible
Badge: "Renewal Available" shown
```

### Scenario 2: Not Yet Eligible (More than 7 Days)
```
Days Until Expiry: 10
Expected: ❌ Not eligible
Message: "Come back when you're within the renewal window"
Button: No renewal button shown
```

### Scenario 3: Successful Renewal
```
1. Create test purchase (5 days)
2. Click "Renew Policy"
3. Select payment method
4. Click "Renew Now"
5. Wait 1-3 seconds
6. Success dialog appears
7. New expiry date shown
8. Email sent (check logs)
```

### Scenario 4: Failed Renewal with Retry
```
1. Initiate renewal
2. Payment fails (10% chance)
3. Failure dialog appears
4. Click "Try Again"
5. Select different payment method
6. Complete successfully
```

### Scenario 5: Multiple Test Purchases
```
Create multiple test purchases with different expiry dates:
- 3 days: Eligible
- 5 days: Eligible
- 10 days: Not eligible
- 1 day: Urgent renewal
```

## API Testing with cURL

### Check Eligibility
```bash
curl -X GET http://localhost:5001/api/renewals/eligibility/{purchaseId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Initiate Renewal
```bash
curl -X POST http://localhost:5001/api/renewals/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseId": "PURCHASE_ID",
    "paymentMethod": "card"
  }'
```

### Check Renewal Status
```bash
curl -X GET http://localhost:5001/api/renewals/{renewalId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Renewals
```bash
curl -X GET http://localhost:5001/api/renewals/my?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Test Purchase
```bash
curl -X POST http://localhost:5001/api/purchase/create-test-purchase \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "POLICY_ID",
    "daysUntilExpiry": 5
  }'
```

## Troubleshooting

### Issue: "Renewal Available" badge not showing
**Solution:**
- Make sure the test purchase has `daysUntilExpiry` set to 7 or less
- Refresh the "My Purchases" page
- Check that the purchase status is "success"

### Issue: Payment always fails
**Solution:**
- Check `.env` file: `PAYMENT_GATEWAY_MODE=sandbox`
- Increase `SANDBOX_SUCCESS_RATE` to `1.0` for testing
- Check backend logs for errors

### Issue: No policies showing in test dialog
**Solution:**
- Make sure you have policies in the database
- Check that the backend is running
- Check browser console for API errors

### Issue: Email not sent
**Solution:**
- Email functionality requires SMTP configuration
- Check `config/mailer.js` settings
- For testing, check backend console logs for email content

### Issue: Expiry date not updating after renewal
**Solution:**
- Check that the renewal status is "success"
- Refresh the page
- Check the `renewalHistory` array in the purchase document

## Database Inspection

### Check Purchase Document
```javascript
// MongoDB shell or Compass
db.purchases.findOne({ _id: ObjectId("PURCHASE_ID") })

// Look for:
// - expiryDate: Should be set
// - renewalStatus: 'active' or 'renewed'
// - renewalHistory: Array of past renewals
```

### Check Renewal Documents
```javascript
db.renewals.find({ userId: ObjectId("USER_ID") }).sort({ createdAt: -1 })

// Look for:
// - status: 'success', 'failed', 'processing'
// - transactionId: Unique ID
// - newExpiryDate: Updated expiry after renewal
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Renewal Configuration
RENEWAL_WINDOW_DAYS=7

# Payment Gateway (Sandbox Mode)
PAYMENT_GATEWAY_MODE=sandbox
SANDBOX_SUCCESS_RATE=0.9
SANDBOX_MIN_DELAY_MS=1000
SANDBOX_MAX_DELAY_MS=3000

# Email Configuration (Optional for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Feature Checklist

Use this checklist to verify the renewal feature is working:

- [ ] Can create test purchase with custom expiry date
- [ ] "Renewal Available" badge shows for purchases expiring within 7 days
- [ ] "Renew Policy" button appears for eligible purchases
- [ ] Renewal page displays policy details correctly
- [ ] Can select different payment methods
- [ ] Payment processing shows loading state
- [ ] Success dialog appears with transaction details
- [ ] Failure dialog appears for failed payments
- [ ] Can retry failed payments
- [ ] Email notifications are sent (check logs)
- [ ] Expiry date updates after successful renewal
- [ ] "Renewed" badge appears after renewal
- [ ] Renewal history is tracked in purchase document
- [ ] Cannot renew already renewed policies
- [ ] Cannot renew policies outside 7-day window

## Next Steps

After testing the basic flow:

1. **Test Edge Cases:**
   - Try to renew the same policy twice
   - Test with expired policies
   - Test with policies far from expiry

2. **Test Different Payment Methods:**
   - Card
   - UPI
   - Net Banking
   - Wallet

3. **Test Error Scenarios:**
   - Network failures
   - Invalid purchase IDs
   - Expired JWT tokens

4. **Performance Testing:**
   - Create multiple test purchases
   - Renew multiple policies
   - Check database query performance

5. **Integration Testing:**
   - Run the full test suite: `npm test tests/renewal.test.js`
   - Check CI/CD pipeline

## Support

If you encounter any issues:

1. Check this guide first
2. Review `POLICY_RENEWAL_GUIDE.md` for technical details
3. Check backend logs in `logs/` folder
4. Review test cases in `tests/renewal.test.js`
5. Contact the development team

---

**Happy Testing!** 🎉

Remember: The test purchase creator is for **development and testing only**. In production, purchases will have real expiry dates based on the policy tenure.
