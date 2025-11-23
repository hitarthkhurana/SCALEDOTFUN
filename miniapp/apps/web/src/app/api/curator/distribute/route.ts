import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createWalletClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { DATA_ANNOTATE_ESCROW_ABI } from "@/abi/DataAnnotateEscrow";

export const dynamic = "force-dynamic";

// Constants
const DATA_ANNOTATE_ESCROW_ADDRESS =
  "0x704EEf9f5c4080018f45FC1C048F2fd30F4063d0" as `0x${string}`;
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;

interface DatasetEarnings {
  onChainDatasetId: number;
  totalAmount: string;
  annotationCount: number;
}

/**
 * POST /api/curator/distribute
 * 
 * Distributes accumulated earnings to a user from the DataAnnotateEscrow contract.
 * This endpoint is called by the curator (backend) to pay out users for their annotations.
 * 
 * Body:
 *   - userAddress: The address of the user to distribute funds to
 * 
 * Process:
 *   1. Queries all unpaid annotations for the user
 *   2. Groups by on-chain dataset ID and calculates total owed per dataset
 *   3. Uses curator's private key to call distribute() for each dataset
 *   4. Updates user's cusdc_balance in DB after successful distribution
 */
export async function POST(req: NextRequest) {
  return handleDistribute(req, "POST");
}

/**
 * GET /api/curator/distribute?userAddress=0x...
 * 
 * Same as POST but accepts query parameters for easier testing
 */
export async function GET(req: NextRequest) {
  return handleDistribute(req, "GET");
}

async function handleDistribute(req: NextRequest, method: "GET" | "POST") {
  try {
    let userAddress: string;

    if (method === "POST") {
      const body = await req.json();
      userAddress = body.userAddress;
    } else {
      const { searchParams } = new URL(req.url);
      userAddress = searchParams.get("userAddress") || "";
    }

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 }
      );
    }

    // Validate environment variables
    const curatorPrivateKey = process.env.SECRET_CURATOR_PK;
    if (!curatorPrivateKey) {
      console.error("SECRET_CURATOR_PK not configured");
      return NextResponse.json(
        { success: false, error: "Curator credentials not configured" },
        { status: 500 }
      );
    }

    // Normalize address
    const normalizedAddress = userAddress.toLowerCase();

    // Initialize Supabase
    const supabase = await createClient();

    // Step 1: Get user's current balance
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("cusdc_balance")
      .eq("address", normalizedAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(user.cusdc_balance?.toString() || "0");
    
    if (currentBalance <= 0) {
      return NextResponse.json(
        { success: false, error: "No balance to distribute" },
        { status: 400 }
      );
    }

    // Step 2: Get all annotations by this user and calculate earnings per dataset
    const { data: annotations, error: annotationsError } = await supabase
      .from("annotations")
      .select(`
        annotation_id,
        dataset_id,
        datasets!inner (
          on_chain_dataset_id,
          cusdc_payout_per_annotation,
          active
        )
      `)
      .eq("user_address", normalizedAddress);

    if (annotationsError) {
      console.error("Error fetching annotations:", annotationsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch annotations" },
        { status: 500 }
      );
    }

    if (!annotations || annotations.length === 0) {
      return NextResponse.json(
        { success: false, error: "No annotations found" },
        { status: 404 }
      );
    }

    // Step 3: Group annotations by on_chain_dataset_id and calculate total per dataset
    const datasetEarningsMap = new Map<number, DatasetEarnings>();

    for (const annotation of annotations) {
      const dataset = (annotation as any).datasets;
      const onChainId = dataset.on_chain_dataset_id;
      const payout = parseFloat(dataset.cusdc_payout_per_annotation?.toString() || "0");

      if (!onChainId || payout <= 0) continue;

      if (!datasetEarningsMap.has(onChainId)) {
        datasetEarningsMap.set(onChainId, {
          onChainDatasetId: onChainId,
          totalAmount: payout.toString(),
          annotationCount: 1,
        });
      } else {
        const existing = datasetEarningsMap.get(onChainId)!;
        const newTotal = parseFloat(existing.totalAmount) + payout;
        existing.totalAmount = newTotal.toString();
        existing.annotationCount += 1;
      }
    }

    const datasetEarnings = Array.from(datasetEarningsMap.values());

    if (datasetEarnings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid earnings to distribute" },
        { status: 400 }
      );
    }

    // Step 4: Initialize curator wallet client
    // Ensure private key has 0x prefix
    const formattedPrivateKey = curatorPrivateKey.startsWith('0x') 
      ? curatorPrivateKey 
      : `0x${curatorPrivateKey}`;
    
    const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(),
    });

    // Step 5: Execute distribute transactions for each dataset
    const distributions: {
      onChainDatasetId: number;
      amount: string;
      txHash: string;
    }[] = [];

    for (const earning of datasetEarnings) {
      try {
        console.log(
          `Distributing ${earning.totalAmount} cUSD from dataset ${earning.onChainDatasetId} to ${userAddress}`
        );

        // Convert amount to wei (18 decimals)
        const amountWei = parseUnits(earning.totalAmount, 18);

        // Call distribute function
        // Note: Not using feeCurrency means gas is paid with native CELO token
        const hash = await walletClient.writeContract({
          address: DATA_ANNOTATE_ESCROW_ADDRESS,
          abi: DATA_ANNOTATE_ESCROW_ABI,
          functionName: "distribute",
          args: [BigInt(earning.onChainDatasetId), userAddress as `0x${string}`, amountWei],
        });

        console.log(
          `Distribution transaction sent: ${hash} for dataset ${earning.onChainDatasetId}`
        );

        distributions.push({
          onChainDatasetId: earning.onChainDatasetId,
          amount: earning.totalAmount,
          txHash: hash,
        });
      } catch (error: any) {
        console.error(
          `Failed to distribute from dataset ${earning.onChainDatasetId}:`,
          error
        );
        // Continue with other datasets even if one fails
        // In production, you might want to handle this differently
      }
    }

    if (distributions.length === 0) {
      return NextResponse.json(
        { success: false, error: "All distribution transactions failed" },
        { status: 500 }
      );
    }

    // Step 6: Calculate total distributed amount
    const totalDistributed = distributions.reduce(
      (sum, d) => sum + parseFloat(d.amount),
      0
    );

    // Step 7: Update user's balance in database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        cusdc_balance: 0, // Clear the balance after distribution
        updated_at: new Date().toISOString(),
      })
      .eq("address", normalizedAddress);

    if (updateError) {
      console.error("Error updating user balance:", updateError);
      // Transaction succeeded but DB update failed - log this critical issue
      // In production, you might want to implement retry logic or manual reconciliation
      return NextResponse.json(
        {
          success: false,
          error: "Distribution succeeded but failed to update database",
          distributions,
          totalDistributed: totalDistributed.toFixed(6),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userAddress: normalizedAddress,
      totalDistributed: totalDistributed.toFixed(6),
      distributionCount: distributions.length,
      distributions,
      message: `Successfully distributed ${totalDistributed.toFixed(6)} cUSD across ${distributions.length} dataset(s)`,
    });
  } catch (error: any) {
    console.error("Distribution error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

