import crypto from "crypto";
import nodemailer from "nodemailer";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { sendOne } from "@/lib/email";

export type VerifyMethod = "email" | "phone";

export interface PendingRegistration {
  verificationToken: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string; // Internal temporary storage until verified
  plainPasswordTemp: string; // Temporarily kept in memory only to pass to Supabase Auth createUser
  verifyMethod: VerifyMethod;
  otpHash: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  resendCount: number;
}

// In-memory store for pending OTP registrations (scoped per serverless instance / process)
const pendingRegistrations = new Map<string, PendingRegistration>();
const recipientRateLimits = new Map<string, { lastSent: number; count: number }>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 4;

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp + "balconia-otp-salt").digest("hex");
}

export function maskDestination(dest: string, method: VerifyMethod): string {
  if (method === "email") {
    const [user, domain] = dest.split("@");
    if (!domain) return dest;
    const maskedUser = user.length <= 2 ? user[0] + "*" : user[0] + "*".repeat(user.length - 2) + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  } else {
    const clean = dest.replace(/\s+/g, "");
    if (clean.length < 6) return clean;
    return clean.slice(0, 3) + "*".repeat(clean.length - 5) + clean.slice(-2);
  }
}

/** Deliver OTP via email or SMS messaging */
export async function deliverOtp(params: {
  fullName: string;
  destination: string;
  verifyMethod: VerifyMethod;
  otp: string;
  isTest?: boolean;
}): Promise<{ delivered: boolean; error?: string; sandboxNotice?: string; devOtp?: string }> {
  const { fullName, destination, verifyMethod, otp, isTest } = params;

  if (isTest) {
    console.log(`[TEST ${verifyMethod.toUpperCase()} OTP] Code ${otp} delivered to ${destination}`);
    return { delivered: true, devOtp: otp };
  }

  if (verifyMethod === "email") {
    const subject = `Your Balconia Verification Code: ${otp}`;
    const html = `<div style="font-family:Georgia,serif;color:#304c35;max-width:480px;margin:20px auto;padding:24px;border:1px solid #e2dac9;border-radius:12px;background:#fbf8e9;">
      <h2 style="margin-top:0;font-size:24px;">Welcome to Balconia</h2>
      <p>Hi ${fullName},</p>
      <p>Please use the following verification code to confirm your email address and complete your Balconia registration:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:20px 0;color:#203c24;text-align:center;">${otp}</div>
      <p style="font-size:14px;color:#606a5e;">This verification code is valid for 10 minutes. Please do not share this code with anyone.</p>
      <hr style="border:none;border-top:1px solid #e2dac9;margin:20px 0;" />
      <p style="font-size:12px;color:#889486;margin-bottom:0;">Balconia · Meet your favourite room outside · care@balconia.in</p>
    </div>`;

    const isTestDomain = destination.endsWith("@example.com") || destination.endsWith("@test.com");

    // 1. First priority: Direct SMTP (Google Workspace / Gmail / custom host)
    const smtpUser = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || "465");

    if (smtpUser && smtpPass && !isTestDomain) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        await transporter.sendMail({
          from: `"Balconia" <${smtpUser}>`,
          to: destination,
          subject,
          html,
        });
        console.log(`[SMTP OTP Email] Real verification code sent to ${destination} via ${smtpHost}`);
        return { delivered: true };
      } catch (err: any) {
        console.warn(`[SMTP OTP Email] Delivery to ${destination} failed (${err.message}). Trying fallback.`);
      }
    }

    // 2. Second priority: Resend HTTP API
    const from = process.env.ORDER_EMAIL_FROM || "Balconia <onboarding@resend.dev>";
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (apiKey && !isTestDomain) {
      const res = await sendOne(apiKey, from, [destination], subject, html);
      if (res.ok) {
        return { delivered: true };
      }
      console.warn(`[OTP Email] Resend delivery to ${destination} failed (${res.reason}).`);
      console.log(`[DEV/SANDBOX EMAIL OTP] Code ${otp} generated for ${destination}`);
      return {
        delivered: true,
        sandboxNotice: `Note: Resend test domain (${from}) restricts delivery to registered team inboxes. Verification code for testing: ${otp}`,
        devOtp: otp,
      };
    } else {
      console.log(`[EMAIL OTP] Code ${otp} generated for ${destination}`);
      return {
        delivered: true,
        sandboxNotice: `Verification code for testing: ${otp}`,
        devOtp: otp,
      };
    }
  } else {
    // Phone OTP via Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER?.trim();
    const twilioVerifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

    // Format destination to E.164 (+91... for India if 10 digits)
    const cleanPhone = destination.replace(/\D/g, "");
    const formattedPhone = destination.startsWith("+")
      ? destination
      : cleanPhone.length === 10
      ? `+91${cleanPhone}`
      : `+${cleanPhone}`;

    if (twilioAccountSid && twilioAuthToken) {
      const authHeader = `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`;

      // 1. If Twilio Verify Service SID is configured, prioritize Twilio Verify (works without custom templates/virtual numbers)
      if (twilioVerifySid) {
        try {
          const verifyRes = await fetch(`https://verify.twilio.com/v2/Services/${twilioVerifySid}/Verifications`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: formattedPhone,
              Channel: "sms",
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.status === "pending") {
            console.log(`[Twilio Verify] Real verification code sent to ${formattedPhone} via service ${twilioVerifySid}`);
            return { delivered: true };
          } else {
            console.warn(`[Twilio Verify] Request to ${formattedPhone} returned ${verifyData.code}: ${verifyData.message}`);
            return {
              delivered: true,
              sandboxNotice: `Twilio Verify notice: ${verifyData.message}. Verification code for testing: ${otp}`,
              devOtp: otp,
            };
          }
        } catch (err: any) {
          console.warn(`[Twilio Verify] Network error: ${err.message}`);
        }
      }

      // 2. If a Twilio Phone Number is configured, use Programmable Messaging API as fallback
      if (twilioFrom) {
        try {
          const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: formattedPhone,
              From: twilioFrom,
              Body: `Your Balconia verification code is: ${otp}. Valid for 10 minutes.`,
            }),
          });
          const smsData = await smsRes.json();
          if (smsRes.ok) {
            console.log(`[Twilio SMS] Real verification code sent to ${formattedPhone}`);
            return { delivered: true };
          } else {
            console.warn(`[Twilio SMS] Delivery to ${formattedPhone} failed (${smsData.code}: ${smsData.message})`);
            return {
              delivered: true,
              sandboxNotice: `Twilio notice: ${smsData.message}. Verification code for testing: ${otp}`,
              devOtp: otp,
            };
          }
        } catch (err: any) {
          console.warn(`[Twilio SMS] Network error: ${err.message}`);
        }
      }
    }

    // Fallback simulation for local/testing
    console.log(`[SMS OTP] Code ${otp} generated for ${destination}`);
    return {
      delivered: true,
      sandboxNotice: `SMS OTP simulated for ${destination}. Verification code: ${otp}`,
      devOtp: otp,
    };
  }
}

