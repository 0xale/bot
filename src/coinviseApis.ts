import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

interface AirdropCondition {
  type: string;
  metadata: {
    targetFid: number;
    targetUsername: string;
  };
  required: boolean;
}
interface FarcasterTokenYapCondition {
  type: "FARCASTER_TOKEN_YAP";
  metadata: {
    tokenName: string;
    validFrom: string;
    validTo: string;
  };
  required: boolean;
}

interface TokenRegistrationData {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  tokenSupply: string;
  slope: string | null;
  slopeDecimals: string | null;
  type: string;
  description: string;
  imageUrl: string;
  lpLockerAddress: string;
}

interface yapAirdropData {
  txHash: string;
  txStatus: string;
  isGnosisSafeTx: boolean;
  tokenType: string;
  conditions: FarcasterTokenYapCondition[];
  token_addr: string;
  amount_per_recipient: number;
  number_of_recipients: number;
  description: string;
  expiry: string;
  minRequirementsCount: number;
  title: string;
  brandColor: string;
  isOpenEdition: boolean;
  rewards: any[];
  metadata: {
    coverImage: string;
  };
}

interface AirdropData {
  txHash: string;
  txStatus: string;
  isGnosisSafeTx: boolean;
  tokenType: string;
  conditions: AirdropCondition[];
  token_addr: string;
  amount_per_recipient: number;
  number_of_recipients: number;
  description: string;
  expiry: string;
  minRequirementsCount: number;
  title: string;
  brandColor: string;
  isOpenEdition: boolean;
  rewards: any[];
  metadata: {
    coverImage: string;
  };
}

export async function triggerFollowAirdrop(
  txHash: string,
  tokenAddress: string,
  tokenImage: string,
  tokenName: string
) {
  const data: AirdropData = {
    txHash,
    txStatus: "pending",
    isGnosisSafeTx: false,
    tokenType: "ERC20",
    conditions: [
      {
        type: "FARCASTER_FOLLOW",
        metadata: {
          targetFid: 372043,
          targetUsername: "coinvise",
        },
        required: true,
      },
      {
        type: "FARCASTER_FOLLOW",
        metadata: {
          targetFid: 881415,
          targetUsername: "earnkit",
        },
        required: true,
      },
    ],
    token_addr: tokenAddress,
    amount_per_recipient: 500000,
    number_of_recipients: 5000,
    description:
      "Follow @coinvise and @earnkit to be eligible to claim this airdrop.", // changes 2
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    minRequirementsCount: 1,
    title: `${tokenName} Airdrop`, // changes 1
    brandColor: "#ff0000",
    isOpenEdition: false,
    rewards: [],
    metadata: {
      coverImage: tokenImage,
    },
  };

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    // url: 'https://api.coinvise.co/airdrop?chain=84532',
    url: "https://api.coinvise.co/airdrop?chain=8453",

    headers: {
      "x-api-key": process.env.X_API_KEY_COINVISE,
      "X-Authenticated-User": process.env.X_AUTHENTICATED_USER,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  try {
    const response = await axios.request(config);
    console.log("Airdrop triggered successfully:", response.data);
    return response.data.slug;
  } catch (error) {
    console.error("Error triggering airdrop:", error);
  }
}

export async function triggerYapAirdrop(
  txHash: string,
  tokenAddress: string,
  tokenName: string,
  tokenImage: string
) {
  const data: yapAirdropData = {
    txHash,
    txStatus: "pending",
    isGnosisSafeTx: false,
    tokenType: "ERC20",
    conditions: [
      {
        type: "FARCASTER_TOKEN_YAP",
        metadata: {
          tokenName: tokenName,
          validFrom: new Date(Date.now()).toISOString(),
          validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        required: true,
      },
    ],
    token_addr: tokenAddress,
    amount_per_recipient: 50000,
    number_of_recipients: 5000,
    description:
      "Yap about this token on Warpcast to be eligible to claim this airdrop.",
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    minRequirementsCount: 1,
    title: `${tokenName} Airdrop`, // changes 1
    brandColor: "#ff0000",
    isOpenEdition: false,
    rewards: [],
    metadata: {
      coverImage: tokenImage,
    },
  };

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    // url: 'https://api.coinvise.co/airdrop?chain=84532',
    url: "https://api.coinvise.co/airdrop?chain=8453",

    headers: {
      "x-api-key": process.env.X_API_KEY_COINVISE,
      "X-Authenticated-User": process.env.X_AUTHENTICATED_USER,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  try {
    const response = await axios.request(config);
    console.log("Airdrop triggered successfully:", response.data);
    return response.data.slug;
  } catch (error) {
    console.error("Error triggering airdrop:", error);
  }
}
// export async function registerToken(
//   name: string,
//   address: string,
//   symbol: string,
//   decimals: number,
//   description: string,
//   tokenSupply: string,
//   imageUrl: string,
//   lpLockerAddress: string,
// ) {
//   const data: TokenRegistrationData = {
//     name,
//     address,
//     symbol,
//     decimals,
//     tokenSupply,
//     slope: null,
//     slopeDecimals: null,
//     type: 'ERC20',
//     description,
//     imageUrl,
//     lpLockerAddress,
//   };

//   const config = {
//     method: 'post',
//     maxBodyLength: Infinity,
//     // url: 'https://api.coinvise.co/token?chain=84532',
//     url: 'https://api.coinvise.co/token?chain=8453',

//     headers: {
//       'x-api-key': process.env.X_API_KEY_COINVISE,
//       'X-Authenticated-User': process.env.X_AUTHENTICATED_USER,
//       'Content-Type': 'application/json',
//     },
//     data: JSON.stringify(data),
//   };

//   try {
//     const response = await axios.request(config);
//     console.log('Token registered successfully:', response.data);
//   } catch (error) {
//     console.error('Error registering token:', error);
//   }
// }

export async function registerToken(data: TokenRegistrationData) {
  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.coinvise.co/token?chain=8453",
    headers: {
      "x-api-key": process.env.X_API_KEY_COINVISE,
      "X-Authenticated-User": process.env.X_AUTHENTICATED_USER,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  try {
    const response = await axios.request(config);
    console.log("Token registered successfully:", response.data);
    return response.data.slug;
  } catch (error) {
    console.error("Error registering token:", error);
  }
}

export async function triggerNeynarCast(text: string, frameLink: string) {
  const data = JSON.stringify({
    signer_uuid: process.env.NEYNR_SIGNER_UUID,
    text: text,
    embeds: [
      {
        url: frameLink, // Embed link
      },
    ],
  });

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.neynar.com/v2/farcaster/cast",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": process.env.NEYNR_API_KEY,
    },
    data: data,
  };

  try {
    const response = await axios.request(config);

    console.log("Neynar Cast API Response:", JSON.stringify(response.data));
    return response.data.cast.hash;
  } catch (error) {
    console.error("Error triggering Neynar Cast:", error);
  }
}
export async function replyNeynarCast(
  text: string,
  castHash: string,
  frameLink: string
) {
  const data = JSON.stringify({
    signer_uuid: process.env.NEYNR_SIGNER_UUID,
    text: text,
    embeds: [
      {
        url: frameLink, // Embed link
      },
    ],
    parent: castHash,
  });

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.neynar.com/v2/farcaster/cast",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": process.env.NEYNR_API_KEY,
    },
    data: data,
  };

  try {
    const response = await axios.request(config);
    console.log("Neynar Cast API Response:", JSON.stringify(response.data));
    return response.data.cast.hash;
  } catch (error) {
    console.error("Error triggering Neynar Cast:", error);
  }
}
