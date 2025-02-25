import { createCanvas, loadImage } from "canvas";
import { writeFileSync } from "fs";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import express from "express";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

import { ethers } from "ethers";
import EarnkitABI from "./Earnkit.json" assert { type: "json" };
import EarnkitToken from "./EarnkitToken.json" assert { type: "json" };
// import uploadToCloudinary from "./cloudinearyHook";
import {
  triggerFollowAirdrop,
  triggerYapAirdrop,
  registerToken,
  replyNeynarCast,
} from "./coinviseApis.js";
import axios from "axios";
const PROVIDER_URL = process.env.MAINNET_PROVIDER_URL;
const PRIVATE_KEY = process.env.TOKEN_BOT_PRIVATE_KEY;
const EARNKIT_CONTRACT = "0xDF29E0CE7fE906065608fef642dA4Dc4169f924b";
const WETH = "0x4200000000000000000000000000000000000006";
const FEE = 10000;
const TICK = -230400;

interface PoolConfig {
  pairedToken: string;
  devBuyFee: number;
  tick: number;
}
interface Campaign {
  maxClaims: number;
  amountPerClaim: bigint;
  maxSponsoredClaims: number;
}

function getCreationCode(): string {
  if (!EarnkitToken || !EarnkitToken.bytecode) {
    throw new Error(`Bytecode not found in EarnkitToken.json`);
  }

  return typeof EarnkitToken.bytecode === "string"
    ? EarnkitToken.bytecode
    : EarnkitToken.bytecode.object;
}
cloudinary.config({
  cloud_name: "dcbgnwitt",
  api_key: "798182692117724",
  api_secret: "20VleMPq8RQcI1Po67a1vYlIlrc",
});

// Function to upload image to Cloudinary
export default async function uploadToCloudinary(imagePath: string) {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "Casts",
    });
    console.log("Image uploaded to Cloudinary:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
}

function generateTickerFromHash(hash: string): string {
  // Create a hash-based buffer
  const hashBuffer = crypto.createHash("sha256").update(hash).digest("hex");

  // Extract letters only and take the first 4 characters
  const lettersOnly = hashBuffer
    .replace(/\d/g, "")
    .substring(0, 4)
    .toUpperCase();

  return lettersOnly;
}

async function generateSaltForAddress(
  name: string,
  symbol: string,
  totalSupply: bigint,
  fid: number,
  image: string,
  castHash: string,
  poolConfig: PoolConfig,
  deployer: string,
  earnkitContract: string
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber - 1);

  // Initialize saltNum with block hash
  if (!block || !block.hash) {
    throw new Error("Block or block hash is null");
  }
  let saltNum = BigInt(block.hash);
  const EarnkitTokenBytecode = getCreationCode();

  while (true) {
    try {
      const saltBytes = ethers.zeroPadValue(ethers.toBeHex(saltNum), 32);

      // Encode constructor parameters
      const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
        [
          "string",
          "string",
          "uint256",
          "address",
          "uint256",
          "string",
          "string",
        ],
        [name, symbol, totalSupply, deployer, fid, image, castHash]
      );

      // Combine creation code and constructor args
      const bytecode = ethers.solidityPacked(
        ["bytes", "bytes"],
        [EarnkitTokenBytecode, constructorArgs]
      );

      // Calculate the hash of the bytecode
      const bytecodeHash = ethers.keccak256(bytecode);

      // Calculate salt hash using the correct format
      const saltHash = ethers.keccak256(
        ethers.concat([ethers.zeroPadValue(deployer, 32), saltBytes])
      );

      // Compute the predicted address
      const predictedAddress = ethers.getCreate2Address(
        earnkitContract,
        saltHash,
        bytecodeHash
      );

      // Convert addresses to checksummed format for comparison
      const predictedAddressChecksummed = ethers.getAddress(predictedAddress);
      const pairedTokenChecksummed = ethers.getAddress(poolConfig.pairedToken);

      // console.log("Trying salt:", saltBytes);
      // console.log("Predicted address:", predictedAddressChecksummed);
      // console.log("Paired token:", pairedTokenChecksummed);

      // Compare addresses lexicographically
      if (
        predictedAddressChecksummed.toLowerCase() <
        pairedTokenChecksummed.toLowerCase()
      ) {
        console.log("Found valid salt:", saltBytes);
        return saltBytes;
      }

      saltNum++;
    } catch (error) {
      console.error("Error in salt generation:", error);
      saltNum++;
    }
  }
}

