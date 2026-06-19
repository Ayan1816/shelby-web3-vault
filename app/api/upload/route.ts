import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pinataJwt = process.env.PINATA_JWT; 

    if (!pinataJwt) {
      return NextResponse.json({ error: "Server missing Pinata JWT" }, { status: 500 });
    }

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    });

    if (!res.ok) throw new Error("Pinata upload failed");
    
    const data = await res.json();
    return NextResponse.json({ IpfsHash: data.IpfsHash });
    
  } catch (error) {
    console.error("Backend Upload Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
