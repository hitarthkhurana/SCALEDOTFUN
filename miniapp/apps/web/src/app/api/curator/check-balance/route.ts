import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface DatasetEarnings {
  onChainDatasetId: number;
  totalAmount: string;
  annotationCount: number;
}

/**
 * GET /api/curator/check-balance?userAddress=0x...
 * 
 * Checks the pending balance for a user without executing any transactions.
 * Useful for displaying how much a user can withdraw.
 * 
 * Query Params:
 *   - userAddress: The address of the user to check balance for
 * 
 * Returns:
 *   - currentDbBalance: The user's cusdc_balance in the database
 *   - calculatedEarnings: Total calculated from annotations
 *   - datasetBreakdown: Earnings broken down by on-chain dataset ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress");

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 }
      );
    }

    // Normalize address
    const normalizedAddress = userAddress.toLowerCase();

    // Initialize Supabase
    const supabase = await createClient();

    // Get user's current balance from DB
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("cusdc_balance, total_earnings")
      .eq("address", normalizedAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(user.cusdc_balance?.toString() || "0");
    const totalEarnings = parseFloat(user.total_earnings?.toString() || "0");

    // Get all annotations by this user
    const { data: annotations, error: annotationsError } = await supabase
      .from("annotations")
      .select(`
        annotation_id,
        dataset_id,
        created_at,
        datasets!inner (
          on_chain_dataset_id,
          cusdc_payout_per_annotation,
          active,
          task
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
      return NextResponse.json({
        success: true,
        userAddress: normalizedAddress,
        currentDbBalance: currentBalance.toFixed(6),
        totalLifetimeEarnings: totalEarnings.toFixed(6),
        calculatedEarnings: "0.000000",
        totalAnnotations: 0,
        datasetBreakdown: [],
        message: "No annotations found for this user",
      });
    }

    // Group annotations by on_chain_dataset_id and calculate total per dataset
    const datasetEarningsMap = new Map<number, DatasetEarnings & { task: string }>();

    for (const annotation of annotations) {
      const dataset = (annotation as any).datasets;
      const onChainId = dataset.on_chain_dataset_id;
      const payout = parseFloat(dataset.cusdc_payout_per_annotation?.toString() || "0");
      const task = dataset.task || "Unknown task";

      if (!onChainId || payout <= 0) continue;

      if (!datasetEarningsMap.has(onChainId)) {
        datasetEarningsMap.set(onChainId, {
          onChainDatasetId: onChainId,
          totalAmount: payout.toString(),
          annotationCount: 1,
          task,
        });
      } else {
        const existing = datasetEarningsMap.get(onChainId)!;
        const newTotal = parseFloat(existing.totalAmount) + payout;
        existing.totalAmount = newTotal.toString();
        existing.annotationCount += 1;
      }
    }

    const datasetBreakdown = Array.from(datasetEarningsMap.values());
    const calculatedEarnings = datasetBreakdown.reduce(
      (sum, d) => sum + parseFloat(d.totalAmount),
      0
    );

    return NextResponse.json({
      success: true,
      userAddress: normalizedAddress,
      currentDbBalance: currentBalance.toFixed(6),
      totalLifetimeEarnings: totalEarnings.toFixed(6),
      calculatedEarnings: calculatedEarnings.toFixed(6),
      totalAnnotations: annotations.length,
      datasetBreakdown: datasetBreakdown.map((d) => ({
        onChainDatasetId: d.onChainDatasetId,
        task: d.task,
        annotationCount: d.annotationCount,
        totalAmount: parseFloat(d.totalAmount).toFixed(6),
      })),
      balanceMatch: Math.abs(calculatedEarnings - currentBalance) < 0.000001,
      message: `User has ${annotations.length} annotation(s) totaling ${calculatedEarnings.toFixed(6)} cUSD`,
    });
  } catch (error: any) {
    console.error("Check balance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

