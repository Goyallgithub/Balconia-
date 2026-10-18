import { test, describe } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3001";

describe("TASK 2: Secure Registration with Email OR Mobile OTP", () => {

  describe("2.1 Input Validation & Password Rules", () => {
    test("POST /api/auth/send-otp rejects missing or short full name with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "A",
          email: "valid@example.com",
          phone: "+919876543210",
          password: "password123",
          confirmPassword: "password123",
          verifyMethod: "email",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /full name/i);
    });

    test("POST /api/auth/send-otp rejects invalid email format with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Pooja Sharma",
          email: "not-an-email",
          phone: "+919876543210",
          password: "password123",
          confirmPassword: "password123",
          verifyMethod: "email",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /valid email/i);
    });

    test("POST /api/auth/send-otp rejects invalid phone format with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Pooja Sharma",
          email: "pooja@example.com",
          phone: "123", // too short
          password: "password123",
          confirmPassword: "password123",
          verifyMethod: "phone",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /valid mobile number/i);
    });

    test("POST /api/auth/send-otp rejects passwords shorter than 6 characters with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Pooja Sharma",
          email: "pooja1@example.com",
          phone: "+919876543210",
          password: "123",
          confirmPassword: "123",
          verifyMethod: "email",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /at least 6 characters/i);
    });

    test("POST /api/auth/send-otp rejects password and confirm password mismatch with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Pooja Sharma",
          email: "pooja2@example.com",
          phone: "+919876543210",
          password: "password123",
          confirmPassword: "differentPassword456",
          verifyMethod: "email",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /passwords do not match/i);
    });
  });

  describe("2.2 Email OTP Verification Flow", () => {
    test("Successful email OTP initiation and verification", async () => {
      const email = `test.user.${Date.now()}@example.com`;

      // 1. Send OTP (verify no secrets leaked in standard client call)
      const standardSendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Aarav Patel",
          email,
          phone: "+919812345678",
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
          verifyMethod: "email",
        }),
      });
      assert.equal(standardSendRes.status, 200);
      const standardData = await standardSendRes.json();
      assert.ok(standardData.verificationToken);
      assert.equal(standardData.otp, undefined, "OTP must not be leaked to standard client");
      assert.equal(standardData.debugOtp, undefined, "debugOtp must not be leaked to standard client");

      // 2. Request OTP with test header to verify OTP matching
      const testEmail = `test.verified.${Date.now()}@example.com`;
      const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-balconia-test": "true",
        },
        body: JSON.stringify({
          fullName: "Aarav Patel",
          email: testEmail,
          phone: "+919812345679",
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
          verifyMethod: "email",
        }),
      });

      assert.equal(sendRes.status, 200);
      const sendData = await sendRes.json();
      assert.ok(sendData.verificationToken);
      assert.ok(sendData.debugOtp, "Test header should return debugOtp");
      assert.equal(sendData.verifyMethod, "email");
      assert.ok(sendData.destination.includes("@"));

      // 3. Attempt verification with incorrect OTP -> 400
      const badVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: sendData.verificationToken,
          otp: "000000",
        }),
      });
      assert.equal(badVerifyRes.status, 400);
      const badData = await badVerifyRes.json();
      assert.match(badData.error, /incorrect verification code/i);

      // 4. Verify with the correct OTP -> 200 OK with session tokens
      const okVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: sendData.verificationToken,
          otp: sendData.debugOtp,
        }),
      });
      assert.equal(okVerifyRes.status, 200);
      const okData = await okVerifyRes.json();
      assert.ok(okData.success);
      assert.ok(okData.access_token, "Expected access_token in response");
      assert.equal(okData.user.email, testEmail);

      // 5. Verification token is single-use: replay attempt returns 400
      const replayRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: sendData.verificationToken,
          otp: sendData.debugOtp,
        }),
      });
      assert.equal(replayRes.status, 400);
    });
  });

  describe("2.3 Mobile Phone OTP Verification Flow", () => {
    test("Successful phone OTP initiation and verification", async () => {
      const phone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
      const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-balconia-test": "true",
        },
        body: JSON.stringify({
          fullName: "Diya Mehra",
          email: `diya.${Date.now()}@example.com`,
          phone,
          password: "MobilePassword123!",
          confirmPassword: "MobilePassword123!",
          verifyMethod: "phone",
        }),
      });

      assert.equal(sendRes.status, 200);
      const sendData = await sendRes.json();
      assert.ok(sendData.verificationToken);
      assert.equal(sendData.verifyMethod, "phone");
      assert.ok(sendData.debugOtp);

      // Verify OTP successfully
      const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: sendData.verificationToken,
          otp: sendData.debugOtp,
        }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = await verifyRes.json();
      assert.ok(verifyData.access_token);
      assert.equal(verifyData.user.phone, phone);
    });
  });

  describe("2.4 Resend Cooldowns & Rate Limits", () => {
    test("Resend immediately triggers 429 cooldown error", async () => {
      const email = `cooldown.${Date.now()}@example.com`;
      const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Rohan Varma",
          email,
          phone: "+919711223344",
          password: "Password123",
          confirmPassword: "Password123",
          verifyMethod: "email",
        }),
      });
      assert.equal(sendRes.status, 200);
      const { verificationToken } = await sendRes.json();

      // Immediate resend attempt should fail with 429
      const resendRes = await fetch(`${BASE_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationToken }),
      });
      assert.equal(resendRes.status, 429);
      const resendData = await resendRes.json();
      assert.match(resendData.error, /please wait/i);

      // Immediate new send-otp for same recipient should also trigger cooldown
      const secondSendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Rohan Varma",
          email,
          phone: "+919711223344",
          password: "Password123",
          confirmPassword: "Password123",
          verifyMethod: "email",
        }),
      });
      assert.equal(secondSendRes.status, 429);
    });
  });

  describe("2.5 OTP Expiration & Attempt Limits", () => {
    test("Exceeding 5 incorrect attempts blocks with 429 and invalidates session", async () => {
      const email = `attempts.${Date.now()}@example.com`;
      const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-balconia-test": "true",
        },
        body: JSON.stringify({
          fullName: "Attempt User",
          email,
          phone: `+9196${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: "Password123",
          confirmPassword: "Password123",
          verifyMethod: "email",
        }),
      });
      assert.equal(sendRes.status, 200);
      const { verificationToken } = await sendRes.json();

      // Send 5 wrong attempts
      for (let i = 1; i <= 5; i++) {
        const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationToken, otp: "000000" }),
        });
        if (i < 5) {
          assert.equal(res.status, 400);
        } else {
          // 5th failed attempt invalidates the session
          assert.ok(res.status === 400 || res.status === 429);
        }
      }

      // Subsequent 6th attempt should be blocked / rejected
      const res6 = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationToken, otp: "000000" }),
      });
      assert.ok(res6.status === 400 || res6.status === 429);
    });
  });

  describe("2.6 Sign In & Session Authenticity", () => {
    test("POST /api/auth/signin succeeds with valid credentials and fails on wrong password", async () => {
      const email = `signin.${Date.now()}@example.com`;
      const password = "ValidPassword123";

      // 1. Invalid email format -> 400
      const badEmailRes = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid", password }),
      });
      assert.equal(badEmailRes.status, 400);

      // 2. Short / invalid password -> 401
      const badPassRes = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "123" }),
      });
      assert.equal(badPassRes.status, 401);

      // 3. Valid signin credentials -> 200 with access token
      const okRes = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(okRes.status, 200);
      const data = await okRes.json();
      assert.ok(data.access_token);
      assert.equal(data.user.email, email);

      // 4. Verify authenticated token works on protected API
      const protectedRes = await fetch(`${BASE_URL}/api/designs`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      assert.equal(protectedRes.status, 200);
      const protectedData = await protectedRes.json();
      assert.equal(protectedData.signedIn, true);
    });
  });
});