const API_KEY = "3CE9750C-631C-400A-BC5D-DBADBFA791A5";

const eventQueue: any[] = [];

const app = express();
app.use(bodyParser.json());
const PORT = 3002;

interface EventData {
  text: string;
  [key: string]: any;
}

interface WebhookEvent {
  data: EventData;
}
app.post("/", async (req, res) => {
  try {
    const event: WebhookEvent = req.body;
    console.log("Received event:", event);
    eventQueue.push(event);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

async function processQueue() {
  while (true) {
    if (eventQueue.length > 0) {
      const event = eventQueue.shift();
      if (event) {
        console.log("Processing event:", event);
        await handleEvent(event);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Keeps processing events continuously
  }
}

async function handleEvent(event: WebhookEvent) {
  const hookData = event;
  if (
    hookData.data.text.includes("tokenize") ||
    hookData.data.text.includes("tokenise")
  ) {
    // Extract cast data
    const authorUsername = hookData.data.author.username || "unknown";
    const displayName = hookData.data.author.display_name || "User";
    const profilePic =
      hookData.data.author.pfp_url || "https://via.placeholder.com/80";
    const castText = hookData.data.text || "No text provided";
    const parentHash = hookData.data.parent_hash;
    const firstCastHash = hookData.data.hash;

    let finalText = castText;

    // If there's a parent hash, fetch the original cast
    if (parentHash) {
      try {
        const url = `https://api.neynar.com/v2/farcaster/cast?identifier=${parentHash}&type=hash`;
        const options = {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-api-key": API_KEY,
          },
        };

        const response = await fetch(url, options);
        const json = await response.json();
        if (json.cast && json.cast.text) {
          finalText = json.cast.text;
          console.log("Fetched Original Cast Text:", finalText);
        }
      } catch (err) {
        console.error("Error fetching original cast:", err);
      }
    }

    // Prepare data for image generation
    const castData = {
      username: authorUsername,
      displayName,
      profilePic,
      text: finalText,
      timestamp: new Date().toISOString(),
    };

    // Generate image
    const generateImage = await generateTweetImage(castData);
    console.log("Image generated:", generateImage);

    const username = event.data.author.username;
    const hash = event.data.hash;

    const ticker = generateTickerFromHash(hash);
    const tokenName = `cast by @${username}_${ticker}`;

    const tokenSymbol = ticker;
    const description = finalText;
    console.log("Token Name:", tokenName);
    console.log("Token Symbol:", tokenSymbol);
    console.log("Description:", description);
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    if (!PRIVATE_KEY) {
      throw new Error("Private key is not defined");
    }
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const earnkit = new ethers.Contract(
      EARNKIT_CONTRACT,
      EarnkitABI.abi,
      wallet
    );

    const totalSupply = ethers.parseUnits("100000000000", 18);
    const fid = 710451;
    const castHash = "710451"; // Replace with actual cast hash if available

    const poolConfig: PoolConfig = {
      pairedToken: WETH,
      devBuyFee: FEE,
      tick: TICK,
    };

    const salt = await generateSaltForAddress(
      tokenName,
      tokenSymbol,
      totalSupply,
      fid,
      generateImage,
      castHash,
      poolConfig,
      wallet.address,
      EARNKIT_CONTRACT
    );
    const campaigns: Campaign[] = [
      {
        maxClaims: 5000,
        amountPerClaim: ethers.parseUnits("500000", 18),
        maxSponsoredClaims: 0,
      },
      {
        maxClaims: 5000,
        amountPerClaim: ethers.parseUnits("500000", 18),
        maxSponsoredClaims: 0,
      },
    ];

    const tx = await earnkit.deployTokenWithCampaigns(
      tokenName,
      tokenSymbol,
      totalSupply,
      FEE,
      salt,
      wallet.address,
      fid,
      generateImage,
      castHash,
      poolConfig,
      campaigns,
      5
    );

    console.log(
      `Transaction sent for ${tokenName}. Waiting for confirmation...`
    );
    const receipt = await tx.wait();
    console.log(
      `${tokenName} deployed successfully. Transaction Hash:`,
      receipt.hash
    );
    const tokenAddress = receipt.logs[0]?.address;
    console.log("Token deployed at:", tokenAddress);

    const filteredLogs = receipt.logs.filter(
      (log: { topics: string[] }) =>
        log.topics[0] ===
        "0xfc5b9d1c2c1134048e1792e3ae27d4eee04f460d341711c7088000d2ca218621"
    );

    if (filteredLogs.length === 0) {
      console.log("No logs found with the specified topic.");

      return;
    }
    const campaignIds = filteredLogs.map((log: { topics: string[] }) =>
      parseInt(log.topics[2], 16)
    );

    if (campaignIds.length < 2) {
      console.error("Insufficient campaign IDs found");

      return;
    }
    const filteredLog: any = receipt.logs.find(
      (log: { address: string }) =>
        log.address.toLowerCase() === EARNKIT_CONTRACT.toLowerCase()
    );
    const positionId = BigInt(filteredLog.topics[2]).toString();
    console.log("Position ID:-------------", positionId);

    const followCampaignId = campaignIds[1];
    const yapCampaignId = campaignIds[0];

    console.log(`Follow Campaign ID: ${followCampaignId}`);
    console.log(`Yap Campaign ID: ${yapCampaignId}`);

    await registerToken({
      name: tokenName,
      address: tokenAddress,
      symbol: tokenSymbol,
      decimals: 18,
      tokenSupply: "100000000000",
      slope: "null",
      slopeDecimals: "null",
      type: "ERC20",
      description: description ?? `${tokenName} on Coinvise`,
      imageUrl: generateImage,
      lpLockerAddress: positionId,
    });

    const followSlug = await triggerFollowAirdrop(
      receipt.hash,
      tokenAddress,
      generateImage,
      tokenName
    );
    console.log(followSlug);

    const yapSlug = await triggerYapAirdrop(
      receipt.hash,
      tokenAddress,
      tokenName,
      generateImage
    );
    console.log(yapSlug);

    const message = `🚨 Your cast is now tokenized we deployed the token: ${tokenName}.
      \n\nToken address: https://basescan.org/address/${tokenAddress}\n\nView on Coinvise:https://coinvise.ai/token/${tokenAddress}\n\n${tokenName} airdrops are now claimable below in this thread!`;

    const tokenFrame = `https://frames.coinvise.ai/token/${tokenAddress}`;

    const tokenCastHash = await replyNeynarCast(
      message,
      firstCastHash,
      tokenFrame
    );

    const yapCampaignMsg = `🪂 Airdrop #1: Yap about ${tokenName} to be eligible to claim.`;

    const yapLink = `https://frames.coinvise.ai/claim/${yapCampaignId}/${yapSlug}`;

    const yapCastHash = await replyNeynarCast(
      yapCampaignMsg,
      tokenCastHash,
      yapLink
    );

    const followCampaignMsg = `🪂 Airdrop #2: Follow and recast the main post in this thread to be eligible to claim.`;
    const followLink = `https://frames.coinvise.ai/claim/${followCampaignId}/${followSlug}`;

    const followCastHash = await replyNeynarCast(
      followCampaignMsg,
      yapCastHash,
      followLink
    );

    console.log("All casts done:", followCastHash);

    console.log("Webhook received! Image generated.");
    return;
  }
}

processQueue();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function generateTweetImage(data: {
  username: any;
  displayName: any;
  profilePic: any;
  text: any;
  timestamp: any;
}) {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Load profile picture
  const profileImage = await loadImage(data.profilePic);
  ctx.drawImage(profileImage, 20, 20, 80, 80);

  // Display name
  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Arial";
  ctx.fillText(data.displayName, 120, 50);

  // Username
  ctx.fillStyle = "#555";
  ctx.font = "18px Arial";
  ctx.fillText(`@${data.username}`, 120, 80);

  // Text
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  wrapText(ctx, data.text, 20, 140, width - 40, 28);

  // Timestamp
  ctx.fillStyle = "#777";
  ctx.font = "16px Arial";
  ctx.fillText(new Date(data.timestamp).toLocaleString(), 20, height - 20);

  // Save Image
  const imagePath = "Cast.png";
  const buffer = canvas.toBuffer("image/png");
  writeFileSync(imagePath, new Uint8Array(buffer));
  console.log("Image saved as tweet.png");
  // Upload to Cloudinary
  const imageUrl = await uploadToCloudinary(imagePath);
  return imageUrl; // Return the Cloudinary URL
}

// Function to wrap text
function wrapText(
  ctx: import("canvas").CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + " ";
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
