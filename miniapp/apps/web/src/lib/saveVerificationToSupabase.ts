/**
 * Supabase Integration for Self Protocol Verification
 *
 * This function saves the verification result to your users table
 * after successful Self Protocol verification.
 */

import { createClient } from "@/utils/supabase/client";

interface VerificationData {
  status: "Unique Human" | "Bot Detected";
  age: number | null;
  ageRange: string;
  country: string;
  countryCode: string;
  matchedPool: string;
  gender?: string;
}

/**
 * Save verification result to Supabase
 *
 * This function will:
 * 1. Check if user exists in the database
 * 2. Create new user if doesn't exist
 * 3. Update user with verification data
 *
 * Supabase table schema:
 *
 * users (
 *   address: TEXT PRIMARY KEY (wallet address),
 *   cusdc_balance: NUMERIC(38, 6) DEFAULT 0,
 *   gender: TEXT,
 *   country: TEXT,
 *   age: INT,
 *   verified: BOOLEAN DEFAULT FALSE,
 *   streak: INT DEFAULT 0,
 *   total_earnings: NUMERIC(38, 6) DEFAULT 0,
 *   created_at: TIMESTAMP DEFAULT NOW(),
 *   updated_at: TIMESTAMP DEFAULT NOW()
 * )
 */
export async function saveVerificationToSupabase(
  walletAddress: string,
  verificationData: VerificationData,
  farcasterFid?: number
): Promise<void> {
  try {
    const supabase = createClient();

    // Normalize address to lowercase for case-insensitive comparison
    const normalizedAddress = walletAddress.toLowerCase();

    console.log("💾 Saving verification to Supabase:", {
      walletAddress: normalizedAddress,
      verificationData,
      farcasterFid,
    });

    // First, check if user already exists
    const { data: existingUser, error: queryError } = await supabase
      .from("users")
      .select("address, verified")
      .eq("address", normalizedAddress)
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected for new users
      throw queryError;
    }

    const now = new Date().toISOString();
    const isVerified = verificationData.status === "Unique Human";

    if (existingUser) {
      // User exists - check if they're already verified
      if (existingUser.verified) {
        // User is already verified, skip update
        console.log("✅ User already verified, skipping update:", existingUser.address);
        return;
      }

      // User exists but not verified - update verification data
      console.log("📝 Updating unverified user:", existingUser.address);

      const { data, error } = await supabase
        .from("users")
        .update({
          verified: isVerified,
          country: verificationData.country,
          age: verificationData.age,
          gender: verificationData.gender || null,
          updated_at: now,
        })
        .eq("address", normalizedAddress)
        .select();

      if (error) throw error;

      console.log("✅ User updated successfully:", data);
    } else {
      // User doesn't exist - create new user
      console.log("🆕 Creating new user:", normalizedAddress);

      const { data, error } = await supabase
        .from("users")
        .insert({
          address: normalizedAddress,
          verified: isVerified,
          country: verificationData.country,
          age: verificationData.age,
          gender: verificationData.gender || null,
          cusdc_balance: 0,
          streak: 0,
          total_earnings: 0,
          created_at: now,
          updated_at: now,
        })
        .select();

      if (error) throw error;

      console.log("✅ User created successfully:", data);
    }
  } catch (error) {
    console.error("❌ Failed to save verification:", error);
    throw error;
  }
}