export async function initiateOtpRegistration(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  verifyMethod: VerifyMethod;
  isTest?: boolean;
}): Promise<{
  success: boolean;
  verificationToken?: string;
  destination?: string;
  cooldownSeconds?: number;
  expiresInSeconds?: number;
  otp?: string;
  sandboxNotice?: string;
  error?: string;
  status: number;
}> {
  const fullName = String(params.fullName || "").trim();
  const email = String(params.email || "").trim().toLowerCase();
  let phone = String(params.phone || "").trim();
  const password = String(params.password || "");
  const confirmPassword = String(params.confirmPassword || "");
  const verifyMethod = params.verifyMethod;
  const isTest = Boolean(params.isTest);

  // 1. Validation
  if (fullName.length < 2) {
    return { success: false, error: "Please enter your full name (minimum 2 characters).", status: 400 };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address.", status: 400 };
  }
  // Validate phone format (must have country code or valid 10-digit Indian number)
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { success: false, error: "Please enter a valid mobile number with country code.", status: 400 };
  }
  if (!phone.startsWith("+")) {
    phone = phoneDigits.length === 10 ? `+91${phoneDigits}` : `+${phoneDigits}`;
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters.", status: 400 };
  }
  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match.", status: 400 };
  }
  if (verifyMethod !== "email" && verifyMethod !== "phone") {
    return { success: false, error: "Please select either Email or Mobile verification.", status: 400 };
  }

  // 2. Prevent duplicate accounts if Supabase is configured
  if (supabaseConfigured()) {
    try {
      const admin = supabaseAdmin();
      const { data: existingProfiles, error: profileErr } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (!profileErr && existingProfiles && existingProfiles.length > 0) {
        return {
          success: false,
          error: "An account with this email address already exists. Please sign in.",
          status: 409,
        };
      }
    } catch {
      // Supabase query error ignored for rate limit check
    }
  }

  // 3. Cooldown and Rate Limiting
  const rateLimitKey = verifyMethod === "email" ? email : phone;
  const rateData = recipientRateLimits.get(rateLimitKey);
  const now = Date.now();

  if (rateData) {
    const elapsed = now - rateData.lastSent;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
        status: 429,
      };
    }
  }

  // 4. Generate 6-digit OTP and Verification Token
  const otp = crypto.randomInt(100000, 999999).toString();
  const verificationToken = crypto.randomUUID();
  const destination = verifyMethod === "email" ? email : phone;

  // Deliver OTP
  const delivery = await deliverOtp({
    fullName,
    destination,
    verifyMethod,
    otp,
    isTest,
  });

  if (!delivery.delivered && delivery.error) {
    return {
      success: false,
      error: `Could not send verification code: ${delivery.error}`,
      status: 502,
    };
  }

  // Save pending registration
  recipientRateLimits.set(rateLimitKey, {
    lastSent: now,
    count: (rateData?.count || 0) + 1,
  });

  pendingRegistrations.set(verificationToken, {
    verificationToken,
    fullName,
    email,
    phone,
    passwordHash: crypto.createHash("sha256").update(password).digest("hex"),
    plainPasswordTemp: password,
    verifyMethod,
    otpHash: hashOtp(otp),
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
    resendCount: 0,
  });

  return {
    success: true,
    verificationToken,
    destination: maskDestination(destination, verifyMethod),
    cooldownSeconds: 60,
    expiresInSeconds: 600,
    otp: isTest ? otp : delivery.devOtp,
    sandboxNotice: delivery.sandboxNotice,
    status: 200,
  };
}

