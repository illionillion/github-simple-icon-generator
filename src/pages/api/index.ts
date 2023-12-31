import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import sharp from "sharp";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const username = req.query.username as string;
  const bgColor = req.query.bgColor as string;
  const size = sizeCheck(req.query.size as string);

  if (!username) {
    return res.status(400).json({ message: `400 Bad Request.` });
  }

  try {
    const github = await fetch(`https://api.github.com/users/${username}`);
    const json: any = await github.json();
    if (!Object.keys(json).includes("avatar_url")) {
      return res.status(400).json({ message: `400 Bad Request.` });
    }
    const icon = await fetch(json.avatar_url);
    const iconBuffer = await icon.arrayBuffer();

    // アイコン画像をリサイズ
    const resizedIconBuffer = await sharp(iconBuffer)
      .resize(size, size) // リサイズ
      .composite([
        {
          input: Buffer.from(
            `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${
              size / 2
            }" fill="white"/></svg>`
          ),
          top: 0,
          left: 0,
          blend: "dest-in", // マスキングを適用,
          limitInputPixels: false,
        },
      ])
      .png()
      .toBuffer();

    const buffer = await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: !!bgColor
          ? bgColor
          : { r: 255, g: 100, b: 100, alpha: 0.5 },
      },
    })
      .composite([
        {
          input: resizedIconBuffer, // リサイズしたアイコン画像を使う
          blend: "over",
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline;");
    res.status(200).send(buffer);
  } catch (error) {
    return res.status(400).json({ message: `400 Bad Request.`, error: error });
  }
}

const sizeCheck = (size: string): number => {
  if (isNaN(parseInt(size)) || parseInt(size) === 0) {
    return 100;
  } else if (parseInt(size) > 10000) {
    return 10000;
  }
  return parseInt(size);
};
