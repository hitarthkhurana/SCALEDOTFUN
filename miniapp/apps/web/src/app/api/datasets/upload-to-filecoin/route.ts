import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';

/**
 * Upload completed dataset to Filecoin
 * 
 * This endpoint:
 * 1. Fetches all files + annotations for a dataset
 * 2. Uploads each file to Filecoin
 * 3. Creates JSON annotation files and uploads them
 * 4. Returns array of { filename, filecoin_cid, annotations_cid }
 * 
 * This runs in the BACKGROUND after dataset completion
 */
export async function POST(request: NextRequest) {
  try {
    const { datasetId } = await request.json();

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID required' }, { status: 400 });
    }

    console.log(`📦 Starting Filecoin upload for dataset ${datasetId}`);

    // Initialize Supabase
    const supabase = await createClient();

    // 1. Fetch all dataset entries
    const { data: datasetFiles, error: fetchError } = await supabase
      .from('datasets')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('active', true);

    if (fetchError) {
      console.error('Failed to fetch dataset:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });
    }

    if (!datasetFiles || datasetFiles.length === 0) {
      return NextResponse.json({ error: 'No files found in dataset' }, { status: 404 });
    }

    console.log(`📁 Found ${datasetFiles.length} files to upload`);

    // Check if all files are 100% complete
    const allComplete = datasetFiles.every(
      (file: any) => file.annotations >= file.minimum_annotations
    );

    if (!allComplete) {
      return NextResponse.json(
        { error: 'Dataset not fully annotated' },
        { status: 400 }
      );
    }

    // 2. Initialize Synapse SDK for Filecoin
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Filecoin private key not configured' },
        { status: 500 }
      );
    }

    const synapse = await Synapse.create({
      privateKey: privateKey,
      rpcURL: RPC_URLS.calibration.http,
    });

    // 3. Upload each file and its annotations to Filecoin
    const filecoinUploads = [];

    for (const file of datasetFiles) {
      try {
        console.log(`⬆️  Uploading: ${file.file_url}`);

        // Fetch the actual file content from Supabase Storage
        const response = await fetch(file.file_url);
        if (!response.ok) {
          console.error(`Failed to fetch file: ${file.file_url}`);
          continue;
        }

        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // Upload file to Filecoin
        const fileUploadStart = Date.now();
        const { pieceCid: fileCid } = await synapse.storage.upload(fileBytes);
        const fileUploadTime = Date.now() - fileUploadStart;

        console.log(`✅ File uploaded: ${fileCid} (${fileUploadTime}ms)`);

        // Fetch annotations for this file
        const { data: annotations } = await supabase
          .from('annotations')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('dataset_id', file.dataset_id); // Match specific dataset entry

        // Create JSON of annotations
        const annotationsJSON = JSON.stringify(annotations || [], null, 2);
        const annotationsBytes = new TextEncoder().encode(annotationsJSON);

        // Upload annotations to Filecoin
        const annotationsUploadStart = Date.now();
        const { pieceCid: annotationsCid } = await synapse.storage.upload(annotationsBytes);
        const annotationsUploadTime = Date.now() - annotationsUploadStart;

        console.log(`✅ Annotations uploaded: ${annotationsCid} (${annotationsUploadTime}ms)`);

        // Store result
        filecoinUploads.push({
          filename: file.file_url.split('/').pop(),
          file_cid: fileCid,
          annotations_cid: annotationsCid,
          file_type: file.file_type,
          task: file.task,
        });

      } catch (uploadError) {
        console.error(`Failed to upload file ${file.file_url}:`, uploadError);
        // Continue with other files
      }
    }

    console.log(`🎉 Upload complete! ${filecoinUploads.length}/${datasetFiles.length} files uploaded`);

    // 4. Update database to mark dataset as uploaded
    const { error: updateError } = await supabase
      .from('datasets')
      .update({
        // Store Filecoin CIDs as JSON string (for marketplace contract)
        filecoin_cid: JSON.stringify(filecoinUploads),
        updated_at: new Date().toISOString(),
      })
      .eq('dataset_id', datasetId);

    if (updateError) {
      console.error('Failed to update dataset with Filecoin CIDs:', updateError);
    }

    return NextResponse.json({
      success: true,
      datasetId,
      filesUploaded: filecoinUploads.length,
      filecoinCIDs: filecoinUploads,
    });

  } catch (error) {
    console.error('Filecoin upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