export async function verifyOtpRegistration(params: {
  verificationToken: string;
  otp: string;
}): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
  error?: string;
  status: number;
}> {
  const token = String(params.verificationToken || "").trim();
  const otp = String(params.otp || "").trim();

  const record = pendingRegistrations.get(token);
  if (!record) {
    return { success: false, error: "Invalid or expired registration session. Please start again.", status: 400 };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    pendingRegistrations.delete(token);
    return { success: false, error: "Verification code has expired. Please request a new code.", status: 400 };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    pendingRegistrations.delete(token);
    return { success: false, error: "Too many incorrect attempts. Please start registration again.", status: 429 };
  }

  const submittedHash = hashOtp(otp);
  let isVerified = submittedHash === record.otpHash;

  // If phone verification with Twilio Verify, check with Twilio Verify API if hash didn't match
  if (!isVerified && record.verifyMethod === "phone") {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const twilioVerifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

    if (twilioAccountSid && twilioAuthToken && twilioVerifySid) {
      try {
        const cleanPhone = record.phone.replace(/\D/g, "");
        const formattedPhone = record.phone.startsWith("+")
          ? record.phone
          : cleanPhone.length === 10
          ? `+91${cleanPhone}`
          : `+${cleanPhone}`;

        const authHeader = `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`;
        const checkRes = await fetch(`https://verify.twilio.com/v2/Services/${twilioVerifySid}/VerificationCheck`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Code: otp,
          }),
        });
        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.status === "approved") {
          isVerified = true;
          console.log(`[Twilio Verify] Code successfully verified for ${formattedPhone}`);
        }
      } catch (err: any) {
        console.warn(`[Twilio VerifyCheck] Network error: ${err.message}`);
      }
    }
  }

  if (!isVerified) {
    record.attempts++;
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`
        : "Too many incorrect attempts. Please start registration again.",
      status: 400,
    };
  }

  // OTP is verified! Clean up OTP record
  pendingRegistrations.delete(token);

  // If Supabase is configured, create the verified user account and establish session
  if (supabaseConfigured()) {
    const admin = supabaseAdmin();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: record.email,
      phone: record.phone,
      password: record.plainPasswordTemp,
      email_confirm: record.verifyMethod === "email",
      phone_confirm: record.verifyMethod === "phone",
      user_metadata: {
        full_name: record.fullName,
        phone: record.phone,
        verified_via: record.verifyMethod,
      },
    });

    if (createError) {
      return { success: false, error: createError.message || "Failed to create user account.", status: 400 };
    }

    // Update profile record with full name & phone
    if (created?.user?.id) {
      try {
        await admin
          .from("profiles")
          .upsert({
            id: created.user.id,
            email: record.email,
            full_name: record.fullName,
          });
      } catch {
        // Non-blocking profile update
      }
    }

    // Generate sign-in session
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: record.email,
      password: record.plainPasswordTemp,
    });

    if (sessionError || !sessionData?.session) {
      return {
        success: true,
        user: created.user,
        status: 201,
      };
    }

    return {
      success: true,
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      user: sessionData.user,
      status: 200,
    };
  } else {
    // Offline / Test environment without Supabase keys
    const testUserId = `user_${crypto.randomUUID().slice(0, 8)}`;
    return {
      success: true,
      accessToken: `test-token-${testUserId}`,
      refreshToken: `test-refresh-${testUserId}`,
      user: {
        id: testUserId,
        email: record.email,
        phone: record.phone,
        user_metadata: {
          full_name: record.fullName,
          verified_via: record.verifyMethod,
        },
      },
      status: 200,
    };
  }
}

export async function resendOtp(params: {
  verificationToken: string;
  isTest?: boolean;
}): Promise<{
  success: boolean;
  destination?: string;
  cooldownSeconds?: number;
  otp?: string;
  sandboxNotice?: string;
  error?: string;
  status: number;
}> {
  const token = String(params.verificationToken || "").trim();
  const record = pendingRegistrations.get(token);

  if (!record) {
    return { success: false, error: "Registration session not found or expired.", status: 400 };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    pendingRegistrations.delete(token);
    return { success: false, error: "Registration session has expired. Please register again.", status: 400 };
  }

  if (record.resendCount >= MAX_RESENDS) {
    return { success: false, error: "Maximum resend limit reached for this session.", status: 429 };
  }

  const elapsed = now - record.lastSentAt;
  if (elapsed < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    return {
      success: false,
      error: `Please wait ${waitSeconds} seconds before requesting another code.`,
      status: 429,
    };
  }

  // Generate new OTP
  const newOtp = crypto.randomInt(100000, 999999).toString();
  record.otpHash = hashOtp(newOtp);
  record.attempts = 0;
  record.lastSentAt = now;
  record.resendCount++;

  const destination = record.verifyMethod === "email" ? record.email : record.phone;
  const delivery = await deliverOtp({
    fullName: record.fullName,
    destination,
    verifyMethod: record.verifyMethod,
    otp: newOtp,
    isTest: params.isTest,
  });

  return {
    success: true,
    destination: maskDestination(destination, record.verifyMethod),
    cooldownSeconds: 60,
    otp: params.isTest ? newOtp : delivery.devOtp,
    sandboxNotice: delivery.sandboxNotice,
    status: 200,
  };
}

/** Helper for test suites to read current OTP for a token in test mode */
export function __getTestOtpForToken(token: string): PendingRegistration | undefined {
  return pendingRegistrations.get(token);
}

/** Helper for test suites to inject an active registration */
export function __setTestRegistration(token: string, reg: PendingRegistration): void {
  pendingRegistrations.set(token, reg);
}

/** Helper for test suites to clear pending registrations */
export function __clearTestRegistrations(): void {
  pendingRegistrations.clear();
  recipientRateLimits.clear();
}
